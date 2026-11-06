import { List, ActionPanel, Action, Icon, getPreferenceValues, Keyboard, useNavigation } from "@raycast/api";
import { useState, useEffect, useMemo, useRef } from "react";
import { endedSessionError, listVaultSharing, listVaultsAndItems, SESSION_CHECK_WAIT_MS } from "./pass-cli";
import { Vault, PassCliError, PROTON_PASS_CLI_DOCS } from "./types";
import { SearchItemsView } from "./search-items-view";
import { NotLoggedInView } from "./login-view";
import {
  getCachedItems,
  getCachedSharing,
  getCachedVaults,
  setCachedItems,
  setCachedSharing,
  setCachedVaults,
} from "./cache";
import { countItemsByVault, formatItemCount, refreshItemCounts, totalItemCount } from "./item-counts";
import { createListingSaves, createRequestTracker, listingSaves, withTimeout } from "./refresh";
import { platformShortcut } from "./shortcuts";
import { mergeSharing, sharedVaultTooltip, withSharing } from "./vault-sharing";
import { CliNotFoundView } from "./error-views";

/** Only the vault list lists sharing: overlapping loads, e.g. a refresh and Retry, save it in the order they started. */
const sharingSaves = createListingSaves();

/** Marks shared vaults, whether you shared them or they were shared with you. */
function sharedAccessory(vault: Vault): List.Item.Accessory | undefined {
  const tooltip = sharedVaultTooltip(vault);
  return tooltip === undefined ? undefined : { icon: Icon.TwoPeople, tooltip };
}

/**
 * The vault list of Browse Items, under the items it opens. `startOnItems` opens all items on top of it right away, so
 * that Esc goes back to the vaults.
 */
export function VaultsView({ startOnItems }: { startOnItems: boolean }) {
  const { push } = useNavigation();
  const [vaults, setVaults] = useState<Vault[]>([]);
  const [itemCounts, setItemCounts] = useState<Map<string, number>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<PassCliError | null>(null);
  // Once pass-cli has confirmed the session, the item lists opened from here don't ask it again.
  const [sessionConfirmed, setSessionConfirmed] = useState(false);
  const preferences = getPreferenceValues<Preferences>();
  const backgroundRefreshEnabled = preferences.enableBackgroundRefresh ?? true;
  const hasLoadedFromCache = useRef(false);
  const hasOpenedItems = useRef(false);

  // Loads can overlap, e.g. Check Again while a browser login reloads: only the latest one updates the view.
  const loads = useMemo(createRequestTracker, []);

  useEffect(() => {
    if (!startOnItems) {
      void loadVaults();
      return;
    }
    // Once only: in development, React runs this twice, and a second copy of the items would need a second Esc.
    if (hasOpenedItems.current) return;
    hasOpenedItems.current = true;
    // Vaults load once they're shown: while the items are on top, listing them would list everything a second time.
    push(<SearchItemsView />, () => void loadVaults());
  }, []);

  async function loadVaults() {
    const isLatest = loads.start();
    // The login screen stays while loading after a login or Check Again, until there's something to show.
    if (error?.type !== "not_authenticated") setError(null);
    setIsLoading(true);

    // Saved vaults wait for pass-cli to confirm the session, as in the item list: an ended one shows the login screen.
    const sessionCheck = hasLoadedFromCache.current ? Promise.resolve(undefined) : endedSessionError();
    const [cachedVaults, cachedItems, cachedSharing, sessionEnded] = await Promise.all([
      getCachedVaults(),
      getCachedItems(),
      getCachedSharing(),
      withTimeout(sessionCheck, SESSION_CHECK_WAIT_MS),
    ]);
    if (!isLatest()) return;
    let isFresh = false;
    if (cachedVaults && !hasLoadedFromCache.current && !sessionEnded) {
      setVaults(withSharing(cachedVaults.data, cachedSharing?.data ?? {}));
      // The items cache only holds complete listings, so every cached vault gets a count.
      if (cachedItems) setItemCounts(countItemsByVault(cachedVaults.data, cachedItems.data));
      hasLoadedFromCache.current = true;

      // The item list renews the vaults it saves, but only the vault list lists sharing, so its age counts too.
      isFresh = !cachedVaults.isStale && cachedSharing?.isStale === false && !backgroundRefreshEnabled;
    }

    try {
      const ended = await sessionCheck;
      if (!isLatest()) return;
      if (ended) throw ended;
      setSessionConfirmed(true);
      if (isFresh) return;
      // Items are listed too, for their number per vault; the listing also refreshes the item list's cache.
      const listing = listingSaves.start();
      const sharingListing = sharingSaves.start();
      // Sharing only adds an icon: don't hold up the vaults or items while its member commands run.
      const freshSharing = listVaultSharing().catch(() => undefined);
      const { vaults: freshVaults, items, failedVaults } = await listVaultsAndItems();
      if (!isLatest()) return;
      setVaults(withSharing(freshVaults, cachedSharing?.data ?? {}));
      setError(null);
      const failed = new Set(failedVaults.map(({ vault }) => vault.shareId));
      setItemCounts((previous) => refreshItemCounts(previous, freshVaults, items, failed));
      // Add and save optional sharing when ready, only if this is still the latest load.
      void freshSharing
        .then(async (fresh) => {
          if (!fresh || !isLatest()) return;
          const sharing = mergeSharing(fresh, cachedSharing?.data);
          setVaults(withSharing(freshVaults, sharing));
          await sharingSaves.save(sharingListing, () => setCachedSharing(sharing));
        })
        .catch(() => undefined);
      // Vaults and items are saved together, from complete listings only: a saved vault missing from the saved
      // items would count 0 items. Saves follow the order listings started, also across the item lists.
      if (failed.size === 0 && isLatest()) {
        await listingSaves.save(listing, () =>
          Promise.all([setCachedItems(items, true), setCachedVaults(freshVaults)]),
        );
      }
    } catch (err: unknown) {
      if (!isLatest()) return;
      // The vaults and counts of an ended session must not show up again, e.g. while Check Again runs.
      if (err instanceof PassCliError && err.type === "not_authenticated") {
        setVaults([]);
        setItemCounts(new Map());
        setSessionConfirmed(false);
      }
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
  const allItemsCount = totalItemCount(vaults, itemCounts);

  if (error?.type === "not_installed") {
    return <CliNotFoundView />;
  }

  if (error?.type === "not_authenticated") {
    return <NotLoggedInView reload={loadVaults} />;
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
        <>
          {vaults.length > 0 && (
            <List.Item
              key="all-vaults"
              icon={Icon.Globe}
              title="All Vaults"
              accessories={allItemsCount === undefined ? [] : [{ text: formatItemCount(allItemsCount) }]}
              actions={
                <ActionPanel>
                  <Action.Push
                    title="View Items"
                    icon={Icon.List}
                    target={<SearchItemsView allVaults sessionConfirmed={sessionConfirmed} />}
                  />
                </ActionPanel>
              }
            />
          )}
          {shownVaults.map((vault) => (
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
                  <Action.Push
                    title="View Items"
                    icon={Icon.List}
                    target={<SearchItemsView initialVault={vault} sessionConfirmed={sessionConfirmed} />}
                  />
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
          ))}
        </>
      )}
    </List>
  );
}
