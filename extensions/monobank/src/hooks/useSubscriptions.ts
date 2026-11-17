import { Toast, showToast } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { refreshMenuBar } from "../services/menuBar";
import { getHistoryCutoff } from "../services/statement";
import {
  SubscriptionOverridePatch,
  readSubscriptionOverrides,
  restorePriceChange,
  syncSubscriptionOverrideIds,
  updateSubscriptionOverride,
} from "../services/subscriptions";
import { Account, Period, Subscription, SubscriptionOverrides } from "../types";
import {
  applySubscriptionOverrides,
  detectSubscriptions,
  endOfDay,
  getRejectedPriceChanges,
  getSubscriptionTitle,
} from "../utils";
import { useAccountStatements } from "./useAccountStatements";

/** Every `useSubscriptionOverrides` in the command reloads after any of them writes. */
const listeners = new Set<() => void>();

function notifyChange() {
  listeners.forEach((listener) => listener());
}

const noOverrides: SubscriptionOverrides = {};

/** The user's renamed and hidden subscriptions. Writes go through storage, then every hook reads it again. */
export function useSubscriptionOverrides() {
  const { data, isLoading, revalidate } = usePromise(readSubscriptionOverrides, [], {
    failureToastOptions: { title: "Failed to load subscription changes" },
  });
  const latestRevalidate = useRef(revalidate);
  latestRevalidate.current = revalidate;

  useEffect(() => {
    const listener = () => {
      latestRevalidate.current();
    };
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  const update = useCallback(async (subscription: Subscription, patch: SubscriptionOverridePatch) => {
    await updateSubscriptionOverride(subscription, patch);
    notifyChange();
    await refreshMenuBar("subscriptions-menu-bar");
  }, []);

  const restore = useCallback(async (chargeId: string) => {
    await restorePriceChange(chargeId);
    notifyChange();
    await refreshMenuBar("subscriptions-menu-bar");
  }, []);

  return { overrides: data ?? noOverrides, isLoading, update, restorePriceChange: restore };
}

/**
 * Subscriptions found in the stored history of `accounts`, with the user's corrections. Reads storage only, so it
 * makes no statement requests; it reads again whenever a statement is stored. `undefined` accounts load nothing.
 */
export function useSubscriptions(accounts: Account[] | undefined, now: Date) {
  const historyPeriod = useMemo(
    (): Period => ({ from: getHistoryCutoff(now.getTime()), to: Math.floor(endOfDay(now).getTime() / 1000) }),
    [now],
  );
  // Without `sync`: the history is loaded by "Sync Statements" and the other commands, so opening this makes no
  // requests.
  const history = useAccountStatements(accounts, historyPeriod, { label: "subscriptions" });
  const { overrides, isLoading: isLoadingOverrides, update, restorePriceChange } = useSubscriptionOverrides();

  const subscriptions = useMemo(
    () =>
      applySubscriptionOverrides(
        detectSubscriptions(history.groups, now, { rejectedPriceChanges: getRejectedPriceChanges(overrides) }),
        overrides,
      ),
    [history.groups, now, overrides],
  );

  // Saves each override's current charges, so it keeps following its subscription. Writes only when they changed,
  // so the reload that follows doesn't write again.
  const isLoading = history.isLoading || isLoadingOverrides;
  useEffect(() => {
    if (isLoading) return;
    syncSubscriptionOverrideIds(subscriptions).then((isChanged) => {
      if (isChanged) notifyChange();
    }, console.error);
  }, [isLoading, subscriptions]);

  const setHidden = useCallback(
    async (subscription: Subscription, isHidden: boolean) => {
      await update(subscription, { hidden: isHidden });
      if (!isHidden) {
        await showToast(Toast.Style.Success, "Unhidden");
        return;
      }
      await showToast({
        style: Toast.Style.Success,
        title: "Hidden",
        message: `${getSubscriptionTitle(subscription)} isn't shown as a subscription`,
        primaryAction: {
          title: "Undo",
          onAction: async (toast) => {
            await update(subscription, { hidden: false });
            await toast.hide();
          },
        },
      });
    },
    [update],
  );

  return {
    subscriptions,
    history,
    overrides,
    isLoading,
    update,
    restorePriceChange,
    setHidden,
  };
}
