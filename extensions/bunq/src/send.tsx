/**
 * Send command for making payments and managing scheduled transfers.
 */

import { Action, ActionPanel, List, Icon, Color, useNavigation } from "@raycast/api";
import { useBunqSession, withSessionRefresh } from "./hooks/useBunqSession";
import { useAccounts } from "./hooks/useAccounts";
import { getScheduledPayments, getDraftPayments } from "./api/endpoints";
import { usePromise } from "@raycast/utils";
import { useState } from "react";
import { ErrorView, AccountListDropdown } from "./components";
import { getErrorMessage } from "./lib/errors";
import {
  PaymentForm,
  SchedulePaymentForm,
  DraftPaymentForm,
  BatchPaymentForm,
  DraftPaymentItem,
  ScheduledPaymentItem,
} from "./components/send";

// ============== Main Command ==============

export default function SendCommand() {
  const session = useBunqSession();
  const { push } = useNavigation();
  const { accounts, isLoading: accountsLoading } = useAccounts(session);
  const [selectedAccountId, setSelectedAccountId] = useState<string | undefined>();

  const {
    data: scheduledPayments,
    isLoading: paymentsLoading,
    error: paymentsError,
    revalidate: revalidateScheduled,
  } = usePromise(
    async (accountId: string | undefined) => {
      if (!session.userId || !session.sessionToken || !accountId) return [];
      return withSessionRefresh(session, () =>
        getScheduledPayments(session.userId!, parseInt(accountId, 10), session.getRequestOptions()),
      );
    },
    [selectedAccountId],
    { execute: session.isConfigured && !session.isLoading && !!selectedAccountId },
  );

  const {
    data: draftPayments,
    isLoading: draftsLoading,
    error: draftsError,
    revalidate: revalidateDrafts,
  } = usePromise(
    async (accountId: string | undefined) => {
      if (!session.userId || !session.sessionToken || !accountId) return [];
      return withSessionRefresh(session, () =>
        getDraftPayments(session.userId!, parseInt(accountId, 10), session.getRequestOptions()),
      );
    },
    [selectedAccountId],
    { execute: session.isConfigured && !session.isLoading && !!selectedAccountId },
  );

  const revalidate = () => {
    revalidateScheduled();
    revalidateDrafts();
  };

  if (session.isLoading) {
    return <List isLoading />;
  }

  if (session.error || paymentsError || draftsError) {
    return (
      <ErrorView
        title="Error"
        message={getErrorMessage(session.error || paymentsError || draftsError)}
        onRetry={revalidate}
        onRefreshSession={session.refresh}
      />
    );
  }

  const activePayments = scheduledPayments?.filter((p) => p.status === "ACTIVE") || [];
  const pendingDrafts = draftPayments?.filter((d) => d.status === "PENDING") || [];

  return (
    <List
      isLoading={accountsLoading || paymentsLoading || draftsLoading}
      searchBarAccessory={
        <AccountListDropdown value={selectedAccountId} onChange={setSelectedAccountId} accounts={accounts} />
      }
    >
      <List.Section title="Quick Actions">
        <List.Item
          title="Send Payment"
          icon={{ source: Icon.BankNote, tintColor: Color.Green }}
          actions={
            <ActionPanel>
              <Action
                title="Send Payment"
                icon={Icon.BankNote}
                onAction={() => push(<PaymentForm session={session} accounts={accounts} />)}
              />
            </ActionPanel>
          }
        />
        <List.Item
          title="Schedule Recurring Payment"
          icon={{ source: Icon.Calendar, tintColor: Color.Blue }}
          actions={
            <ActionPanel>
              <Action
                title="Schedule Payment"
                icon={Icon.Calendar}
                onAction={() => push(<SchedulePaymentForm session={session} accounts={accounts} />)}
              />
            </ActionPanel>
          }
        />
        <List.Item
          title="Create Draft Payment"
          subtitle="Requires approval"
          icon={{ source: Icon.Document, tintColor: Color.Orange }}
          actions={
            <ActionPanel>
              <Action
                title="Create Draft"
                icon={Icon.Document}
                onAction={() => push(<DraftPaymentForm session={session} accounts={accounts} />)}
              />
            </ActionPanel>
          }
        />
        <List.Item
          title="Batch Payment"
          subtitle="Multiple payments at once"
          icon={{ source: Icon.List, tintColor: Color.Purple }}
          actions={
            <ActionPanel>
              <Action
                title="Create Batch"
                icon={Icon.List}
                onAction={() => push(<BatchPaymentForm session={session} accounts={accounts} />)}
              />
            </ActionPanel>
          }
        />
      </List.Section>

      {selectedAccountId && (scheduledPayments?.length ?? 0) > 0 && (
        <List.Section title={`Scheduled Payments (${activePayments.length} active)`}>
          {scheduledPayments?.map((payment) => (
            <ScheduledPaymentItem
              key={payment.id}
              payment={payment}
              userId={session.userId!}
              accountId={parseInt(selectedAccountId, 10)}
              session={session}
              onUpdate={revalidate}
            />
          ))}
        </List.Section>
      )}

      {selectedAccountId && (draftPayments?.length ?? 0) > 0 && (
        <List.Section title={`Draft Payments (${pendingDrafts.length} pending)`}>
          {draftPayments?.map((draft) => (
            <DraftPaymentItem key={draft.id} draft={draft} />
          ))}
        </List.Section>
      )}
    </List>
  );
}
