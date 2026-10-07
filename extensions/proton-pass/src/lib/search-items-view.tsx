import { List, Icon, getPreferenceValues, BrowserExtension, environment, showToast, Toast } from "@raycast/api";
import { useState, useEffect, useMemo, useRef } from "react";
import { usePromise } from "@raycast/utils";
import { listItems, listVaultsAndItems, VaultFailure } from "./pass-cli";
import { Item, PassCliError, PassCliErrorType, Vault } from "./types";
import { getCachedItems, setCachedItems, getCachedVaults, setCachedVaults } from "./cache";
import { renderErrorView } from "./error-views";
import { NotLoggedInView } from "./login-view";
import { hostnameOf } from "./format";
import { ItemList } from "./item-list";
import { createRequestTracker, createSerialQueue, failedVaultsTitle, getRefreshResult } from "./refresh";

/** How long items wait for the active browser tab, so that its suggestions are in place when the list appears. */
const ACTIVE_TAB_TIMEOUT_MS = 500;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T | undefined> {
  return Promise.race([promise, new Promise<undefined>((resolve) => setTimeout(() => resolve(undefined), ms))]);
}

function originOf(raw?: string): string | undefined {
  if (!raw) return undefined;

  try {
    return new URL(raw).origin;
  } catch {
    return undefined;
  }
}

function matchesActiveOrigin(item: Item, activeOrigin?: string): boolean {
  if (!activeOrigin || !item.urls || item.urls.length === 0) return false;
  return item.urls.some((url) => originOf(url) === activeOrigin);
}

const ALL_VAULTS_VALUE = "all";

interface VaultDropdownProps {
  vaults: Vault[];
  /** Vault to show, for a vault opened from List Vaults. Otherwise the last selection is restored. */
  value?: string;
  onVaultChange: (vaultId: string) => void;
}

function VaultDropdown({ vaults, value, onVaultChange }: VaultDropdownProps) {
  return (
    <List.Dropdown
      tooltip="Select Vault"
      storeValue={value === undefined}
      value={value}
      defaultValue={value === undefined ? ALL_VAULTS_VALUE : undefined}
      onChange={onVaultChange}
    >
      <List.Dropdown.Item title="All Vaults" value={ALL_VAULTS_VALUE} icon={Icon.Globe} />
      <List.Dropdown.Section title="Vaults">
        {vaults.map((vault) => (
          <List.Dropdown.Item key={vault.shareId} title={vault.name} value={vault.shareId} icon={Icon.Folder} />
        ))}
      </List.Dropdown.Section>
    </List.Dropdown>
  );
}

