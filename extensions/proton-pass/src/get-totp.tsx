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
import { useState, useEffect, useRef, useMemo } from "react";
import { listVaultsAndItems, getTotp } from "./lib/pass-cli";
import { Item, PassCliError, PassCliErrorType } from "./lib/types";
import { getItemIcon, getTotpRemainingSeconds, formatTotpCode } from "./lib/utils";
import { clearCache, getCachedItems, setCachedItems } from "./lib/cache";
import { renderErrorView } from "./lib/error-views";
import { createRequestTracker, createSerialQueue, failedVaultsTitle, getRefreshResult } from "./lib/refresh";

interface TotpItem extends Item {
  currentTotp?: string;
  currentTotpTimeStep?: number;
}

function getTotpTimeStep(): number {
  return Math.floor(Date.now() / 30_000);
}

function currentCode(item: TotpItem): string | undefined {
  return item.currentTotpTimeStep === getTotpTimeStep() ? item.currentTotp : undefined;
}

async function loadCode(item: TotpItem): Promise<TotpItem> {
  const timeStep = getTotpTimeStep();
  try {
    const code = await getTotp(item.shareId, item.itemId);
    return { ...item, currentTotp: timeStep === getTotpTimeStep() ? code : undefined, currentTotpTimeStep: timeStep };
  } catch (error) {
    if (error instanceof PassCliError && error.type === "not_authenticated") throw error;
    return { ...item, currentTotp: currentCode(item) };
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
  const hasLoadedFromCache = useRef(false);
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

    try {
      const cachedItems = !hasLoadedFromCache.current ? (await getCachedItems())?.data : undefined;
      if (!isLatest()) return;
      hasLoadedFromCache.current = true;
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

          const itemsWithTotp = await Promise.all(cachedTotpItems.map(loadCode));
          if (!isLatest()) return;
          setItems(itemsWithTotp);
          itemsRef.current = itemsWithTotp;
        }
      }

      const { items: freshItems, failedVaults } = await listVaultsAndItems();
      if (!isLatest()) return;

      const {
        items: nextItems,
        isComplete,
        failureMessage,
      } = getRefreshResult(freshItems, itemsRef.current, failedVaults, (item) => item.hasTotp);
      const totpItems: TotpItem[] = nextItems.filter((item) => item.hasTotp);
      const codeTimeStep = getTotpTimeStep();
      const itemsWithTotp = await Promise.all(totpItems.map(loadCode));
      if (!isLatest()) return;
      // Serialize complete cache writes so an older in-flight write cannot outlast a newer one.
      if (isComplete) {
        await cacheWrites.run(async () => {
          if (isLatest()) await setCachedItems(freshItems, true);
        });
      }
      if (!isLatest()) return;

      setItems(itemsWithTotp);
      itemsRef.current = itemsWithTotp;
      if (codeTimeStep !== getTotpTimeStep()) refreshTotpCodes();
      if (failureMessage) throw new Error(failureMessage);
      if (failedVaults.length > 0) {
        await showToast({
          style: Toast.Style.Failure,
          title: failedVaultsTitle(failedVaults.map(({ vault }) => vault.name)),
          message: failedVaults[0].message,
          primaryAction: { title: "Retry", onAction: loadTotpItems },
        });
      }
    } catch (e: unknown) {
      if (!isLatest()) return;
      if (e instanceof PassCliError && e.type === "not_authenticated") {
        await resetSession();
      } else if (itemsRef.current.length === 0 || (e instanceof PassCliError && e.type === "not_installed")) {
        // Without pass-cli, no code can load: the screen saying how to fix it comes first.
        if (e instanceof PassCliError) {
          setError(e.type);
        } else {
          setError("unknown");
        }
      } else {
        await showToast({
          style: Toast.Style.Failure,
          title: "Couldn't Load TOTP Items",
          message: e instanceof Error ? e.message : "Unknown error",
          primaryAction: { title: "Retry", onAction: loadTotpItems },
        });
      }
    } finally {
      if (isLatest()) setIsLoading(false);
    }
  }

  async function resetSession() {
    loads.start(); // Invalidate pending listings and queued cache writes from the ended session.
    itemsRef.current = [];
    setItems([]);
    setError("not_authenticated");
    setIsLoading(false);
    await cacheWrites.run(clearCache);
  }

  async function refreshTotpCodes() {
    if (isRefreshingRef.current) return;

    isRefreshingRef.current = true;
    setIsRefreshing(true);
    try {
      let retriedTimeStep = false;
      while (true) {
        const currentItems = itemsRef.current;
        const codeTimeStep = getTotpTimeStep();
        let updatedItems: TotpItem[];
        try {
          updatedItems = await Promise.all(currentItems.map(loadCode));
        } catch (error) {
          if (itemsRef.current !== currentItems) continue;
          if (error instanceof PassCliError && error.type === "not_authenticated") {
            await resetSession();
            break;
          }
          throw error;
        }
        // Re-fetch if either the list or the time step changed while these requests were running.
        if (itemsRef.current !== currentItems) continue;
        if (codeTimeStep !== getTotpTimeStep() && !retriedTimeStep) {
          retriedTimeStep = true;
          continue;
        }
        setItems(updatedItems);
        itemsRef.current = updatedItems;
        if (codeTimeStep !== getTotpTimeStep()) {
          await showToast({
            style: Toast.Style.Failure,
            title: "Couldn't Refresh TOTP Codes",
            message: "The refresh took too long. Try refreshing again.",
            primaryAction: { title: "Retry", onAction: refreshTotpCodes },
          });
        }
        break;
      }
    } finally {
      isRefreshingRef.current = false;
      setIsRefreshing(false);
    }
  }

  const errorView = renderErrorView(error, loadTotpItems, "Load TOTP Items");
  if (errorView) return errorView;

  async function copyTotp(item: TotpItem) {
    const currentItem = itemsRef.current.find(
      (entry) => entry.shareId === item.shareId && entry.itemId === item.itemId,
    );
    const totp = currentItem && currentCode(currentItem);
    if (!totp) {
      showToast({ style: Toast.Style.Failure, title: "TOTP Code Expired", message: "Refresh to get a current code" });
      refreshTotpCodes();
      return;
    }
    await Clipboard.copy(totp, { concealed: preferences.copyPasswordTransient ?? true });
    showToast({ style: Toast.Style.Success, title: "TOTP Copied", message: item.title });
  }

  function getTimerColor(): Color {
    if (remainingSeconds > 10) return Color.Green;
    if (remainingSeconds > 5) return Color.Yellow;
    return Color.Red;
  }

  return (
    <List isLoading={isLoading || isRefreshing} searchBarPlaceholder="Search TOTP items...">
      <List.Section title="TOTP Codes" subtitle={isRefreshing ? "Refreshing..." : `Refreshing in ${remainingSeconds}s`}>
        {items.map((item) => {
          const code = currentCode(item);
          return (
            <List.Item
              key={`${item.shareId}-${item.itemId}`}
              icon={getItemIcon(item.type)}
              title={item.title}
              subtitle={item.vaultName}
              accessories={[
                {
                  tag: {
                    value: code ? formatTotpCode(code) : "---",
                    color: getTimerColor(),
                  },
                },
                { text: `${remainingSeconds}s`, icon: Icon.Clock },
              ]}
              actions={
                <ActionPanel>
                  {code && <Action title="Copy TOTP Code" icon={Icon.Clipboard} onAction={() => copyTotp(item)} />}
                  <Action
                    title="Refresh Codes"
                    icon={Icon.ArrowClockwise}
                    shortcut={Keyboard.Shortcut.Common.Refresh}
                    onAction={refreshTotpCodes}
                  />
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>
      {items.length === 0 && !isLoading && !error && (
        <List.EmptyView icon={Icon.Clock} title="No TOTP Items" description="None of your items have TOTP configured" />
      )}
    </List>
  );
}
