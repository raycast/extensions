import { List, ActionPanel, Action, Icon, showToast, Toast, Color, getPreferenceValues } from "@raycast/api";
import { useState, useEffect, useRef } from "react";
import { listVaults, listItems, checkAuth, loginWithBrowser } from "./lib/pass-cli";
import { Vault, Item, PassCliError, VaultRole, PROTON_PASS_CLI_DOCS } from "./lib/types";
import { getItemIcon } from "./lib/utils";
import { getCachedVaults, setCachedVaults, getCachedItemsForVault, setCachedItemsForVault } from "./lib/cache";
import { openTerminalForLogin } from "./lib/terminal";

function VaultItems({ vault, backgroundRefreshEnabled }: { vault: Vault; backgroundRefreshEnabled: boolean }) {
  const [items, setItems] = useState<Item[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const hasLoadedFromCache = useRef(false);

  useEffect(() => {
    loadVaultItems();
  }, []);

  async function loadVaultItems() {
    const cachedItems = await getCachedItemsForVault(vault.shareId);
    if (cachedItems && !hasLoadedFromCache.current) {
      setItems(cachedItems);
      setIsLoading(false);
      hasLoadedFromCache.current = true;

      if (!backgroundRefreshEnabled) {
        return;
      }
    }

    try {
      const freshItems = await listItems(vault.shareId);
      setItems(freshItems);
      await setCachedItemsForVault(vault.shareId, freshItems);
    } catch (error: unknown) {
      if (!hasLoadedFromCache.current) {
        const message = error instanceof Error ? error.message : "An unknown error occurred";
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to load items",
          message,
        });
      }
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <List isLoading={isLoading} navigationTitle={vault.name} searchBarPlaceholder="Search items...">
      {items.length === 0 && !isLoading ? (
        <List.EmptyView
          icon={Icon.Folder}
          title="No Items in This Vault"
          description="This vault is empty or contains no visible items."
        />
      ) : (
        items.map((item) => (
          <List.Item
            key={`${item.shareId}-${item.itemId}`}
            icon={getItemIcon(item.type)}
            title={item.title}
            subtitle={item.username || item.email}
            accessories={[item.hasTotp ? { icon: Icon.Clock, tooltip: "Has TOTP" } : {}, { text: item.type }].filter(
              (acc) => Object.keys(acc).length > 0,
            )}
            actions={
              <ActionPanel>
                <Action.CopyToClipboard
                  title="Copy Title"
                  content={item.title}
                  shortcut={{ modifiers: ["cmd"], key: "c" }}
                />
                {item.username && (
                  <Action.CopyToClipboard
                    title="Copy Username"
                    content={item.username}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "u" }}
                  />
                )}
                {item.email && (
                  <Action.CopyToClipboard
                    title="Copy Email"
                    content={item.email}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "e" }}
                  />
                )}
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}

export default function Command() {
  const [vaults, setVaults] = useState<Vault[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<PassCliError | null>(null);
  const preferences = getPreferenceValues<Preferences>();
  const backgroundRefreshEnabled = preferences.enableBackgroundRefresh ?? true;
  const hasLoadedFromCache = useRef(false);

  useEffect(() => {
    loadVaults();
  }, []);

  async function loadVaults() {
    setError(null);

    const cachedVaults = await getCachedVaults();
    if (cachedVaults && !hasLoadedFromCache.current) {
      setVaults(cachedVaults);
      setIsLoading(false);
      hasLoadedFromCache.current = true;

      if (!backgroundRefreshEnabled) {
        return;
      }
    }

    try {
      const isAuth = await checkAuth();
      if (!isAuth) {
        setError(new PassCliError("Not authenticated. Please log in to Proton Pass.", "not_authenticated"));
        setIsLoading(false);
        return;
      }

      const freshVaults = await listVaults();
      setVaults(freshVaults);
      await setCachedVaults(freshVaults);
    } catch (err: unknown) {
      if (!hasLoadedFromCache.current) {
        if (err instanceof PassCliError) {
          setError(err);
        } else {
          const message = err instanceof Error ? err.message : "An unknown error occurred";
          setError(new PassCliError(message, "unknown"));
        }
      }
    } finally {
      setIsLoading(false);
    }
  }

  async function handleBrowserLogin() {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Starting Proton Pass login",
      message: "Complete authentication in your browser",
    });

    try {
      await loginWithBrowser();
      toast.style = Toast.Style.Success;
      toast.title = "Logged in";
      toast.message = "Reloading vaults";
      await loadVaults();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to login";
      toast.style = Toast.Style.Failure;
      toast.title = "Login failed";
      toast.message = message;
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
    return (
      <List>
        <List.EmptyView
          icon={Icon.Lock}
          title="Not Logged In"
          description="Use browser login (default pass-cli flow). Terminal login remains available as a fallback."
          actions={
            <ActionPanel>
              <Action title="Login with Browser" icon={Icon.Globe} onAction={handleBrowserLogin} />
              <Action title="Open Terminal Login (Fallback)" icon={Icon.Terminal} onAction={openTerminalForLogin} />
              <Action.OpenInBrowser
                title="View CLI Documentation"
                url={PROTON_PASS_CLI_DOCS}
                icon={Icon.Globe}
                shortcut={{ modifiers: ["cmd"], key: "d" }}
              />
            </ActionPanel>
          }
        />
      </List>
    );
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
              { text: `${vault.itemCount} ${vault.itemCount === 1 ? "item" : "items"}` },
              {
                tag: {
                  value: vault.role,
                  color: getRoleColor(vault.role),
                },
                icon: getRoleIcon(vault.role),
                tooltip: `Role: ${vault.role}`,
              },
            ]}
            actions={
              <ActionPanel>
                <Action.Push
                  title="View Items"
                  icon={Icon.List}
                  target={<VaultItems vault={vault} backgroundRefreshEnabled={backgroundRefreshEnabled} />}
                />
                <Action.CopyToClipboard
                  title="Copy Vault Name"
                  content={vault.name}
                  shortcut={{ modifiers: ["cmd"], key: "c" }}
                />
                <Action.CopyToClipboard
                  title="Copy Share ID"
                  content={vault.shareId}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "i" }}
                />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}