/** Search Items, also opened from List Vaults with that vault preselected. */
export function SearchItemsView({ initialVault }: { initialVault?: Vault }) {
  const [items, setItems] = useState<Item[]>([]);
  const [vaults, setVaults] = useState<Vault[]>([]);
  const [selectedVaultId, setSelectedVaultId] = useState<string>(initialVault?.shareId ?? ALL_VAULTS_VALUE);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<{ type: PassCliErrorType; message?: string } | null>(null);
  const [failedVaults, setFailedVaults] = useState<VaultFailure[]>([]);
  const [loadFailureMessage, setLoadFailureMessage] = useState<string>();
  const preferences = getPreferenceValues<Preferences>();
  const backgroundRefreshEnabled = preferences.enableBackgroundRefresh ?? true;
  const webIntegrationEnabled = preferences.enableWebIntegration ?? true;
  const hasLoadedFromCache = useRef(false);
  // Latest items, for loadItems() which can run long after it was created (e.g. from a toast action).
  const itemsRef = useRef<Item[]>([]);

  function updateItems(next: Item[]) {
    itemsRef.current = next;
    setItems(next);
  }
  const { data: activeOrigin, isLoading: isLoadingActiveTab } = usePromise(
    async (isWebIntegrationEnabled: boolean) => {
      if (!isWebIntegrationEnabled) return undefined;
      if (!environment.canAccess(BrowserExtension)) return undefined;

      try {
        // A late answer is dropped: suggestions showing up afterwards would move the selection under the user.
        const tabs = await withTimeout(BrowserExtension.getTabs(), ACTIVE_TAB_TIMEOUT_MS);
        return originOf(tabs?.find((tab) => tab.active)?.url);
      } catch {
        return undefined;
      }
    },
    [webIntegrationEnabled],
  );

  useEffect(() => {
    loadItems();
  }, []);

  // A slower, older load must not overwrite a newer one (e.g. Retry during a refresh).
  const loads = useMemo(createRequestTracker, []);
  const cacheWrites = useMemo(createSerialQueue, []);

  async function loadItems() {
    const isLatest = loads.start();
    // The login screen stays while loading after a login or Check Again, until there's something to show.
    if (error?.type !== "not_authenticated") setError(null);
    // Loading from the start, so that an empty list doesn't say "No Items Found" meanwhile.
    setIsLoading(true);
    setFailedVaults([]);
    setLoadFailureMessage(undefined);

    const [sharedItems, cachedVaults, legacyItems] = await Promise.all([
      getCachedItems(),
      getCachedVaults(),
      initialVault ? getCachedItems(initialVault.shareId) : null,
    ]);
    const sharedHasVault = sharedItems?.data.some((item) => item.shareId === initialVault?.shareId);
    // Prefer a newer vault snapshot, or fill a gap from an earlier partial account listing.
    // Replace that vault's items rather than unioning snapshots, so deleted items do not return.
    const cachedItems =
      legacyItems && (!sharedHasVault || legacyItems.timestamp > (sharedItems?.timestamp ?? 0))
        ? {
            data: [
              ...(sharedItems?.data.filter((item) => item.shareId !== initialVault?.shareId) ?? []),
              ...legacyItems.data,
            ],
            isStale: true,
          }
        : sharedItems;
    if (!isLatest()) return;
    if (cachedItems && (cachedVaults || initialVault) && !hasLoadedFromCache.current) {
      // Show cached metadata right away, even when stale: the first pass-cli call can take
      // several seconds, so waiting for it before rendering anything feels broken.
      updateItems(cachedItems.data);
      setVaults(cachedVaults?.data ?? (initialVault ? [initialVault] : []));
      hasLoadedFromCache.current = true;

      const isStale = cachedItems.isStale || cachedVaults?.isStale === true;
      if (!isStale && !backgroundRefreshEnabled) {
        setIsLoading(false);
        return;
      }
    }

    try {
      if (initialVault && itemsRef.current.length === 0) {
        // Nothing cached yet: show the opened vault first, without waiting for every other vault.
        const vaultItems = await listItems(initialVault.shareId, [initialVault]).catch((err: unknown) => {
          if (err instanceof PassCliError && err.type === "not_authenticated") throw err;
          return []; // The full listing below reports the failure.
        });
        if (!isLatest()) return;
        if (vaultItems.length > 0) {
          updateItems(vaultItems);
          setError(null);
        }
      }

      const { vaults: freshVaults, items: freshItems, failedVaults: failures } = await listVaultsAndItems();
      if (!isLatest()) return;
      setFailedVaults(failures);
      // Vaults that failed to load keep the items already known, instead of looking empty.
      const { items: nextItems, isComplete, failureMessage } = getRefreshResult(freshItems, itemsRef.current, failures);
      updateItems(nextItems);
      setVaults(freshVaults);
      setError(null);

      // A failed listing with nothing to show must stay an error, rather than a successful empty result.
      if (failureMessage) throw new Error(failureMessage);

      // Only complete listings renew the cache; partial failures must remain eligible for a retry.
      // Writes run in request order and only for the latest load, so an older load can't overwrite a newer one.
      if (isComplete) {
        await cacheWrites.run(async () => {
          if (isLatest()) await Promise.all([setCachedItems(nextItems, true), setCachedVaults(freshVaults)]);
        });
      }
      if (!isLatest()) return;
      if (failures.length > 0) {
        await showToast({
          style: Toast.Style.Failure,
          title: failedVaultsTitle(failures.map(({ vault }) => vault.name)),
          message: failures[0].message,
          primaryAction: { title: "Retry", onAction: () => void loadItems() },
        });
      }
    } catch (err: unknown) {
      if (!isLatest()) return;
      const type = err instanceof PassCliError ? err.type : "unknown";
      const message = err instanceof Error ? err.message : "An unknown error occurred";
      // Items and vaults belong to the session that listed them: once it has ended, they must not show up again.
      if (type === "not_authenticated") {
        updateItems([]);
        setVaults([]);
      }
      if (itemsRef.current.length === 0) {
        setError({ type, message });
      } else {
        setLoadFailureMessage(message);
        // The items on screen (cached, or the opened vault's) stay, but they can be outdated or incomplete.
        await showToast({
          style: Toast.Style.Failure,
          title: "Couldn't Load Items",
          message: message.split("\n")[0],
          primaryAction: { title: "Retry", onAction: () => void loadItems() },
        });
      }
    } finally {
      if (isLatest()) setIsLoading(false);
    }
  }

  const filteredItems = useMemo(
    () => (selectedVaultId === ALL_VAULTS_VALUE ? items : items.filter((item) => item.shareId === selectedVaultId)),
    [items, selectedVaultId],
  );
  const emptyFailureMessage =
    failedVaults.find(({ vault }) => vault.shareId === selectedVaultId)?.message ?? loadFailureMessage;
  const suggestedItems = useMemo(() => {
    if (!webIntegrationEnabled || !activeOrigin) return [];
    return filteredItems.filter((item) => matchesActiveOrigin(item, activeOrigin));
  }, [activeOrigin, filteredItems, webIntegrationEnabled]);

  if (error?.type === "not_authenticated") {
    return <NotLoggedInView reload={loadItems} />;
  }
  const errorView = renderErrorView(error?.type ?? null, loadItems, "Load Items", error?.message);
  if (errorView) return errorView;

  return (
    <ItemList
      // Items wait for the active tab, so that the suggested login is selected from the start.
      items={isLoadingActiveTab ? [] : filteredItems}
      suggestedItems={suggestedItems}
      suggestionsTitle={activeOrigin ? `Suggested for ${hostnameOf(activeOrigin)}` : undefined}
      isLoading={isLoading || isLoadingActiveTab}
      navigationTitle={initialVault ? "Search Items" : undefined}
      searchBarAccessory={
        <VaultDropdown
          // Until vaults are loaded, the preselected vault must still be one of the options.
          vaults={vaults.length === 0 && initialVault ? [initialVault] : vaults}
          value={initialVault ? selectedVaultId : undefined}
          onVaultChange={setSelectedVaultId}
        />
      }
      emptyView={{
        icon: emptyFailureMessage ? Icon.ExclamationMark : Icon.MagnifyingGlass,
        title: emptyFailureMessage ? "Couldn't Load Items" : "No Items Found",
        description:
          emptyFailureMessage?.split("\n")[0] ??
          (selectedVaultId === ALL_VAULTS_VALUE ? "Your vaults are empty" : "No items in this vault"),
        onRetry: emptyFailureMessage ? loadItems : undefined,
      }}
      onRefresh={loadItems}
    />
  );
}
