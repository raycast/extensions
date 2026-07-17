/**
 * Payment notes and attachments view component.
 */

import {
  Action,
  ActionPanel,
  Alert,
  Color,
  confirmAlert,
  Form,
  Icon,
  List,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useState, useCallback } from "react";
import { withSessionRefresh, type useBunqSession } from "../../hooks/useBunqSession";
import {
  getPaymentNotes,
  addPaymentNote,
  deletePaymentNote,
  getPaymentAttachments,
  type MonetaryAccount,
  type Payment,
  type NoteText,
} from "../../api/endpoints";
import { ErrorView } from "../../components";
import { formatCurrency, formatDate } from "../../lib/formatters";
import { getErrorMessage } from "../../lib/errors";
import { copyToClipboard } from "../../lib/actions";
import { getPaymentCounterparty } from "./account-helpers";

interface AddNoteFormProps {
  accountId: number;
  paymentId: number;
  session: ReturnType<typeof useBunqSession>;
  onNoteAdded: () => void;
}

function AddNoteForm({ accountId, paymentId, session, onNoteAdded }: AddNoteFormProps) {
  const { pop } = useNavigation();
  const [noteContent, setNoteContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!noteContent.trim()) {
      await showToast({ style: Toast.Style.Failure, title: "Note cannot be empty" });
      return;
    }

    setIsSubmitting(true);
    try {
      await showToast({ style: Toast.Style.Animated, title: "Adding note..." });

      await withSessionRefresh(session, () =>
        addPaymentNote(session.userId!, accountId, paymentId, noteContent.trim(), session.getRequestOptions()),
      );

      await showToast({ style: Toast.Style.Success, title: "Note added" });
      onNoteAdded();
      pop();
    } catch (error) {
      await showToast({ style: Toast.Style.Failure, title: "Failed to add note", message: getErrorMessage(error) });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form
      isLoading={isSubmitting}
      navigationTitle="Add Note"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Add Note" icon={Icon.Plus} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="noteContent"
        title="Note"
        placeholder="Enter your note..."
        value={noteContent}
        onChange={setNoteContent}
        enableMarkdown={false}
      />
    </Form>
  );
}

interface PaymentNotesViewProps {
  account: MonetaryAccount;
  payment: Payment;
  session: ReturnType<typeof useBunqSession>;
}

export function PaymentNotesView({ account, payment, session }: PaymentNotesViewProps) {
  const { push } = useNavigation();

  const {
    data: notes,
    isLoading: isLoadingNotes,
    error: notesError,
    revalidate: revalidateNotes,
  } = usePromise(
    async () => {
      if (!session.userId || !session.sessionToken) return [];
      return withSessionRefresh(session, () =>
        getPaymentNotes(session.userId!, account.id, payment.id, session.getRequestOptions()),
      );
    },
    [],
    { execute: session.isConfigured && !session.isLoading },
  );

  const { data: attachments, isLoading: isLoadingAttachments } = usePromise(
    async () => {
      if (!session.userId || !session.sessionToken) return [];
      return withSessionRefresh(session, () =>
        getPaymentAttachments(session.userId!, account.id, payment.id, session.getRequestOptions()),
      );
    },
    [],
    { execute: session.isConfigured && !session.isLoading },
  );

  const handleDeleteNote = useCallback(
    async (note: NoteText) => {
      const confirmed = await confirmAlert({
        title: "Delete Note",
        message: "Are you sure you want to delete this note?",
        primaryAction: {
          title: "Delete",
          style: Alert.ActionStyle.Destructive,
        },
      });

      if (!confirmed) return;

      try {
        await showToast({ style: Toast.Style.Animated, title: "Deleting note..." });

        await withSessionRefresh(session, () =>
          deletePaymentNote(session.userId!, account.id, payment.id, note.id, session.getRequestOptions()),
        );

        await showToast({ style: Toast.Style.Success, title: "Note deleted" });
        revalidateNotes();
      } catch (error) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to delete note",
          message: getErrorMessage(error),
        });
      }
    },
    [session, account.id, payment.id, revalidateNotes],
  );

  const isLoading = isLoadingNotes || isLoadingAttachments;
  const counterparty = getPaymentCounterparty(payment);
  const amount = formatCurrency(payment.amount.value, payment.amount.currency);

  if (notesError) {
    return (
      <ErrorView
        title="Error Loading Notes"
        message={getErrorMessage(notesError)}
        onRetry={revalidateNotes}
        onRefreshSession={session.refresh}
      />
    );
  }

  return (
    <List isLoading={isLoading} navigationTitle={`Notes - ${counterparty}`}>
      <List.Section title={`Payment: ${counterparty} (${amount})`}>
        <List.Item
          title="Add New Note"
          icon={{ source: Icon.Plus, tintColor: Color.Blue }}
          actions={
            <ActionPanel>
              <Action
                title="Add Note"
                icon={Icon.Plus}
                onAction={() =>
                  push(
                    <AddNoteForm
                      accountId={account.id}
                      paymentId={payment.id}
                      session={session}
                      onNoteAdded={revalidateNotes}
                    />,
                  )
                }
              />
            </ActionPanel>
          }
        />
      </List.Section>

      {notes && notes.length > 0 && (
        <List.Section title={`Notes (${notes.length})`}>
          {notes.map((note) => (
            <List.Item
              key={note.id}
              title={note.content || "Empty note"}
              subtitle={note.created ? formatDate(note.created) : ""}
              icon={Icon.Document}
              actions={
                <ActionPanel>
                  <Action
                    title="Copy Note"
                    icon={Icon.Clipboard}
                    onAction={() => copyToClipboard(note.content || "", "note")}
                  />
                  <Action
                    title="Delete Note"
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "backspace" }}
                    onAction={() => handleDeleteNote(note)}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}

      {attachments && attachments.length > 0 && (
        <List.Section title={`Attachments (${attachments.length})`}>
          {attachments.map((attachment) => (
            <List.Item
              key={attachment.id}
              title={attachment.description || attachment.attachment?.attachment?.description || "Attachment"}
              subtitle={attachment.created ? formatDate(attachment.created) : ""}
              icon={Icon.Paperclip}
              accessories={[{ text: "View in bunq app", icon: Icon.Link }]}
              actions={
                <ActionPanel>
                  <Action.OpenInBrowser title="Open Bunq App" url="https://bunq.com/app" />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}

      {(!notes || notes.length === 0) && (!attachments || attachments.length === 0) && !isLoading && (
        <List.EmptyView
          icon={Icon.Document}
          title="No Notes or Attachments"
          description="Add a note to this payment"
          actions={
            <ActionPanel>
              <Action
                title="Add Note"
                icon={Icon.Plus}
                onAction={() =>
                  push(
                    <AddNoteForm
                      accountId={account.id}
                      paymentId={payment.id}
                      session={session}
                      onNoteAdded={revalidateNotes}
                    />,
                  )
                }
              />
            </ActionPanel>
          }
        />
      )}
    </List>
  );
}
