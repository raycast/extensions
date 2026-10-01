import {
  List,
  ActionPanel,
  Action,
  Icon,
  showToast,
  Toast,
  Clipboard,
  Color,
  getPreferenceValues,
  Keyboard,
} from "@raycast/api";
import { useState, useEffect, useMemo, useRef } from "react";
import { listVaultsAndItems, getTotp } from "./lib/pass-cli";
import { PassCliError, PassCliErrorType } from "./lib/types";
import { getItemIcon, getTotpRemainingSeconds, formatTotpCode } from "./lib/utils";
import { getCachedItems, setCachedItems } from "./lib/cache";
import { renderErrorView } from "./lib/error-views";
import { createRequestTracker, createSerialQueue, failedVaultsTitle, getRefreshResult } from "./lib/refresh";
import { applyRefreshedCodes, TotpItem } from "./lib/totp-codes";

function getTotpTimeStep(): number {
  return Math.floor(Date.now() / 30_000);
}

/** Codes asked for in an earlier step may have expired, e.g. when a step boundary passed during a load. */
function hasOutdatedCode(items: TotpItem[]): boolean {
  return items.some((item) => item.currentTotp && item.codeStep !== getTotpTimeStep());
}

/** The item with its current code. If that fails, an earlier code is kept only while it's still valid. */
async function withCurrentCode(item: TotpItem): Promise<TotpItem> {
  // Taken before asking: a code that arrives after a step boundary may belong to the earlier step.
  const step = getTotpTimeStep();
  try {
    const totp = await getTotp(item.shareId, item.itemId);
    return { ...item, currentTotp: totp, codeStep: step };
  } catch {
    // An expired code must neither be shown nor copied.
    return item.codeStep === getTotpTimeStep() ? item : { ...item, currentTotp: undefined, codeStep: undefined };
  }
}

