import { closeMainWindow, Form, getPreferenceValues, showHUD, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
import { createReminder } from "swift:../swift/AppleReminders";

import { CreateReminderForm, NewReminder } from "./create-reminder";
import { getSelectedEmail, getSenderDisplayName, SelectedEmail } from "./helpers/mail";
import { useData } from "./hooks/useData";
import usePostCreateActions from "./hooks/usePostCreateActions";
import { formatDueDate, parseDueDate } from "./parse-due-date";
import { runPostCreateActions } from "./post-create-shortcuts";

function getResolvedListId(
  defaultListName?: string,
  lists?: { id: string; title: string; isDefault: boolean }[],
): string | undefined {
  if (!lists) return undefined;
  const targetDefaultName = defaultListName?.trim().toLowerCase();
  if (targetDefaultName) {
    const matched = lists.find((l) => l.title.trim().toLowerCase() === targetDefaultName);
    if (matched) {
      return matched.id;
    }
  }
  const defaultList = lists.find((l) => l.isDefault);
  return defaultList?.id;
}

export default function Command() {
  const preferences = getPreferenceValues<Preferences.CreateReminderFromSelectedEmail>();
  const { data, isLoading: isLoadingData } = useData();
  const { value: postCreateActions, isLoading: isLoadingPostCreateActions } = usePostCreateActions();

  const [email, setEmail] = useState<SelectedEmail | null>(null);
  const [isLoadingEmail, setIsLoadingEmail] = useState(true);

  useEffect(() => {
    async function init() {
      try {
        const selectedEmail = await getSelectedEmail();

        if (preferences.createImmediately) {
          if (!selectedEmail) {
            await showToast({
              style: Toast.Style.Failure,
              title: "No selected email found in Apple Mail",
              message: "Make sure Apple Mail is open with an email selected.",
            });
            await closeMainWindow();
            return;
          }

          const listId = getResolvedListId(preferences.defaultListName, data?.lists);

          let dueDate: string | undefined;
          if (preferences.defaultDueDate?.trim()) {
            const parsedDue = parseDueDate(preferences.defaultDueDate.trim());
            if (parsedDue) {
              dueDate = formatDueDate(parsedDue);
            }
          }

          const senderName = getSenderDisplayName(selectedEmail.sender);
          const reminderTitle = selectedEmail.subject || (senderName ? `Email from ${senderName}` : "Email Reminder");
          const reminderNotes = senderName
            ? `From: ${senderName}\n\nOpen Mail: ${selectedEmail.url}`
            : `Open Mail: ${selectedEmail.url}`;

          const payload: NewReminder = {
            title: reminderTitle,
            url: selectedEmail.url,
            notes: reminderNotes,
            listId,
            dueDate,
          };

          await createReminder(payload);
          await runPostCreateActions(postCreateActions, "create-form");
          await showHUD(`Reminder Created: ${reminderTitle}`);
          await closeMainWindow();
          return;
        }

        if (selectedEmail) {
          setEmail(selectedEmail);
        } else {
          await showToast({
            style: Toast.Style.Failure,
            title: "No selected email found in Apple Mail",
            message: "Make sure Apple Mail is running with an email selected.",
          });
        }
      } catch (error) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to get selected email",
          message: error instanceof Error ? error.message : String(error),
        });
      } finally {
        setIsLoadingEmail(false);
      }
    }

    if (!isLoadingData && !isLoadingPostCreateActions) {
      init();
    }
  }, [isLoadingData, isLoadingPostCreateActions]);

  if (preferences.createImmediately) {
    return null;
  }

  if (isLoadingEmail || isLoadingData || isLoadingPostCreateActions) {
    return <Form isLoading={true} />;
  }

  const defaultDueDate = preferences.defaultDueDate?.trim()
    ? parseDueDate(preferences.defaultDueDate.trim())?.date
    : undefined;

  const resolvedListId = getResolvedListId(preferences.defaultListName, data?.lists);

  const senderDisplayName = getSenderDisplayName(email?.sender);
  const initialTitle = email
    ? email.subject || (senderDisplayName ? `Email from ${senderDisplayName}` : "Email Reminder")
    : "";
  const initialNotes = email
    ? senderDisplayName
      ? `From: ${senderDisplayName}\n\nOpen Mail: ${email.url}`
      : `Open Mail: ${email.url}`
    : "";

  return (
    <CreateReminderForm
      key={email ? `email-${email.messageId}` : "empty-email-form"}
      listId={resolvedListId}
      draftValues={{
        title: initialTitle,
        url: email?.url ?? "",
        notes: initialNotes,
        dueDate: defaultDueDate,
        listId: resolvedListId,
      }}
    />
  );
}
