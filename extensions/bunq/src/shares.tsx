/**
 * Share Invites command for managing account sharing.
 */

import { Action, ActionPanel, List, Icon, Color, useNavigation } from "@raycast/api";
import { useBunqSession } from "./hooks/useBunqSession";
import { useAccounts } from "./hooks/useAccounts";
import { ErrorView } from "./components";
import { getErrorMessage } from "./lib/errors";
import { CreateShareInviteForm, OutgoingInvitesList, IncomingInvitesList } from "./components/shares";

// ============== Main Component ==============

export default function SharesCommand() {
  const session = useBunqSession();
  const { push } = useNavigation();
  const { accounts, isLoading: accountsLoading, error: accountsError, revalidate } = useAccounts(session);

  if (session.isLoading || accountsLoading) {
    return <List isLoading />;
  }

  if (session.error || accountsError) {
    return (
      <ErrorView
        title="Error Loading Shares"
        message={getErrorMessage(session.error || accountsError)}
        onRetry={revalidate}
        onRefreshSession={session.refresh}
      />
    );
  }

  const activeAccounts = accounts?.filter((a) => a.status === "ACTIVE") || [];

  return (
    <List navigationTitle="Account Sharing">
      <List.Section title="Actions">
        <List.Item
          title="View Outgoing Invites"
          subtitle="Accounts you've shared with others"
          icon={{ source: Icon.ArrowRight, tintColor: Color.Blue }}
          actions={
            <ActionPanel>
              <Action
                title="View Outgoing"
                icon={Icon.ArrowRight}
                onAction={() => push(<OutgoingInvitesList session={session} accounts={activeAccounts} />)}
              />
            </ActionPanel>
          }
        />
        <List.Item
          title="View Incoming Invites"
          subtitle="Accounts others have shared with you"
          icon={{ source: Icon.ArrowLeft, tintColor: Color.Purple }}
          actions={
            <ActionPanel>
              <Action
                title="View Incoming"
                icon={Icon.ArrowLeft}
                onAction={() => push(<IncomingInvitesList session={session} />)}
              />
            </ActionPanel>
          }
        />
      </List.Section>

      <List.Section title="Share an Account">
        {activeAccounts.map((account) => (
          <List.Item
            key={account.id}
            title={account.description}
            subtitle="Share this account"
            icon={{ source: Icon.TwoPeople, tintColor: Color.Green }}
            actions={
              <ActionPanel>
                <Action
                  title="Share Account"
                  icon={Icon.Plus}
                  onAction={() =>
                    push(<CreateShareInviteForm account={account} session={session} onCreated={revalidate} />)
                  }
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
