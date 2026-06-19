/**
 * Receive command for requesting money and creating bunq.me payment links.
 */

import { Action, ActionPanel, List, Icon, Color, useNavigation } from "@raycast/api";
import { useBunqSession, withSessionRefresh } from "./hooks/useBunqSession";
import { useAccounts } from "./hooks/useAccounts";
import { getRequestInquiries, getBunqMeTabs, getRequestResponses } from "./api/endpoints";
import { usePromise } from "@raycast/utils";
import { useState } from "react";
import { ErrorView, AccountListDropdown } from "./components";
import { getErrorMessage } from "./lib/errors";
import { RequestMoneyForm, CreateBunqMeForm, RequestItem, BunqMeItem, IncomingRequestItem } from "./components/receive";
import { requireUserId } from "./lib/session-guard";

// ============== Main Command ==============

export default function ReceiveCommand() {
  const session = useBunqSession();
  const { push } = useNavigation();
  const { accounts, isLoading: accountsLoading } = useAccounts(session);
  const [selectedAccountId, setSelectedAccountId] = useState<string | undefined>();

  const {
    data: requests,
    isLoading: requestsLoading,
    error: requestsError,
    revalidate: revalidateRequests,
  } = usePromise(
    async (accountId: string | undefined) => {
      if (!session.userId || !session.sessionToken || !accountId) return [];
      const userId = requireUserId(session);
      return withSessionRefresh(session, () =>
        getRequestInquiries(userId, parseInt(accountId, 10), session.getRequestOptions()),
      );
    },
    [selectedAccountId],
    { execute: session.isConfigured && !session.isLoading && !!selectedAccountId },
  );

  const {
    data: incomingRequests,
    isLoading: incomingLoading,
    error: incomingError,
    revalidate: revalidateIncoming,
  } = usePromise(
    async (accountId: string | undefined) => {
      if (!session.userId || !session.sessionToken || !accountId) return [];
      const userId = requireUserId(session);
      return withSessionRefresh(session, () =>
        getRequestResponses(userId, parseInt(accountId, 10), session.getRequestOptions()),
      );
    },
    [selectedAccountId],
    { execute: session.isConfigured && !session.isLoading && !!selectedAccountId },
  );

  const {
    data: bunqmeTabs,
    isLoading: tabsLoading,
    error: tabsError,
    revalidate: revalidateTabs,
  } = usePromise(
    async (accountId: string | undefined) => {
      if (!session.userId || !session.sessionToken || !accountId) return [];
      const userId = requireUserId(session);
      return withSessionRefresh(session, () =>
        getBunqMeTabs(userId, parseInt(accountId, 10), session.getRequestOptions()),
      );
    },
    [selectedAccountId],
    { execute: session.isConfigured && !session.isLoading && !!selectedAccountId },
  );

  const revalidate = () => {
    revalidateRequests();
    revalidateIncoming();
    revalidateTabs();
  };

  if (session.isLoading) {
    return <List isLoading />;
  }

  if (session.error || requestsError || tabsError || incomingError) {
    // Aggregate multiple errors into a single message
    const errors = [session.error, requestsError, tabsError, incomingError].filter(Boolean);
    const errorMessage =
      errors.length > 1
        ? `Multiple errors occurred: ${errors.map((e) => getErrorMessage(e)).join("; ")}`
        : getErrorMessage(errors[0]);
    return <ErrorView title="Error" message={errorMessage} onRetry={revalidate} onRefreshSession={session.refresh} />;
  }

  const pendingRequests = requests?.filter((r) => r.status === "PENDING") || [];
  const pendingIncoming = incomingRequests?.filter((r) => r.status === "PENDING") || [];
  const activeBunqMe = bunqmeTabs?.filter((t) => t.status === "WAITING_FOR_PAYMENT") || [];

  return (
    <List
      isLoading={accountsLoading || requestsLoading || tabsLoading || incomingLoading}
      searchBarAccessory={
        <AccountListDropdown value={selectedAccountId} onChange={setSelectedAccountId} accounts={accounts} />
      }
    >
      <List.Section title="Quick Actions">
        <List.Item
          title="Request Money"
          icon={{ source: Icon.Envelope, tintColor: Color.Orange }}
          subtitle="Ask someone to pay you"
          actions={
            <ActionPanel>
              <Action
                title="Request Money"
                icon={Icon.Envelope}
                onAction={() => push(<RequestMoneyForm session={session} accounts={accounts} />)}
              />
            </ActionPanel>
          }
        />
        <List.Item
          title="Create bunq.me Link"
          icon={{ source: Icon.Link, tintColor: Color.Purple }}
          subtitle="Share a payment link"
          actions={
            <ActionPanel>
              <Action
                title="Create Link"
                icon={Icon.Link}
                onAction={() => push(<CreateBunqMeForm session={session} accounts={accounts} />)}
              />
            </ActionPanel>
          }
        />
      </List.Section>

      {selectedAccountId && (incomingRequests?.length ?? 0) > 0 && (
        <List.Section title={`Incoming Requests (${pendingIncoming.length} pending)`}>
          {incomingRequests?.map((request) => (
            <IncomingRequestItem
              key={request.id}
              request={request}
              userId={session.userId!}
              accountId={parseInt(selectedAccountId, 10)}
              session={session}
              onUpdate={revalidate}
            />
          ))}
        </List.Section>
      )}

      {selectedAccountId && (requests?.length ?? 0) > 0 && (
        <List.Section title={`Outgoing Requests (${pendingRequests.length} pending)`}>
          {requests?.map((request) => (
            <RequestItem key={request.id} request={request} />
          ))}
        </List.Section>
      )}

      {selectedAccountId && (bunqmeTabs?.length ?? 0) > 0 && (
        <List.Section title={`bunq.me Links (${activeBunqMe.length} active)`}>
          {bunqmeTabs?.map((tab) => (
            <BunqMeItem key={tab.id} tab={tab} />
          ))}
        </List.Section>
      )}
    </List>
  );
}
