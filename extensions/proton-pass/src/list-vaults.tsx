import { List, ActionPanel, Action, Icon, getPreferenceValues, Keyboard } from "@raycast/api";
import { useState, useEffect, useMemo, useRef } from "react";
import { listVaultSharing, listVaultsAndItems } from "./lib/pass-cli";
import { Vault, PassCliError, PROTON_PASS_CLI_DOCS } from "./lib/types";
import { SearchItemsView } from "./lib/search-items-view";
import { NotLoggedInView, loginWithBrowserAndReload } from "./lib/login-view";
import {
  getCachedItems,
  getCachedSharing,
  getCachedVaults,
  setCachedItems,
  setCachedSharing,
  setCachedVaults,
} from "./lib/cache";
import { countItemsByVault, formatItemCount, refreshItemCounts } from "./lib/item-counts";
import { createListingSaves, createRequestTracker, listingSaves } from "./lib/refresh";
import { platformShortcut } from "./lib/shortcuts";
import { mergeSharing, sharedVaultTooltip, withSharing } from "./lib/vault-sharing";

/** Only List Vaults lists sharing: overlapping loads, e.g. a refresh and Retry, save it in the order they started. */
const sharingSaves = createListingSaves();

/** Marks shared vaults, whether you shared them or they were shared with you. */
function sharedAccessory(vault: Vault): List.Item.Accessory | undefined {
  const tooltip = sharedVaultTooltip(vault);
  return tooltip === undefined ? undefined : { icon: Icon.TwoPeople, tooltip };
}

