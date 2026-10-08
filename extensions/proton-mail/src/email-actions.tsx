import {
  Action,
  ActionPanel,
  Alert,
  Clipboard,
  confirmAlert,
  getPreferenceValues,
  Icon,
  open,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { archiveEmail, deleteEmail, fetchEmailBody, setRead } from "./imap-client";
import { emailBodyToMarkdown } from "./email-markdown";
import { AttachmentList } from "./attachment-list";
import { ComposeForm, ComposeMode } from "./compose-form";
import { emailAsMarkdown } from "./email-format";
import { Email } from "./types";

// What an action changed, so the list updates without reloading the pages loaded so far
export type EmailUpdate = { uid: number; read: boolean } | { uid: number; removed: true };

// The folder an email is shown from, shared by the list and the expanded email
export interface EmailContext {
  folder: string;
  deletesPermanently: boolean;
  onUpdate: (update: EmailUpdate) => void;
}

// Bridge exposes Proton's message ID, so open the email itself; other servers fall back to a subject search
function protonMailUrl(email: Email): string {
  if (email.protonId) {
    return `https://mail.proton.me/u/0/almost-all-mail/${email.protonId}`;
  }
  return `https://mail.proton.me/u/0/almost-all-mail#keyword=${encodeURIComponent(email.subject)}`;
}

async function deleteWithFeedback(folder: string, email: Email, permanently: boolean): Promise<boolean> {
  if (permanently) {
    const confirmed = await confirmAlert({
      title: "Delete Permanently",
      message: `"${email.subject}" will be deleted for good. This can't be undone.`,
      primaryAction: { title: "Delete Permanently", style: Alert.ActionStyle.Destructive },
    });
    if (!confirmed) return false;
  }
  try {
    const result = await deleteEmail(folder, email.uid);
    showToast({ style: Toast.Style.Success, title: result === "trashed" ? "Moved to Trash" : "Deleted permanently" });
    return true;
  } catch (error) {
    showToast({ style: Toast.Style.Failure, title: "Failed to delete email", message: String(error) });
    return false;
  }
}

// Reply, Reply All, Forward, Open in Proton Mail and Download Attachments, for both the list and the expanded email
export function RespondActions({ email, folder }: { email: Email; folder: string }) {
  const { push } = useNavigation();

  const compose = async (mode: ComposeMode) => {
    let body = "";
    try {
      const { text, html } = await fetchEmailBody(folder, email.uid);
      body = text || html || "";
    } catch {
      // Write the reply without quoting the email
    }
    push(
      <ComposeForm
        mode={mode}
        originalEmail={{
          subject: email.subject,
          from: email.from[0]?.address || "",
          to: email.to.map((a) => a.address),
          cc: email.cc?.map((a) => a.address) || [],
          date: email.date,
          body,
        }}
      />,
    );
  };

  return (
    <>
      <Action
        title="Reply"
        icon={Icon.Reply}
        onAction={() => compose("reply")}
        shortcut={{ modifiers: ["cmd"], key: "r" }}
      />
      <Action
        title="Reply All"
        icon={Icon.Reply}
        onAction={() => compose("replyAll")}
        shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
      />
      <Action
        title="Forward"
        icon={Icon.ArrowRight}
        onAction={() => compose("forward")}
        shortcut={{ modifiers: ["cmd"], key: "f" }}
      />
      <Action
        title="Open in Proton Mail"
        icon={Icon.Globe}
        onAction={() => open(protonMailUrl(email))}
        shortcut={{ modifiers: ["cmd"], key: "o" }}
      />
      {email.hasAttachment && (
        <Action
          title="Download Attachments"
          icon={Icon.Download}
          onAction={() => push(<AttachmentList folder={folder} emailUid={email.uid} emailSubject={email.subject} />)}
          shortcut={{ modifiers: ["cmd", "shift"], key: "a" }}
        />
      )}
    </>
  );
}

// Mark as Read or Unread, Archive and Delete, for both the list and the expanded email
export function ManageActions({ email, read, context }: { email: Email; read: boolean; context: EmailContext }) {
  const { folder, deletesPermanently, onUpdate } = context;

  const toggleRead = async () => {
    try {
      await setRead(folder, email.uid, !read);
      showToast({ style: Toast.Style.Success, title: read ? "Marked as unread" : "Marked as read" });
      onUpdate({ uid: email.uid, read: !read });
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: read ? "Failed to mark as unread" : "Failed to mark as read",
        message: String(error),
      });
    }
  };

  const archive = async () => {
    try {
      await archiveEmail(folder, email.uid);
      showToast({ style: Toast.Style.Success, title: "Archived" });
      onUpdate({ uid: email.uid, removed: true });
    } catch (error) {
      showToast({ style: Toast.Style.Failure, title: "Failed to archive", message: String(error) });
    }
  };

  const remove = async () => {
    if (await deleteWithFeedback(folder, email, deletesPermanently)) {
      onUpdate({ uid: email.uid, removed: true });
    }
  };

  return (
    <ActionPanel.Section title="Manage">
      <Action
        title={read ? "Mark as Unread" : "Mark as Read"}
        icon={read ? Icon.Circle : Icon.CheckCircle}
        onAction={toggleRead}
        shortcut={{ modifiers: ["cmd", "shift"], key: "u" }}
      />
      <Action title="Archive" icon={Icon.Box} onAction={archive} shortcut={{ modifiers: ["cmd"], key: "e" }} />
      <Action
        title={deletesPermanently ? "Delete Permanently" : "Move to Trash"}
        icon={Icon.Trash}
        style={Action.Style.Destructive}
        onAction={remove}
        shortcut={{ modifiers: ["cmd"], key: "backspace" }}
      />
    </ActionPanel.Section>
  );
}

export async function copyEmailAsMarkdown(email: Email, folder: string) {
  try {
    const body = await fetchEmailBody(folder, email.uid);
    const { loadRemoteImages } = getPreferenceValues<Preferences.ListEmails>();
    await Clipboard.copy(emailAsMarkdown(email, emailBodyToMarkdown(body, { images: loadRemoteImages })));
    showToast({ style: Toast.Style.Success, title: "Copied as Markdown" });
  } catch (error) {
    showToast({ style: Toast.Style.Failure, title: "Failed to copy", message: String(error) });
  }
}