export default function Command() {
  const preferences = getPreferenceValues();
  const [items, setItems] = useState<TotpItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState(getTotpRemainingSeconds());
  const [error, setError] = useState<PassCliErrorType | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const itemsRef = useRef<TotpItem[]>([]);
  const currentTimeStepRef = useRef<number>(getTotpTimeStep());
  const isRefreshingRef = useRef(false);
  // A slower, older load must not overwrite a newer one (e.g. Retry during a load).
  const loads = useMemo(createRequestTracker, []);
  const cacheWrites = useMemo(createSerialQueue, []);

  useEffect(() => {
    loadTotpItems();

    intervalRef.current = setInterval(() => {
      const now = Math.floor(Date.now() / 1000);
      setRemainingSeconds(30 - (now % 30));

      const nextTimeStep = getTotpTimeStep();
      if (nextTimeStep !== currentTimeStepRef.current) {
        currentTimeStepRef.current = nextTimeStep;
        refreshTotpCodes();
      }
    }, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  async function loadTotpItems() {
    const isLatest = loads.start();
    setError(null);
    setIsLoading(true);

    // The cache is only shown while nothing else is: Retry keeps the codes on screen.
    const cachedItems = itemsRef.current.length > 0 ? undefined : (await getCachedItems())?.data;
    if (!isLatest()) return;
    if (cachedItems) {
      const cachedTotpItems = cachedItems.filter((item) => item.hasTotp);
      if (cachedTotpItems.length > 0) {
        const itemsWithPlaceholder = cachedTotpItems.map((item) => ({
          ...item,
          currentTotp: undefined,
        }));
        setItems(itemsWithPlaceholder);
        itemsRef.current = itemsWithPlaceholder;
        setIsLoading(false);

        const itemsWithTotp = await Promise.all(cachedTotpItems.map(withCurrentCode));
        if (!isLatest()) return;
        setItems(itemsWithTotp);
        itemsRef.current = itemsWithTotp;
      }
    }

    try {
      const { items: freshItems, failedVaults } = await listVaultsAndItems();
      if (!isLatest()) return;
      // Vaults that failed to load keep the items on screen (or cached ones before anything was shown),
      // and a partial listing doesn't renew the cache.
      const knownItems: TotpItem[] = itemsRef.current.length > 0 ? itemsRef.current : (cachedItems ?? []);
      const {
        items: nextItems,
        isComplete,
        failureMessage,
      } = getRefreshResult(freshItems, knownItems, failedVaults, (item) => item.hasTotp);
      // Fresh items only: codes on screen must never reach the cache. Writes run in request order and only
      // for the latest load, so an older load can't overwrite a newer one.
      if (isComplete) {
        await cacheWrites.run(async () => {
          if (isLatest()) await setCachedItems(freshItems);
        });
      }
      if (failureMessage) throw new Error(failureMessage);

      const totpItems: TotpItem[] = nextItems.filter((item) => item.hasTotp);
      const itemsWithTotp = await Promise.all(totpItems.map(withCurrentCode));

      if (!isLatest()) return;
      setItems(itemsWithTotp);
      itemsRef.current = itemsWithTotp;
      if (hasOutdatedCode(itemsWithTotp)) void refreshTotpCodes();
      if (failedVaults.length > 0) {
        await showToast({
          style: Toast.Style.Failure,
          title: failedVaultsTitle(failedVaults.map(({ vault }) => vault.name)),
          message: failedVaults[0].message,
          primaryAction: { title: "Retry", onAction: () => void loadTotpItems() },
        });
      }
    } catch (e: unknown) {
      if (!isLatest()) return;
      if (itemsRef.current.length === 0 || (e instanceof PassCliError && e.type === "not_authenticated")) {
        if (e instanceof PassCliError) {
          setError(e.type);
        } else {
          setError("unknown");
        }
      } else {
        // The codes on screen stay, but they may be incomplete.
        await showToast({
          style: Toast.Style.Failure,
          title: "Couldn't Load 2FA Codes",
          message: e instanceof Error ? e.message.split("\n")[0] : String(e),
          primaryAction: { title: "Retry", onAction: () => void loadTotpItems() },
        });
      }
    } finally {
      if (isLatest()) setIsLoading(false);
    }
  }

  async function refreshTotpCodes() {
    if (isRefreshingRef.current) return;

    isRefreshingRef.current = true;
    setIsRefreshing(true);
    try {
      const refreshed = await Promise.all(itemsRef.current.map(withCurrentCode));
      // A load may have replaced the list meanwhile: only the codes of the items shown now are updated.
      const updatedItems = applyRefreshedCodes(itemsRef.current, refreshed, getTotpTimeStep());
      setItems(updatedItems);
      itemsRef.current = updatedItems;
    } finally {
      isRefreshingRef.current = false;
      setIsRefreshing(false);
    }
  }

  const errorView = renderErrorView(error, loadTotpItems, "Load TOTP Items");
  if (errorView) return errorView;

  async function copyTotp(item: TotpItem) {
    try {
      // A code asked for in an earlier step may have expired: copy a fresh one instead.
      const totp =
        item.currentTotp && item.codeStep === getTotpTimeStep()
          ? item.currentTotp
          : await getTotp(item.shareId, item.itemId);
      await Clipboard.copy(totp, { concealed: preferences.copyPasswordTransient ?? true });
      showToast({ style: Toast.Style.Success, title: "TOTP Copied", message: item.title });
    } catch (error: unknown) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to Copy TOTP",
        message: error instanceof Error ? error.message.split("\n")[0] : String(error),
      });
    }
  }

  function getTimerColor(): Color {
    if (remainingSeconds > 10) return Color.Green;
    if (remainingSeconds > 5) return Color.Yellow;
    return Color.Red;
  }

  return (
    <List isLoading={isLoading || isRefreshing} searchBarPlaceholder="Search TOTP items...">
      <List.Section title="TOTP Codes" subtitle={isRefreshing ? "Refreshing..." : `Refreshing in ${remainingSeconds}s`}>
        {items.map((item) => (
          <List.Item
            key={`${item.shareId}-${item.itemId}`}
            icon={getItemIcon(item.type)}
            title={item.title}
            subtitle={item.vaultName}
            accessories={[
              {
                tag: {
                  value: item.currentTotp ? formatTotpCode(item.currentTotp) : "---",
                  color: getTimerColor(),
                },
              },
              { text: `${remainingSeconds}s`, icon: Icon.Clock },
            ]}
            actions={
              <ActionPanel>
                {item.currentTotp && (
                  <Action title="Copy TOTP Code" icon={Icon.Clipboard} onAction={() => copyTotp(item)} />
                )}
                <Action
                  title="Refresh Codes"
                  icon={Icon.ArrowClockwise}
                  shortcut={Keyboard.Shortcut.Common.Refresh}
                  onAction={refreshTotpCodes}
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
      {items.length === 0 && !isLoading && !error && (
        <List.EmptyView icon={Icon.Clock} title="No TOTP Items" description="None of your items have TOTP configured" />
      )}
    </List>
  );
}
