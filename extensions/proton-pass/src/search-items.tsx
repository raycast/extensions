import {
  List,
  ActionPanel,
  Action,
  Icon,
  showToast,
  Toast,
  Clipboard,
  getPreferenceValues,
  Detail,
  BrowserExtension,
  environment,
} from "@raycast/api";
import { useState, useEffect, useMemo, useRef } from "react";
import { usePromise } from "@raycast/utils";
import { listItems, listVaults, getItem, getTotp, checkAuth } from "./lib/pass-cli";
import { Item, ItemDetail as ItemDetailType, PassCliError, PassCliErrorType, Vault } from "./lib/types";
import { getItemIcon, formatItemSubtitle, maskPassword } from "./lib/utils";
import { getCachedItems, setCachedItems, getCachedVaults, setCachedVaults } from "./lib/cache";
import { renderErrorView } from "./lib/error-views";

function escapeMarkdown(value: string): string {
  return value.replace(/([\\`*_{}[\]()#+\-.!|>])/g, "\\$1");
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

function ItemDetail({ item }: { item: Item }) {
  const [detail, setDetail] = useState<ItemDetailType | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const preferences = getPreferenceValues<Preferences>();

  useEffect(() => {
    loadDetail();
  }, []);

  async function loadDetail() {
    try {
      const itemDetail = await getItem(item.shareId, item.itemId);
      setDetail(itemDetail);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "An unknown error occurred";
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to load item details",
        message,
      });
    } finally {
      setIsLoading(false);
    }
  }

  if (isLoading) {
    return <Detail isLoading={true} />;
  }

  if (!detail) {
    return <Detail markdown="Failed to load item details" />;
  }

  const markdownParts: string[] = [];

  markdownParts.push(`# ${escapeMarkdown(detail.title)}\n`);
  markdownParts.push(`**Type:** ${escapeMarkdown(detail.type)}`);
  markdownParts.push(`**Vault:** ${escapeMarkdown(detail.vaultName)}\n`);

  if (detail.username) {
    markdownParts.push(`**Username:** ${escapeMarkdown(detail.username)}`);
  }

  if (detail.email) {
    markdownParts.push(`**Email:** ${escapeMarkdown(detail.email)}`);
  }

  if (detail.password) {
    markdownParts.push(`**Password:** ${escapeMarkdown(maskPassword(detail.password))}`);
  }

  if (detail.urls && detail.urls.length > 0) {
    markdownParts.push(`\n**URLs:**`);
    detail.urls.forEach((url) => {
      markdownParts.push(`- ${escapeMarkdown(url)}`);
    });
  }

  if (detail.note) {
    markdownParts.push(`\n**Note:**\n${escapeMarkdown(detail.note)}`);
  }

  if (detail.customFields && detail.customFields.length > 0) {
    markdownParts.push(`\n**Custom Fields:**`);
    detail.customFields.forEach((field) => {
      const value = field.type === "hidden" ? maskPassword(field.value) : field.value;
      markdownParts.push(`- **${escapeMarkdown(field.name)}:** ${escapeMarkdown(value)}`);
    });
  }

  if (detail.hasTotp) {
    markdownParts.push(`\n**2FA:** Enabled`);
  }

  const markdown = markdownParts.join("\n");

  return (
    <Detail
      markdown={markdown}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Type" text={detail.type} icon={getItemIcon(detail.type)} />
          <Detail.Metadata.Label title="Vault" text={detail.vaultName} />
          {detail.username && <Detail.Metadata.Label title="Username" text={detail.username} />}
          {detail.email && <Detail.Metadata.Label title="Email" text={detail.email} />}
          {detail.hasTotp && <Detail.Metadata.Label title="2FA" icon={Icon.Clock} />}
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <ActionPanel.Section title="Copy">
            {detail.password && (
              <Action
                title="Copy Password"
                icon={Icon.Key}
                shortcut={{ modifiers: ["cmd"], key: "c" }}
                onAction={async () => {
                  await Clipboard.copy(detail.password!, { transient: preferences.copyPasswordTransient ?? true });
                  showToast({ style: Toast.Style.Success, title: "Password Copied" });
                }}
              />
            )}
            {detail.username && (
              <Action
                title="Copy Username"
                icon={Icon.Person}
                shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                onAction={async () => {
                  await Clipboard.copy(detail.username!);
                  showToast({ style: Toast.Style.Success, title: "Username Copied" });
                }}
              />
            )}
            {detail.email && (
              <Action
                title="Copy Email"
                icon={Icon.Envelope}
                shortcut={{ modifiers: ["cmd", "opt"], key: "c" }}
                onAction={async () => {
                  await Clipboard.copy(detail.email!);
                  showToast({ style: Toast.Style.Success, title: "Email Copied" });
                }}
              />
            )}
            {detail.urls && detail.urls.length > 0 && (
              <Action
                title="Copy First URL"
                icon={Icon.Link}
                shortcut={{ modifiers: ["cmd"], key: "u" }}
                onAction={async () => {
                  await Clipboard.copy(detail.urls![0]);
                  showToast({ style: Toast.Style.Success, title: "URL Copied" });
                }}
              />
            )}
            {detail.hasTotp && (
              <Action
                title="Copy TOTP Code"
                icon={Icon.Clock}
                shortcut={{ modifiers: ["cmd"], key: "t" }}
                onAction={async () => {
                  try {
                    const totp = await getTotp(detail.shareId, detail.itemId);
                    await Clipboard.copy(totp, { transient: preferences.copyPasswordTransient ?? true });
                    showToast({ style: Toast.Style.Success, title: "TOTP Copied", message: "Clipboard updated" });
                  } catch (error: unknown) {
                    const message = error instanceof Error ? error.message : "An unknown error occurred";
                    showToast({ style: Toast.Style.Failure, title: "Failed to get TOTP", message });
                  }
                }}
              />
            )}
            {detail.note && (
              <Action
                title="Copy Note"
                icon={Icon.Document}
                shortcut={{ modifiers: ["cmd"], key: "n" }}
                onAction={async () => {
                  await Clipboard.copy(detail.note!);
                  showToast({ style: Toast.Style.Success, title: "Note Copied" });
                }}
              />
            )}
          </ActionPanel.Section>
          {detail.customFields && detail.customFields.length > 0 && (
            <ActionPanel.Section title="Custom Fields">
              {detail.customFields.map((field, index) => (
                <Action
                  key={index}
                  title={`Copy ${field.name}`}
                  icon={Icon.Clipboard}
                  shortcut={
                    index < 9
                      ? {
                          modifiers: ["cmd", "shift"],
                          key: String(index + 1) as "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9",
                        }
                      : undefined
                  }
                  onAction={async () => {
                    await Clipboard.copy(field.value);
                    showToast({ style: Toast.Style.Success, title: `${field.name} Copied` });
                  }}
                />
              ))}
            </ActionPanel.Section>
          )}
          {detail.urls && detail.urls.length > 1 && (
            <ActionPanel.Section title="URLs">
              {detail.urls.map((url, index) => (
                <Action.OpenInBrowser key={index} title={`Open ${url}`} url={url} />
              ))}
            </ActionPanel.Section>
          )}
          <ActionPanel.Section title="Debug">
            <Action
              title="Copy Item Debug Info"
              icon={Icon.Bug}
              shortcut={{ modifiers: ["cmd", "shift"], key: "d" }}
              onAction={async () => {
                await Clipboard.copy(
                  JSON.stringify(
                    {
                      type: detail.type,
                      hasPassword: !!detail.password,
                      hasUsername: !!detail.username,
                      hasEmail: !!detail.email,
                      hasUrls: !!detail.urls?.length,
                      hasNote: !!detail.note,
                      hasTotp: detail.hasTotp,
                      customFieldsCount: detail.customFields?.length ?? 0,
                    },
                    null,
                    2,
                  ),
                );
                showToast({ style: Toast.Style.Success, title: "Debug Info Copied" });
              }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

const ALL_VAULTS_VALUE = "all";

function VaultDropdown({ vaults, onVaultChange }: { vaults: Vault[]; onVaultChange: (vaultId: string) => void }) {
  return (
    <List.Dropdown tooltip="Select Vault" storeValue={true} onChange={onVaultChange} defaultValue={ALL_VAULTS_VALUE}>
      <List.Dropdown.Item title="All Vaults" value={ALL_VAULTS_VALUE} icon={Icon.Globe} />
      <List.Dropdown.Section title="Vaults">
        {vaults.map((vault) => (
          <List.Dropdown.Item key={vault.shareId} title={vault.name} value={vault.shareId} icon={Icon.Folder} />
        ))}
      </List.Dropdown.Section>
    </List.Dropdown>
  );
}

export default function Command() {
  const [items, setItems] = useState<Item[]>([]);
  const [vaults, setVaults] = useState<Vault[]>([]);
  const [selectedVaultId, setSelectedVaultId] = useState<string>(ALL_VAULTS_VALUE);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<{ type: PassCliErrorType; message?: string } | null>(null);
  const preferences = getPreferenceValues<Preferences>();
  const backgroundRefreshEnabled = preferences.enableBackgroundRefresh ?? true;
  const webIntegrationEnabled = preferences.enableWebIntegration ?? true;
  const hasLoadedFromCache = useRef(false);
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
      setItems(cachedItems);
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
        setError({ type: "not_authenticated" });
        setIsLoading(false);
        return;
      }

      const [freshItems, freshVaults] = await Promise.all([listItems(), listVaults()]);
      setItems(freshItems);
      setVaults(freshVaults);

      await Promise.all([setCachedItems(freshItems), setCachedVaults(freshVaults)]);
    } catch (err: unknown) {
      if (!hasLoadedFromCache.current) {
        if (err instanceof PassCliError) {
          setError({ type: err.type, message: err.message });
        } else {
          const message = err instanceof Error ? err.message : "An unknown error occurred";
          setError({ type: "unknown", message });
        }
      }
    } finally {
      setIsLoading(false);
    }
  }

  const errorView = renderErrorView(error?.type ?? null, loadItems, "Load Items");
  if (errorView) return errorView;

  const filteredItems =
    selectedVaultId === ALL_VAULTS_VALUE ? items : items.filter((item) => item.shareId === selectedVaultId);
  const sortedFilteredItems = useMemo(() => {
    if (!webIntegrationEnabled || !activeOrigin) return filteredItems;

    return [...filteredItems].sort((a, b) => {
      const aMatch = matchesActiveOrigin(a, activeOrigin);
      const bMatch = matchesActiveOrigin(b, activeOrigin);
      if (aMatch === bMatch) return 0;
      return aMatch ? -1 : 1;
    });
  }, [activeOrigin, filteredItems, webIntegrationEnabled]);

  const selectedItemId = useMemo(() => {
    if (!webIntegrationEnabled || !activeOrigin) return undefined;
    const match = sortedFilteredItems.find((item) => matchesActiveOrigin(item, activeOrigin));
    return match ? `${match.shareId}-${match.itemId}` : undefined;
  }, [activeOrigin, sortedFilteredItems, webIntegrationEnabled]);

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search items..."
      filtering={true}
      selectedItemId={selectedItemId}
      searchBarAccessory={<VaultDropdown vaults={vaults} onVaultChange={setSelectedVaultId} />}
    >
      {filteredItems.length === 0 && !isLoading ? (
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title="No Items Found"
          description={selectedVaultId === ALL_VAULTS_VALUE ? "Your vaults are empty" : "No items in this vault"}
        />
      ) : (
        sortedFilteredItems.map((item) => (
          <List.Item
            key={`${item.shareId}-${item.itemId}`}
            icon={getItemIcon(item.type)}
            title={item.title}
            subtitle={formatItemSubtitle(item)}
            accessories={[
              item.hasTotp ? { icon: Icon.Clock, tooltip: "Has TOTP" } : null,
              { text: item.vaultName },
            ].filter((a): a is NonNullable<typeof a> => a !== null)}
            actions={
              <ActionPanel>
                <ActionPanel.Section>
                  <Action.Push
                    title="View Details"
                    icon={Icon.Eye}
                    target={<ItemDetail item={item} />}
                    shortcut={{ modifiers: ["cmd"], key: "d" }}
                  />
                </ActionPanel.Section>
                <ActionPanel.Section title="Copy">
                  {item.type === "login" && (
                    <Action
                      title="Copy Password"
                      icon={Icon.Key}
                      shortcut={{ modifiers: ["cmd"], key: "c" }}
                      onAction={async () => {
                        try {
                          const detail = await getItem(item.shareId, item.itemId);
                          if (detail.password) {
                            await Clipboard.copy(detail.password, {
                              transient: preferences.copyPasswordTransient ?? true,
                            });
                            showToast({ style: Toast.Style.Success, title: "Password Copied" });
                          } else {
                            showToast({
                              style: Toast.Style.Failure,
                              title: "No Password Found",
                              message: `Item type: ${detail.type}. Check if pass-cli item view returns password field.`,
                            });
                          }
                        } catch (error: unknown) {
                          const message = error instanceof Error ? error.message : "An unknown error occurred";
                          showToast({
                            style: Toast.Style.Failure,
                            title: "Failed to copy password",
                            message,
                          });
                        }
                      }}
                    />
                  )}
                  {item.username && (
                    <Action
                      title="Copy Username"
                      icon={Icon.Person}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                      onAction={async () => {
                        await Clipboard.copy(item.username!);
                        showToast({ style: Toast.Style.Success, title: "Username Copied" });
                      }}
                    />
                  )}
                  {item.email && (
                    <Action
                      title="Copy Email"
                      icon={Icon.Envelope}
                      shortcut={{ modifiers: ["cmd", "opt"], key: "c" }}
                      onAction={async () => {
                        await Clipboard.copy(item.email!);
                        showToast({ style: Toast.Style.Success, title: "Email Copied" });
                      }}
                    />
                  )}
                  {item.hasTotp && (
                    <Action
                      title="Copy TOTP Code"
                      icon={Icon.Clock}
                      shortcut={{ modifiers: ["cmd"], key: "t" }}
                      onAction={async () => {
                        try {
                          const totp = await getTotp(item.shareId, item.itemId);
                          await Clipboard.copy(totp, { transient: preferences.copyPasswordTransient ?? true });
                          showToast({
                            style: Toast.Style.Success,
                            title: "TOTP Copied",
                            message: "Clipboard updated",
                          });
                        } catch (error: unknown) {
                          const message = error instanceof Error ? error.message : "An unknown error occurred";
                          showToast({
                            style: Toast.Style.Failure,
                            title: "Failed to get TOTP",
                            message,
                          });
                        }
                      }}
                    />
                  )}
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}
