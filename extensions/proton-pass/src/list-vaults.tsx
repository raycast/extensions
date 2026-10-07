import { List, ActionPanel, Action, Icon, Color, getPreferenceValues, Keyboard } from "@raycast/api";
import { useState, useEffect, useMemo, useRef } from "react";
import { listVaults } from "./lib/pass-cli";
import { Vault, PassCliError, VaultRole, PROTON_PASS_CLI_DOCS } from "./lib/types";
import { SearchItemsView } from "./lib/search-items-view";
import { NotLoggedInView } from "./lib/login-view";
import { getCachedVaults, setCachedVaults } from "./lib/cache";
import { createRequestTracker } from "./lib/refresh";
import { platformShortcut } from "./lib/shortcuts";

export default function Command() {
  const [vaults, setVaults] = useState<Vault[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<PassCliError | null>(null);
  const preferences = getPreferenceValues<Preferences>();
  const backgroundRefreshEnabled = preferences.enableBackgroundRefresh ?? true;
  const hasLoadedFromCache = useRef(false);

  // Loads can overlap, e.g. Check Again while a browser login reloads: only the latest one updates the view.
  const loads = useMemo(createRequestTracker, []);

  useEffect(() => {
    loadVaults();
  }, []);

  async function loadVaults() {
    const isLatest = loads.start();
    // The login screen stays while loading after a login or Check Again, until there's something to show.
    if (error?.type !== "not_authenticated") setError(null);
    setIsLoading(true);

    const cachedVaults = await getCachedVaults();
    if (!isLatest()) return;
    if (cachedVaults && !hasLoadedFromCache.current) {
      setVaults(cachedVaults.data);
      hasLoadedFromCache.current = true;

      if (!cachedVaults.isStale && !backgroundRefreshEnabled) {
        setIsLoading(false);
        return;
      }
    }

    try {
      const freshVaults = await listVaults();
      if (!isLatest()) return;
      setVaults(freshVaults);
      setError(null);
      await setCachedVaults(freshVaults);
    } catch (err: unknown) {
      if (!isLatest()) return;
      // The vaults of an ended session must not show up again, e.g. while Check Again runs.
      if (err instanceof PassCliError && err.type === "not_authenticated") setVaults([]);
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

  function getRoleIcon(role: VaultRole): Icon {
    switch (role) {
      case "owner":
        return Icon.Crown;
      case "manager":
        return Icon.PersonCircle;
      case "editor":
        return Icon.Pencil;
      case "viewer":
        return Icon.Eye;
      default:
        return Icon.Eye;
    }
  }

  function getRoleColor(role: VaultRole): Color {
    switch (role) {
      case "owner":
        return Color.Yellow;
      case "manager":
        return Color.Blue;
      case "editor":
        return Color.Green;
      case "viewer":
        return Color.SecondaryText;
      default:
        return Color.SecondaryText;
    }
  }

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
        vaults.map((vault) => (
          <List.Item
            key={vault.shareId}
            icon={Icon.Folder}
            title={vault.name}
            accessories={[
              vault.itemCount === undefined
                ? undefined
                : { text: `${vault.itemCount} ${vault.itemCount === 1 ? "item" : "items"}` },
              vault.role === undefined
                ? undefined
                : {
                    tag: {
                      value: vault.role,
                      color: getRoleColor(vault.role),
                    },
                    icon: getRoleIcon(vault.role),
                    tooltip: `Role: ${vault.role}`,
                  },
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
