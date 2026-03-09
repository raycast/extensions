import { Action, ActionPanel, Color, Icon, List, Toast, getPreferenceValues, showToast } from "@raycast/api";
import { useCachedPromise, withAccessToken } from "@raycast/utils";
import { createBeeperOAuth } from "./api";
import { getBeeperClient, checkBeeperConnection } from "./services/beeper-client";
import { MOCK_ACCOUNTS } from "./utils/mock-data";
import { getServiceDisplayName, getServiceIcon } from "./utils/service-icons";
import { BeeperAccount, parseService } from "./utils/types";

function ListAccountsCommand() {
  const {
    data: accounts,
    isLoading,
    error,
    revalidate,
  } = useCachedPromise(
    async () => {
      const { useMockData } = getPreferenceValues<Preferences>();
      if (useMockData) {
        return MOCK_ACCOUNTS;
      }

      const connectionStatus = await checkBeeperConnection();
      if (!connectionStatus.connected) {
        throw new Error(connectionStatus.error || "Cannot connect to Beeper Desktop");
      }

      const client = await getBeeperClient();
      const response = await client.accounts.list();

      const transformedAccounts: BeeperAccount[] = (response || []).map((account) => ({
        id: account.accountID,
        service: parseService(account.network),
        displayName: account.user?.fullName || account.network || "Unknown",
        isConnected: true,
        username: account.user?.username,
      }));

      return transformedAccounts.sort((a, b) =>
        getServiceDisplayName(a.service).localeCompare(getServiceDisplayName(b.service)),
      );
    },
    [],
    {
      keepPreviousData: true,
      onError: (err) => {
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to load accounts",
          message: err.message,
        });
      },
    },
  );

  const connectedCount = accounts?.filter((a) => a.isConnected).length || 0;
  const disconnectedCount = accounts?.filter((a) => !a.isConnected).length || 0;

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Filter connected accounts...">
      {error ? (
        <List.EmptyView
          icon={Icon.ExclamationMark}
          title="Cannot connect to Beeper"
          description={error.message}
          actions={
            <ActionPanel>
              <Action title="Retry" icon={Icon.ArrowClockwise} onAction={revalidate} />
            </ActionPanel>
          }
        />
      ) : !accounts || accounts.length === 0 ? (
        <List.EmptyView
          icon={Icon.Person}
          title="No accounts connected"
          description="Connect messaging services in Beeper Desktop to see them here"
        />
      ) : (
        <>
          {connectedCount > 0 && (
            <List.Section title="Connected" subtitle={`${connectedCount} service${connectedCount !== 1 ? "s" : ""}`}>
              {accounts
                .filter((a) => a.isConnected)
                .map((account) => (
                  <AccountListItem key={account.id} account={account} onRefresh={revalidate} />
                ))}
            </List.Section>
          )}
          {disconnectedCount > 0 && (
            <List.Section
              title="Disconnected"
              subtitle={`${disconnectedCount} service${disconnectedCount !== 1 ? "s" : ""}`}
            >
              {accounts
                .filter((a) => !a.isConnected)
                .map((account) => (
                  <AccountListItem key={account.id} account={account} onRefresh={revalidate} />
                ))}
            </List.Section>
          )}
        </>
      )}
    </List>
  );
}

interface AccountListItemProps {
  account: BeeperAccount;
  onRefresh?: () => void;
}

function AccountListItem({ account, onRefresh }: AccountListItemProps) {
  const serviceInfo = getServiceIcon(account.service);

  return (
    <List.Item
      id={account.id}
      title={getServiceDisplayName(account.service)}
      subtitle={account.username || account.displayName}
      icon={{ source: serviceInfo.icon as Icon, tintColor: serviceInfo.tintColor }}
      accessories={[
        {
          tag: {
            value: account.isConnected ? "Connected" : "Disconnected",
            color: account.isConnected ? Color.Green : Color.Red,
          },
        },
      ]}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.CopyToClipboard content={account.displayName} title="Copy Account Name" />
            <Action.CopyToClipboard content={account.id} title="Copy Account ID" />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action
              title="Refresh Accounts"
              icon={Icon.ArrowClockwise}
              shortcut={{ modifiers: ["cmd"], key: "r" }}
              onAction={onRefresh}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

export default withAccessToken(createBeeperOAuth())(ListAccountsCommand);
