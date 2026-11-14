import { Action, ActionPanel, Color, Icon, Keyboard, List } from "@raycast/api";
import { showFailureToast, useCachedPromise } from "@raycast/utils";
import { accountLabel, connectedAccounts, getProfiles, platformName, urls } from "./api";

export default function Command() {
  const { data, isLoading, revalidate } = useCachedPromise(getProfiles, [], {
    onError: (error) => {
      showFailureToast(error, { title: "Could not load profiles" });
    },
  });
  const profiles = data?.profiles ?? [];

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search profiles and accounts">
      <List.EmptyView
        icon={Icon.PersonCircle}
        title="No Profiles"
        description="Create a profile and connect your social accounts in Upload-Post."
        actions={
          <ActionPanel>
            <Action.OpenInBrowser title="Manage Profiles" url={urls.manageProfiles} />
          </ActionPanel>
        }
      />
      {profiles.map((profile) => {
        const accounts = connectedAccounts(profile);
        return (
          <List.Section
            key={profile.username}
            title={profile.username}
            subtitle={`${accounts.length} connected account${accounts.length === 1 ? "" : "s"}`}
          >
            {accounts.length === 0 && (
              <List.Item
                icon={Icon.Plug}
                title="No connected accounts"
                keywords={[profile.username]}
                actions={
                  <ActionPanel>
                    <Action.OpenInBrowser title="Connect Accounts" url={urls.manageProfiles} />
                  </ActionPanel>
                }
              />
            )}
            {accounts.map(({ platform, account, reauthRequired }) => (
              <List.Item
                key={`${profile.username}-${platform}`}
                icon={account?.social_images ? { source: account.social_images, fallback: Icon.Person } : Icon.Globe}
                title={platformName(platform)}
                subtitle={accountLabel(account)}
                keywords={[profile.username, platform, account?.display_name ?? "", account?.handle ?? ""]}
                accessories={
                  platform === "reddit"
                    ? [{ tag: { value: "Unavailable", color: Color.SecondaryText } }]
                    : reauthRequired
                      ? [{ tag: { value: "Reconnect Needed", color: Color.Orange } }]
                      : [{ icon: { source: Icon.CheckCircle, tintColor: Color.Green }, tooltip: "Connected" }]
                }
                actions={
                  <ActionPanel>
                    <Action.OpenInBrowser
                      title={reauthRequired ? "Reconnect Account" : "Manage Profile"}
                      url={urls.manageProfiles}
                    />
                    <Action.CopyToClipboard title="Copy Profile Username" content={profile.username} />
                    {account?.username && <Action.CopyToClipboard title="Copy Account ID" content={account.username} />}
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
          </List.Section>
        );
      })}
    </List>
  );
}
