import { Action, ActionPanel, Color, Icon, Image, Keyboard, List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { CreatePostForm } from "./components/create-post-form";
import { api } from "./lib/api";
import { APP_URL } from "./lib/client";
import { showApiError } from "./lib/feedback";
import { canPostText, PLATFORM_LABELS } from "./lib/format";
import { SocialAccount } from "./lib/types";

const CONNECTORS_URL = `${APP_URL}/connectors`;
const COMPOSER_URL = `${APP_URL}/create-post`;

function accountAccessories(account: SocialAccount): List.Item.Accessory[] {
  const platform = { tag: PLATFORM_LABELS[account.platform] };
  if (account.status === "active") return [platform];
  return [
    { tag: { value: "Reconnect", color: Color.Red }, tooltip: account.unauthorizedReason ?? "Access has expired" },
    platform,
  ];
}

export default function Command() {
  const { data, isLoading, revalidate } = useCachedPromise(() => api().listAccounts(), [], {
    onError: (error) => showApiError("Could Not Load Accounts", error),
  });
  const accounts = data?.accounts ?? [];

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search connected accounts">
      <List.EmptyView
        icon={Icon.PersonCircle}
        title="No Accounts Found"
        description="Connect a social account in AdaptlyPost."
        actions={
          <ActionPanel>
            <Action.OpenInBrowser title="Connect Account" url={CONNECTORS_URL} />
          </ActionPanel>
        }
      />
      {accounts.map((account) => (
        <List.Item
          key={account.id}
          title={account.displayName}
          subtitle={account.username}
          keywords={[account.username, PLATFORM_LABELS[account.platform]]}
          icon={account.avatarUrl ? { source: account.avatarUrl, mask: Image.Mask.Circle } : Icon.Person}
          accessories={accountAccessories(account)}
          actions={
            <ActionPanel>
              {account.status !== "active" && <Action.OpenInBrowser title="Reconnect Account" url={CONNECTORS_URL} />}
              {account.status === "active" && canPostText(account) && (
                <Action.Push
                  title="Create Post"
                  icon={Icon.Pencil}
                  target={<CreatePostForm initialAccountIds={[account.id]} popAfterCreate />}
                />
              )}
              {account.status === "active" && !canPostText(account) && (
                <Action.OpenInBrowser title="Open Composer" url={COMPOSER_URL} />
              )}
              <Action.OpenInBrowser title="Open Connectors" url={CONNECTORS_URL} />
              <Action.CopyToClipboard title="Copy Username" content={account.username} />
              <Action.CopyToClipboard title="Copy Account ID" content={account.id} />
              <Action
                title="Refresh"
                icon={Icon.ArrowClockwise}
                shortcut={Keyboard.Shortcut.Common.Refresh}
                onAction={revalidate}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
