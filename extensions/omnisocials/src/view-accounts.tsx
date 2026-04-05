import {
  List,
  ActionPanel,
  Action,
  Icon,
  Image,
  showToast,
  Toast,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { listAccounts } from "./lib/api";
import { getBaseUrl } from "./lib/preferences";
import type { Account } from "./lib/types";
import { PLATFORM_LABELS, type Platform } from "./lib/constants";
import { getPlatformIcon } from "./lib/utils";
import { useWorkspace } from "./lib/useWorkspace";
import { ApiKeyRequiredView } from "./components/api-key-required";

export default function ViewAccountsCommand() {
  const { isLoading: wsLoading, hasApiKey, navigationTitle } = useWorkspace();
  if (wsLoading) return <List isLoading />;
  if (!hasApiKey) return <ApiKeyRequiredView />;
  return <AccountsList navigationTitle={navigationTitle} />;
}

function AccountsList({ navigationTitle }: { navigationTitle?: string }) {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const baseUrl = getBaseUrl();

  useEffect(() => {
    async function load() {
      try {
        const response = await listAccounts();
        setAccounts(response.data);
      } catch (error) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to load accounts",
          message: error instanceof Error ? error.message : "Unknown error",
        });
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, []);

  // Group by platform
  const groupedAccounts = accounts.reduce(
    (groups, account) => {
      const platform = account.platform;
      if (!groups[platform]) groups[platform] = [];
      groups[platform].push(account);
      return groups;
    },
    {} as Record<string, Account[]>,
  );

  return (
    <List
      navigationTitle={navigationTitle}
      isLoading={isLoading}
      searchBarPlaceholder="Search accounts..."
    >
      {Object.entries(groupedAccounts).map(([platform, platformAccounts]) => (
        <List.Section
          key={platform}
          title={PLATFORM_LABELS[platform as Platform] || platform}
          subtitle={`${platformAccounts.length} account${platformAccounts.length !== 1 ? "s" : ""}`}
        >
          {platformAccounts.map((account) => (
            <List.Item
              key={account.id}
              title={account.display_name || account.username}
              subtitle={account.username}
              icon={
                account.profile_picture
                  ? { source: account.profile_picture, mask: Image.Mask.Circle }
                  : getPlatformIcon(platform)
              }
              accessories={[
                {
                  text: account.status,
                  icon:
                    account.status === "active"
                      ? Icon.CheckCircle
                      : Icon.XMarkCircle,
                },
                ...(account.content_types
                  ? [{ text: account.content_types.join(", ") }]
                  : []),
              ]}
              actions={
                <ActionPanel>
                  <Action.OpenInBrowser
                    title="Open in OmniSocials"
                    url={`${baseUrl}/settings`}
                  />
                  <Action.CopyToClipboard
                    title="Copy Account ID"
                    content={account.id}
                    shortcut={{ modifiers: ["cmd"], key: "c" }}
                  />
                  <Action.CopyToClipboard
                    title="Copy Username"
                    content={account.username}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      ))}
      {accounts.length === 0 && !isLoading && (
        <List.EmptyView
          title="No connected accounts"
          description="Connect your social media accounts in OmniSocials"
          icon="icon.png"
        />
      )}
    </List>
  );
}
