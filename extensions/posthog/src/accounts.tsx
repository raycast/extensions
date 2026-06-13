import { Action, ActionPanel, Alert, Icon, List, Toast, confirmAlert, showToast } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { accountLabel, PostHogAccount } from "../helpers/account-model";
import { getAccounts, removeAccount } from "../helpers/accounts";
import { ConnectAccountActions } from "../helpers/ConnectAccountActions";
import { connectPostHogAccount, removeTokensForAccount } from "../helpers/posthog-auth";

type AccountState = {
  accounts: PostHogAccount[];
};

export default function Command() {
  const { data, isLoading, revalidate } = usePromise(loadAccountState);

  const connectAccount = async () => {
    await showToast({ style: Toast.Style.Animated, title: "Connecting PostHog" });

    try {
      const account = await connectPostHogAccount();
      await showToast({
        style: Toast.Style.Success,
        title: "Connected PostHog account",
        message: account.email ?? account.region.toUpperCase(),
      });
      revalidate();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Could not connect PostHog account",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  };

  const remove = async (account: PostHogAccount) => {
    const confirmed = await confirmAlert({
      title: `Remove ${accountLabel(account)}?`,
      message: "This removes the account from the extension and clears its stored OAuth tokens.",
      primaryAction: {
        title: "Remove Account",
        style: Alert.ActionStyle.Destructive,
      },
    });

    if (!confirmed) {
      return;
    }

    const removedAccount = await removeAccount(account.id);

    if (removedAccount) {
      await removeTokensForAccount(removedAccount);
    }

    await showToast({ style: Toast.Style.Success, title: "Removed PostHog account" });
    revalidate();
  };

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search connected accounts...">
      {data?.accounts.length ? (
        <List.Section title="Accounts">
          {data.accounts.map((account) => (
            <List.Item
              key={account.id}
              icon={Icon.Person}
              title={accountLabel(account)}
              subtitle={account.baseUrl}
              accessories={[{ text: account.region.toUpperCase() }]}
              actions={<AccountActions account={account} onConnect={connectAccount} onRemove={remove} />}
            />
          ))}
        </List.Section>
      ) : (
        <List.EmptyView
          icon={Icon.Person}
          title="Connect a PostHog account"
          description="Use OAuth to add your first PostHog account."
          actions={<ConnectAccountActions onConnect={connectAccount} />}
        />
      )}
    </List>
  );
}

function AccountActions({
  account,
  onConnect,
  onRemove,
}: {
  account: PostHogAccount;
  onConnect: () => void;
  onRemove: (account: PostHogAccount) => void;
}) {
  return (
    <ActionPanel>
      <ActionPanel.Section title="Connect">
        <Action
          icon={Icon.Link}
          title="Connect Account"
          onAction={onConnect}
          shortcut={{ modifiers: ["cmd"], key: "n" }}
        />
      </ActionPanel.Section>
      <ActionPanel.Section>
        <Action
          icon={Icon.Trash}
          title="Remove Account"
          style={Action.Style.Destructive}
          onAction={() => onRemove(account)}
        />
      </ActionPanel.Section>
    </ActionPanel>
  );
}

async function loadAccountState(): Promise<AccountState> {
  const accounts = await getAccounts();

  return { accounts };
}
