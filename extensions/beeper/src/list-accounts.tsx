import { Action, ActionPanel, Icon, List, Toast, getPreferenceValues, showToast } from "@raycast/api";
import { useCachedPromise, withAccessToken } from "@raycast/utils";
import { createBeeperOAuth, listAccounts } from "./api";
import { MOCK_ACCOUNTS } from "./utils/mock-data";
import { BeeperAccount } from "./utils/types";
import { getAccountServiceInfoList } from "./utils/account-service-cache";

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

      const rawAccounts = await listAccounts();
      const accountInfo = getAccountServiceInfoList(rawAccounts);

      const transformedAccounts: BeeperAccount[] = accountInfo.map((account) => ({
        id: account.accountID,
        service: account.serviceLabel,
        displayName: account.accountDisplayName,
        isConnected: true,
        username: account.username,
      }));

      return transformedAccounts.sort((a, b) => a.service.localeCompare(b.service));
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
        <List.Section title="Connected" subtitle={`${accounts.length} service${accounts.length !== 1 ? "s" : ""}`}>
          {accounts.map((account) => (
            <List.Item
              key={account.id}
              title={account.displayName}
              subtitle={account.username || account.service}
              icon={Icon.Person}
              actions={
                <ActionPanel>
                  <Action.CopyToClipboard content={account.displayName} title="Copy Account Name" />
                  <Action.CopyToClipboard content={account.id} title="Copy Account ID" />
                  <Action
                    title="Refresh Accounts"
                    icon={Icon.ArrowClockwise}
                    shortcut={{ modifiers: ["cmd"], key: "r" }}
                    onAction={revalidate}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}
    </List>
  );
}

export default withAccessToken(createBeeperOAuth())(ListAccountsCommand);
