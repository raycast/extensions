import { Toast, showToast } from "@raycast/api";
import { useCallback, useEffect, useMemo, useState } from "react";
import { refreshMenuBar } from "../services/menuBar";
import { getHistoryCutoff } from "../services/statement";
import {
  SubscriptionOverridePatch,
  readSubscriptionOverrides,
  restorePriceChange,
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

/** The user's renamed and hidden subscriptions. Writes go through storage, then every hook reads it again. */
export function useSubscriptionOverrides() {
  const [overrides, setOverrides] = useState<SubscriptionOverrides>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isCancelled = false;

    function load() {
      readSubscriptionOverrides()
        .then((overrides) => {
          if (!isCancelled) setOverrides(overrides);
        })
        .catch(console.error)
        .finally(() => {
          if (!isCancelled) setIsLoading(false);
        });
    }

    load();
    listeners.add(load);
    return () => {
      isCancelled = true;
      listeners.delete(load);
    };
  }, []);

  const update = useCallback(async (key: string, patch: SubscriptionOverridePatch) => {
    await updateSubscriptionOverride(key, patch);
    listeners.forEach((listener) => listener());
    await refreshMenuBar("subscriptions-menu-bar");
  }, []);

  const restore = useCallback(async (chargeId: string) => {
    await restorePriceChange(chargeId);
    listeners.forEach((listener) => listener());
    await refreshMenuBar("subscriptions-menu-bar");
  }, []);

  return { overrides, isLoading, update, restorePriceChange: restore };
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
  // Its `refresh` would request the whole history, longer than monobank allows.
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

  const setHidden = useCallback(
    async (subscription: Subscription, isHidden: boolean) => {
      const { key } = subscription;
      await update(key, { hidden: isHidden });
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
            await update(key, { hidden: false });
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
    isLoading: history.isLoading || isLoadingOverrides,
    update,
    restorePriceChange,
    setHidden,
  };
}
