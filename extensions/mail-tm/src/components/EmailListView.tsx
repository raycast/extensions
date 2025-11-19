import { ActionPanel, Action, List, showToast, Toast, Icon, Alert, confirmAlert, useNavigation } from "@raycast/api";
import { useState, useEffect } from "react";
import { deleteEmailFromAPI } from "../api";
import { getEmails, deleteEmail, clearExpiredEmails } from "../storage";
import { TempEmail } from "../types";
import { formatExpiryDate } from "../utils/formatters";
import { MailboxView } from "./MailboxView";
import { TOAST_MESSAGES, ERROR_MESSAGES, UI_STRINGS } from "../constants";

export function EmailListView() {
  const [emails, setEmails] = useState<TempEmail[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { push } = useNavigation();

  async function loadEmails() {
    setIsLoading(true);
    await clearExpiredEmails();
    const savedEmails = await getEmails();
    setEmails(savedEmails);
    setIsLoading(false);
  }

  useEffect(() => {
    loadEmails();
  }, []);

  async function handleDelete(email: TempEmail) {
    const confirmed = await confirmAlert({
      title: UI_STRINGS.DELETE_EMAIL_TITLE,
      message: UI_STRINGS.DELETE_EMAIL_MESSAGE(email.address),
      primaryAction: {
        title: UI_STRINGS.DELETE_ACTION,
        style: Alert.ActionStyle.Destructive,
      },
    });

    if (confirmed) {
      const toast = await showToast({
        style: Toast.Style.Animated,
        title: TOAST_MESSAGES.DELETING,
      });

      try {
        await deleteEmailFromAPI(email.accountId, email.token);
        await deleteEmail(email.id);
        await loadEmails();

        toast.style = Toast.Style.Success;
        toast.title = TOAST_MESSAGES.EMAIL_DELETED;
      } catch (error) {
        console.error(error);
        toast.style = Toast.Style.Failure;
        toast.title = ERROR_MESSAGES.EMAIL_DELETE_FAILED;
        toast.message = error instanceof Error ? error.message : ERROR_MESSAGES.STANDARD_ERROR_MESSAGE;
      }
    }
  }

  return (
    <List isLoading={isLoading}>
      {emails.length === 0 ? (
        <List.EmptyView
          title={UI_STRINGS.NO_SAVED_EMAILS_TITLE}
          description={UI_STRINGS.NO_SAVED_EMAILS_DESCRIPTION}
          icon={Icon.Envelope}
        />
      ) : (
        emails.map((email) => {
          return (
            <List.Item
              key={email.id}
              title={email.address}
              accessories={[{ text: formatExpiryDate(email.expiresAt) }]}
              actions={
                <ActionPanel>
                  <Action
                    title={UI_STRINGS.VIEW_MAILBOX}
                    icon={Icon.Envelope}
                    onAction={() => push(<MailboxView email={email} />)}
                  />
                  <ActionPanel.Section title={UI_STRINGS.COPY_SECTION_TITLE}>
                    <Action.CopyToClipboard
                      title={UI_STRINGS.COPY_EMAIL}
                      content={email.address}
                      shortcut={{ modifiers: ["cmd"], key: "c" }}
                    />
                    <Action.CopyToClipboard
                      title={UI_STRINGS.COPY_PASSWORD}
                      content={email.password}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                      onCopy={async () => {
                        await showToast({
                          style: Toast.Style.Success,
                          title: UI_STRINGS.PASSWORD_COPIED_TITLE,
                          message: UI_STRINGS.PASSWORD_COPIED_MESSAGE,
                        });
                      }}
                    />
                  </ActionPanel.Section>
                  <ActionPanel.Section>
                    <Action
                      title={UI_STRINGS.REFRESH}
                      icon={Icon.ArrowClockwise}
                      onAction={loadEmails}
                      shortcut={{ modifiers: ["cmd"], key: "r" }}
                    />
                    <Action
                      title={UI_STRINGS.DELETE_EMAIL}
                      icon={Icon.Trash}
                      style={Action.Style.Destructive}
                      onAction={() => handleDelete(email)}
                      shortcut={{ modifiers: ["ctrl"], key: "x" }}
                    />
                  </ActionPanel.Section>
                </ActionPanel>
              }
            />
          );
        })
      )}
    </List>
  );
}
