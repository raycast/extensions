import { List, Icon, getPreferenceValues, BrowserExtension, environment, showToast, Toast } from "@raycast/api";
import { useState, useEffect, useMemo, useRef } from "react";
import { usePromise } from "@raycast/utils";
import { listVaultsAndItems } from "./pass-cli";
import { Item, PassCliError, PassCliErrorType, Vault } from "./types";
import { getCachedItems, setCachedItems, getCachedVaults, setCachedVaults } from "./cache";
import { renderErrorView } from "./error-views";
import { hostnameOf } from "./format";
import { ItemList } from "./item-list";

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
  const { data: activeOrigin } = usePromise(
    async (isWebIntegrationEnabled: boolean) => {
      if (!isWebIntegrationEnabled) return undefined;
      if (!environment.canAccess(BrowserExtension)) return undefined;

      try {
        const tabs = await BrowserExtension.getTabs();
        return originOf(tabs.find((tab) => tab.active)?.url);
      } catch {
        return undefined;
      }
    },
    [webIntegrationEnabled],
  );

  useEffect(() => {
    loadItems();
  }, []);

  async function loadItems() {
    setError(null);

    const [cachedItems, cachedVaults] = await Promise.all([getCachedItems(), getCachedVaults()]);
    if (cachedItems && cachedVaults && !hasLoadedFromCache.current) {
      // Show cached metadata right away, even when stale: the first pass-cli call can take
      // several seconds, so waiting for it before rendering anything feels broken.
      updateItems(cachedItems.data);
      setVaults(cachedVaults.data);
      hasLoadedFromCache.current = true;

      const isStale = cachedItems.isStale || cachedVaults.isStale;
      if (!isStale && !backgroundRefreshEnabled) {
        setIsLoading(false);
        return;
      }
    }

    setIsLoading(true);
    try {
      const { vaults: freshVaults, items: freshItems, failedVaults } = await listVaultsAndItems();
      // Vaults that failed to load keep the items already known, instead of looking empty.
      const failedIds = new Set(failedVaults.map(({ vault }) => vault.shareId));
      const nextItems = [...freshItems, ...itemsRef.current.filter((item) => failedIds.has(item.shareId))];
      updateItems(nextItems);
      setVaults(freshVaults);

      await Promise.all([setCachedItems(nextItems), setCachedVaults(freshVaults)]);
      if (failedVaults.length > 0) {
        await showToast({
          style: Toast.Style.Failure,
          title:
            failedVaults.length === 1
              ? `Couldn't Load ${failedVaults[0].vault.name}`
              : `Couldn't Load ${failedVaults.length} Vaults`,
          message: failedVaults[0].message,
          primaryAction: { title: "Retry", onAction: () => void loadItems() },
        });
      }
    } catch (err: unknown) {
      const type = err instanceof PassCliError ? err.type : "unknown";
      // A logged-out session must surface even when cached items are on screen.
      if (!hasLoadedFromCache.current || type === "not_authenticated") {
        const message = err instanceof Error ? err.message : "An unknown error occurred";
        setError({ type, message });
      }
    } finally {
      setIsLoading(false);
    }
  }

  const filteredItems = useMemo(
    () => (selectedVaultId === ALL_VAULTS_VALUE ? items : items.filter((item) => item.shareId === selectedVaultId)),
    [items, selectedVaultId],
  );
  const suggestedItems = useMemo(() => {
    if (!webIntegrationEnabled || !activeOrigin) return [];
    return filteredItems.filter((item) => matchesActiveOrigin(item, activeOrigin));
  }, [activeOrigin, filteredItems, webIntegrationEnabled]);

  const errorView = renderErrorView(error?.type ?? null, loadItems, "Load Items", error?.message);
  if (errorView) return errorView;

  return (
    <ItemList
      items={filteredItems}
      suggestedItems={suggestedItems}
      suggestionsTitle={activeOrigin ? `Suggested for ${hostnameOf(activeOrigin)}` : undefined}
      isLoading={isLoading}
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
        icon: Icon.MagnifyingGlass,
        title: "No Items Found",
        description: selectedVaultId === ALL_VAULTS_VALUE ? "Your vaults are empty" : "No items in this vault",
      }}
      onRefresh={loadItems}
    />
  );
}
