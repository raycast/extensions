import { closeMainWindow, Form, getPreferenceValues, showHUD, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
import { createReminder } from "swift:../swift/AppleReminders";

import { CreateReminderForm, NewReminder } from "./create-reminder";
import { getSelectedEmail, SelectedEmail } from "./helpers/mail";
import { useData } from "./hooks/useData";
import usePostCreateActions from "./hooks/usePostCreateActions";
import { formatDueDate, parseDueDate } from "./parse-due-date";
import { runPostCreateActions } from "./post-create-shortcuts";

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
            setIsLoadingEmail(false);
            return;
          }

          let listId: string | undefined;
          const targetDefaultName = preferences.defaultListName?.trim().toLowerCase();
          if (targetDefaultName && data?.lists) {
            const matched = data.lists.find((l) => l.title.trim().toLowerCase() === targetDefaultName);
            if (matched) {
              listId = matched.id;
            }
          }
          if (!listId && data?.lists) {
            const defaultList = data.lists.find((l) => l.isDefault);
            if (defaultList) {
              listId = defaultList.id;
            }
          }

          let dueDate: string | undefined;
          if (preferences.defaultDueDate?.trim()) {
            const parsedDue = parseDueDate(preferences.defaultDueDate.trim());
            if (parsedDue) {
              dueDate = formatDueDate(parsedDue);
            }
          }

          const reminderTitle =
            selectedEmail.subject || (selectedEmail.sender ? `Email from ${selectedEmail.sender}` : "Email Reminder");
          const reminderNotes = selectedEmail.sender
            ? `From: ${selectedEmail.sender}\n\nOpen Mail: ${selectedEmail.url}`
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

  if (isLoadingEmail || isLoadingData || isLoadingPostCreateActions) {
    return <Form isLoading={true} />;
  }

  const defaultDueDate = preferences.defaultDueDate?.trim()
    ? parseDueDate(preferences.defaultDueDate.trim())?.date
    : undefined;

  const initialTitle = email ? email.subject || (email.sender ? `Email from ${email.sender}` : "Email Reminder") : "";
  const initialNotes = email
    ? email.sender
      ? `From: ${email.sender}\n\nOpen Mail: ${email.url}`
      : `Open Mail: ${email.url}`
    : "";

  return (
    <CreateReminderForm
      key={email ? `email-${email.messageId}` : "empty-email-form"}
      draftValues={{
        title: initialTitle,
        url: email?.url ?? "",
        notes: initialNotes,
        dueDate: defaultDueDate,
      }}
    />
  );
}
