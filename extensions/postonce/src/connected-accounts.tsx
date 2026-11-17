import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";

import { DASHBOARD_URL, listAccounts } from "./api";
import { AccountStatus } from "./types";
import { accountIcon, platformName } from "./utils";

const STATUS_TAGS: Record<AccountStatus, { value: string; color: Color }> = {
  active: { value: "Active", color: Color.Green },
  auth_required: { value: "Reconnect", color: Color.Orange },
  disconnected: { value: "Disconnected", color: Color.Red },
};

export default function Command() {
  const { data: accounts = [], isLoading } = useCachedPromise(listAccounts, [], {
    failureToastOptions: { title: "Could not load your PostOnce accounts" },
  });

  const actions = (
    <ActionPanel>
      <Action.OpenInBrowser title="Manage Accounts in PostOnce" url={`${DASHBOARD_URL}/accounts`} />
    </ActionPanel>
  );

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search accounts">
      <List.EmptyView
        icon={Icon.Person}
        title="No accounts connected"
        description="Connect your social accounts in PostOnce"
        actions={actions}
      />
      {accounts.map((account) => (
        <List.Item
          key={account.id}
          icon={accountIcon(account)}
          title={account.username}
          subtitle={platformName(account.platform)}
          keywords={[account.platform, platformName(account.platform)]}
          accessories={[{ tag: STATUS_TAGS[account.status] || { value: account.status } }]}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser title="Manage Accounts in PostOnce" url={`${DASHBOARD_URL}/accounts`} />
              <Action.CopyToClipboard title="Copy Account ID" content={account.id} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
