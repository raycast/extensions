import {
  List,
  ActionPanel,
  Action,
  Color,
  Icon,
  showToast,
  Toast,
  Clipboard,
  getPreferenceValues,
  Keyboard,
} from "@raycast/api";
import { useState, useEffect, useRef, useMemo } from "react";
import { useFrecencySorting } from "@raycast/utils";
import { listVaultsAndItems, getTotp, localTotpCode } from "./lib/pass-cli";
import { Item, PassCliError, PassCliErrorType, Vault } from "./lib/types";
import {
  getTotpRemainingSeconds,
  formatTotpCode,
  hiddenTotpCode,
  TOTP_ICON,
  totpProgressIcon,
  totpTimerColor,
} from "./lib/utils";
import { itemKey, monospace } from "./lib/format";
import { getListIcon } from "./lib/item-icon";
import { platformShortcut } from "./lib/shortcuts";
import { SortByMenu, compareNames, preferredSortOrder, sortItems } from "./lib/sort";
import { ALL_VAULTS_VALUE, VaultDropdown } from "./lib/vault-dropdown";
import { countItemsByVault } from "./lib/item-counts";
import { listedUnder, SHARED_WITH_ME } from "./lib/shared-items";
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

/** The vaults that have codes, as listed, for the vault menu. */
function vaultsWithCodes(items: TotpItem[]): Vault[] {
  const vaults = new Map<string, Vault>();
  for (const item of items) {
    const shareId = listedUnder(item);
    if (!vaults.has(shareId))
      vaults.set(shareId, item.sharedWithMe ? SHARED_WITH_ME : { shareId, name: item.vaultName });
  }
  return Array.from(vaults.values());
}

async function loadCode(item: TotpItem): Promise<TotpItem> {
  const timeStep = getTotpTimeStep();
  // Generated here from the listing when possible: asking pass-cli meant one command per item every 30 seconds.
  const local = localTotpCode(item.shareId, item.itemId);
  if (local) return { ...item, currentTotp: local, currentTotpTimeStep: timeStep };
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
  const isListingRef = useRef(false);
  const hasLoadedFromCache = useRef(false);
  const loads = useMemo(createRequestTracker, []);
  const cacheWrites = useMemo(createSerialQueue, []);
  const showWebsiteIcons = preferences.showWebsiteIcons ?? false;
  // With Hide Codes, dots stand for the codes until Show Codes, for as long as the command stays open.
  const hideCodes = preferences.hideCodes ?? false;
  const [areCodesShown, setAreCodesShown] = useState(false);
  // As in Browse Items, whose use counts here too: copying a code there brings it up here, and the other way round.
  const [sortOrder, setSortOrder] = useState(preferredSortOrder);
  const { data: mostUsed, visitItem } = useFrecencySorting(items, {
    key: itemKey,
    namespace: "items",
    sortUnvisited: compareNames,
  });
  const sortedItems = useMemo(() => sortItems(items, sortOrder, mostUsed), [items, sortOrder, mostUsed]);
  // As in Browse Items, with the vaults that have codes, and the last selection restored.
  const [selectedVaultId, setSelectedVaultId] = useState(ALL_VAULTS_VALUE);
  const vaults = useMemo(() => vaultsWithCodes(items), [items]);
  const itemCounts = useMemo(() => countItemsByVault(vaults, items), [vaults, items]);
  const shownItems =
    selectedVaultId === ALL_VAULTS_VALUE
      ? sortedItems
      : sortedItems.filter((item) => listedUnder(item) === selectedVaultId);
  // As in Browse Items. Made once per list rather than on every second of the countdown.
  const icons = useMemo(
    () => new Map(items.map((item) => [itemKey(item), getListIcon(item, showWebsiteIcons)])),
    [items, showWebsiteIcons],
  );

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
    // The login screen stays while loading after a login or Check Again, until there's something to show.
    if (error !== "not_authenticated") setError(null);
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
          setError(null);
          // Their codes come with the listing below, which brings what's needed to generate them.
        }
      }

      isListingRef.current = true;
      const { items: freshItems, failedVaults } = await listVaultsAndItems().finally(() => {
        if (isLatest()) isListingRef.current = false;
      });
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
      setError(null);
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
    isListingRef.current = false;
    itemsRef.current = [];
    setItems([]);
    setError("not_authenticated");
    setIsLoading(false);
    await cacheWrites.run(clearCache);
  }

  async function refreshTotpCodes() {
    // Codes can't be generated here before the listing, which brings them: until then, each would be asked of pass-cli.
    if (isRefreshingRef.current || isListingRef.current) return;

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
    visitItem(item);
    showToast({ style: Toast.Style.Success, title: "TOTP Copied", message: item.title });
  }

  const getTimerColor = () => totpTimerColor(remainingSeconds);

  return (
    <List
      isLoading={isLoading || isRefreshing}
      searchBarPlaceholder="Search TOTP items..."
      searchBarAccessory={
        <VaultDropdown
          vaults={vaults}
          itemCounts={itemCounts}
          // By name: Sort vaults by is Browse Items' preference, which this command can't read.
          order="name"
          onVaultChange={setSelectedVaultId}
        />
      }
    >
      {shownItems.map((item) => {
        const code = currentCode(item);
        return (
          <List.Item
            key={`${item.shareId}-${item.itemId}`}
            icon={icons.get(itemKey(item))}
            title={item.title}
            subtitle={item.vaultName}
            accessories={[
              {
                // Said as in Browse Items' details.
                tag: code
                  ? {
                      value: hideCodes && !areCodesShown ? hiddenTotpCode(code) : monospace(formatTotpCode(code)),
                      color: getTimerColor(),
                    }
                  : { value: isLoading || isRefreshing ? "Loading…" : "Unavailable", color: Color.SecondaryText },
              },
              // Fixed-width digits and a circle that empties: nothing moves as the seconds go by. Codes here follow the
              // 30-second period of getTotpRemainingSeconds.
              {
                text: monospace(`${String(remainingSeconds).padStart(2, "0")}s`),
                icon: totpProgressIcon(remainingSeconds, 30, getTimerColor()),
              },
            ]}
            actions={
              <ActionPanel>
                {code && <Action title="Copy TOTP Code" icon={Icon.Clipboard} onAction={() => copyTotp(item)} />}
                {hideCodes && (
                  <Action
                    title={areCodesShown ? "Hide Codes" : "Show Codes"}
                    icon={areCodesShown ? Icon.EyeDisabled : Icon.Eye}
                    shortcut={platformShortcut(["cmd"], "h")}
                    onAction={() => setAreCodesShown((shown) => !shown)}
                  />
                )}
                <SortByMenu value={sortOrder} onChange={setSortOrder} />
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
      {shownItems.length === 0 && !isLoading && !error && (
        <List.EmptyView
          icon={TOTP_ICON}
          title="No TOTP Items"
          description={
            items.length === 0 ? "None of your items have TOTP configured" : "None of this vault's items have TOTP"
          }
        />
      )}
    </List>
  );
}