export default function Command() {
  const [vaults, setVaults] = useState<Vault[]>([]);
  const [itemCounts, setItemCounts] = useState<Map<string, number>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<PassCliError | null>(null);
  const preferences = getPreferenceValues<Preferences>();
  const backgroundRefreshEnabled = preferences.enableBackgroundRefresh ?? true;
  const hasLoadedFromCache = useRef(false);
  const loads = useMemo(createRequestTracker, []);

  useEffect(() => {
    loadVaults();
  }, []);

  async function loadVaults() {
    const isLatest = loads.start();
    setError(null);
    setIsLoading(true);

    const [cachedVaults, cachedItems, cachedSharing] = await Promise.all([
      getCachedVaults(),
      getCachedItems(),
      getCachedSharing(),
    ]);
    if (!isLatest()) return;
    if (cachedVaults && !hasLoadedFromCache.current) {
      setVaults(withSharing(cachedVaults.data, cachedSharing?.data ?? {}));
      // The items cache only holds complete listings, so every cached vault gets a count.
      if (cachedItems) setItemCounts(countItemsByVault(cachedVaults.data, cachedItems.data));
      hasLoadedFromCache.current = true;

      // Search Items renews the vaults it saves, but only List Vaults lists sharing, so its age counts too.
      if (!cachedVaults.isStale && cachedSharing?.isStale === false && !backgroundRefreshEnabled) {
        setIsLoading(false);
        return;
      }
    }

    try {
      // Items are listed too, for their number per vault; the listing also refreshes Search Items' cache.
      const listing = listingSaves.start();
      const sharingListing = sharingSaves.start();
      const [{ vaults: freshVaults, items, failedVaults }, freshSharing] = await Promise.all([
        listVaultsAndItems(),
        // Sharing only adds an icon: when it can't be listed, the saved sharing stays.
        listVaultSharing().catch(() => undefined),
      ]);
      if (!isLatest()) return;
      const sharing = freshSharing ? mergeSharing(freshSharing, cachedSharing?.data) : (cachedSharing?.data ?? {});
      setVaults(withSharing(freshVaults, sharing));
      const failed = new Set(failedVaults.map(({ vault }) => vault.shareId));
      setItemCounts((previous) => refreshItemCounts(previous, freshVaults, items, failed));
      // Sharing is saved on its own, so it stays up to date even when some items can't be listed.
      if (freshSharing) await sharingSaves.save(sharingListing, () => setCachedSharing(sharing));
      // Vaults and items are saved together, from complete listings only: a saved vault missing from the saved
      // items would count 0 items. Saves follow the order listings started, also across Search Items.
      if (failed.size === 0 && isLatest()) {
        await listingSaves.save(listing, () =>
          Promise.all([setCachedItems(items, true), setCachedVaults(freshVaults)]),
        );
      }
    } catch (err: unknown) {
      if (!isLatest()) return;
      // The counts of an ended session must not show up again.
      if (err instanceof PassCliError && err.type === "not_authenticated") setItemCounts(new Map());
      if (!hasLoadedFromCache.current || (err instanceof PassCliError && err.type === "not_authenticated")) {
        if (err instanceof PassCliError) {
          setError(err);
        } else {
          const message = err instanceof Error ? err.message : "An unknown error occurred";
          setError(new PassCliError(message, "unknown"));
        }
      }
    } finally {
      if (isLatest()) setIsLoading(false);
    }
  }

  const shownVaults = useMemo(
    () => vaults.map((vault) => ({ ...vault, itemCount: itemCounts.get(vault.shareId) ?? vault.itemCount })),
    [vaults, itemCounts],
  );

  if (error?.type === "not_installed") {
    return (
      <List>
        <List.EmptyView
          icon={Icon.XMarkCircle}
          title="Proton Pass CLI Not Installed"
          description="You need to install the Proton Pass CLI to use this extension. Click below to learn how to install it."
          actions={
            <ActionPanel>
              <Action.OpenInBrowser title="Open Installation Guide" url={PROTON_PASS_CLI_DOCS} icon={Icon.Globe} />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  if (error?.type === "not_authenticated") {
    return <NotLoggedInView onLogin={() => loginWithBrowserAndReload(loadVaults)} />;
  }

  if (error?.type === "keyring_error") {
    return (
      <List>
        <List.EmptyView
          icon={Icon.Key}
          title="Keyring Access Failed"
          description="pass-cli could not access secure key storage. Try: pass-cli logout --force, then set PROTON_PASS_KEY_PROVIDER=fs and login again."
          actions={
            <ActionPanel>
              <Action title="Retry" icon={Icon.ArrowClockwise} onAction={loadVaults} />
              <Action.OpenInBrowser title="View Documentation" url={PROTON_PASS_CLI_DOCS} icon={Icon.Globe} />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  if (error?.type === "network_error") {
    return (
      <List>
        <List.EmptyView
          icon={Icon.Wifi}
          title="Network Error"
          description="Check your internet connection and try again"
          actions={
            <ActionPanel>
              <Action title="Retry" icon={Icon.ArrowClockwise} onAction={loadVaults} />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  if (error?.type === "timeout") {
    return (
      <List>
        <List.EmptyView
          icon={Icon.Clock}
          title="Request Timed Out"
          description="pass-cli took too long to respond. Please try again."
          actions={
            <ActionPanel>
              <Action title="Retry" icon={Icon.ArrowClockwise} onAction={loadVaults} />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  if (error) {
    return (
      <List>
        <List.EmptyView
          icon={Icon.ExclamationMark}
          title="Error Loading Vaults"
          description={error.message}
          actions={
            <ActionPanel>
              <Action title="Retry" icon={Icon.ArrowClockwise} onAction={loadVaults} />
              <Action.OpenInBrowser title="View Documentation" url={PROTON_PASS_CLI_DOCS} icon={Icon.Globe} />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search vaults...">
      {vaults.length === 0 && !isLoading ? (
        <List.EmptyView
          icon={Icon.Folder}
          title="No Vaults Found"
          description="You don't have any vaults yet or they couldn't be loaded."
        />
      ) : (
        shownVaults.map((vault) => (
          <List.Item
            key={vault.shareId}
            icon={Icon.Folder}
            title={vault.name}
            accessories={[
              sharedAccessory(vault),
              vault.itemCount === undefined ? undefined : { text: formatItemCount(vault.itemCount) },
            ].filter((accessory) => accessory !== undefined)}
            actions={
              <ActionPanel>
                <Action.Push title="View Items" icon={Icon.List} target={<SearchItemsView initialVault={vault} />} />
                <Action.CopyToClipboard
                  title="Copy Vault Name"
                  content={vault.name}
                  shortcut={Keyboard.Shortcut.Common.Copy}
                />
                <Action.CopyToClipboard
                  title="Copy Share ID"
                  content={vault.shareId}
                  shortcut={platformShortcut(["cmd", "shift"], "i")}
                />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}
