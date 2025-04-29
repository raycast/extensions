import { showToast, Toast, Action, Icon, environment, Alert, confirmAlert, Keyboard } from "@raycast/api";
import { gmail_v1 } from "googleapis";
import {
  markMessageAsArchived as apiMarkMessageAsArchived,
  markMessageAsRead as apiMarkMessageAsRead,
  markMessageAsUnread as apiMarkMessageAsUnread,
  messageDraftEditUrl,
  messageThreadUrl,
  moveMessageToTrash as apiMoveMessageToTrash,
  downloadAndOpenAttachment,
} from "../../lib/gmail";
import { getErrorMessage, sleep, toastifiedPromiseCall } from "../../lib/utils";
import { canMessageBeArchived, isMailDraft, isMailUnread } from "./utils";
import { useCurrentProfile } from "./hooks";
import { getGMailClient } from "../../lib/withGmailClient";

export function MessageMarkAsArchived(props: { message: gmail_v1.Schema$Message; onRevalidate?: () => void }) {
  if (!canMessageBeArchived(props.message)) {
    return null;
  }
  return (
    <Action
      title="Archive"
      icon={Icon.Box}
      shortcut={{ modifiers: ["cmd", "opt"], key: "a" }}
      onAction={() =>
        toastifiedPromiseCall({
          onCall: async () => {
            await apiMarkMessageAsArchived(props.message);
            if (props.onRevalidate) {
              props.onRevalidate();
            }
          },
          title: "Marking Mail as Archived",
          finishTitle: "Mail Archived",
        })
      }
    />
  );
}

export function MessageMarkAsReadAction(props: { message: gmail_v1.Schema$Message; onRevalidate?: () => void }) {
  const shortcut: Keyboard.Shortcut = { modifiers: ["cmd", "opt"], key: "enter" };
  if (!isMailUnread(props.message) || isMailDraft(props.message)) {
    return null;
  }
  return (
    <Action
      title="Mark as Read"
      icon={Icon.Circle}
      shortcut={shortcut}
      onAction={() =>
        toastifiedPromiseCall({
          onCall: async () => {
            await apiMarkMessageAsRead(props.message);
            if (props.onRevalidate) {
              props.onRevalidate();
            }
          },
          title: "Marking Mail as Read",
          finishTitle: "Marked Mail as Read",
        })
      }
    />
  );
}

export function MessageMarkAsUnreadAction(props: { message: gmail_v1.Schema$Message; onRevalidate?: () => void }) {
  if (isMailUnread(props.message) || isMailDraft(props.message)) {
    return null;
  }
  return (
    <Action
      title="Mark as Unread"
      icon={Icon.CircleFilled}
      onAction={() =>
        toastifiedPromiseCall({
          onCall: async () => {
            await apiMarkMessageAsUnread(props.message);
            if (props.onRevalidate) {
              props.onRevalidate();
            }
          },
          title: "Marking Mail as Unread",
          finishTitle: "Marked Mail as Unread",
        })
      }
    />
  );
}

export function MessageDeleteAction(props: { message: gmail_v1.Schema$Message; onRevalidate?: () => void }) {
  const shortcut = Keyboard.Shortcut.Common.Remove;
  if (props.message.id === undefined) {
    return null;
  }
  const handle = async () => {
    try {
      const options: Alert.Options = {
        title: "Move to Trash",
        message: "The Mail can be restored in the next couple of weeks.",
        primaryAction: {
          title: "Move to Trash",
          style: Alert.ActionStyle.Destructive,
        },
      };
      if (await confirmAlert(options)) {
        const toast = await showToast({ style: Toast.Style.Animated, title: "Moving Mail to Trash" });
        await apiMoveMessageToTrash(props.message);
        toast.style = Toast.Style.Success;
        toast.title = "Moved Mail to Trash";
      }

      if (props.onRevalidate) {
        props.onRevalidate();
      }
    } catch (error) {
      showToast({ style: Toast.Style.Failure, title: "Error", message: getErrorMessage(error) });
    }
  };
  return (
    <Action
      title="Delete"
      icon={Icon.XMarkCircle}
      shortcut={shortcut}
      onAction={handle}
      style={Action.Style.Destructive}
    />
  );
}

export function MessagesRefreshAction(props: { onRevalidate?: () => void }) {
  if (!props.onRevalidate) {
    return null;
  }
  return (
    <Action
      title="Refresh"
      icon={Icon.RotateClockwise}
      shortcut={{ modifiers: ["cmd"], key: "r" }}
      onAction={props.onRevalidate}
    />
  );
}

export function MessageCopyIdAction(props: { message: gmail_v1.Schema$Message }) {
  const m = props.message;
  if (m.id === undefined || !environment.isDevelopment) {
    return null;
  }
  return <Action.CopyToClipboard title="Copy ID" content={m.id || ""} />;
}

export function MessageOpenInBrowserAction(props: { message: gmail_v1.Schema$Message; onOpen?: () => void }) {
  const m = props.message;
  if (m.id === undefined) {
    return null;
  }
  const { gmail } = getGMailClient();
  const { profile } = useCurrentProfile(gmail);
  const url = isMailDraft(m) ? messageDraftEditUrl(profile, m) : messageThreadUrl(profile, m);
  if (!url) {
    return null;
  }
  const handle = async () => {
    if (props.onOpen) {
      await sleep(4000);
      props.onOpen();
    }
  };
  return <Action.OpenInBrowser url={url} onOpen={handle} />;
}

export function MessageCopyWebUrlAction(props: { message: gmail_v1.Schema$Message; onOpen?: () => void }) {
  const m = props.message;
  if (m.id === undefined) {
    return null;
  }
  const { gmail } = getGMailClient();
  const { profile } = useCurrentProfile(gmail);
  const url = isMailDraft(m) ? messageDraftEditUrl(profile, m) : messageThreadUrl(profile, m);
  if (!url) {
    return null;
  }
  return (
    <Action.CopyToClipboard
      content={url}
      title="Copy Web URL to Clipboard"
      shortcut={{ modifiers: ["cmd", "shift"], key: "," }}
    />
  );
}

export function MessageDownloadAttachmentAction(props: {
  message: gmail_v1.Schema$Message;
  attachment: { filename: string; attachmentId: string; mimeType: string };
}) {
  const { gmail } = getGMailClient();
  const { message, attachment } = props;

  async function handleAction() {
    if (!message.id) {
      showToast(Toast.Style.Failure, "Cannot download", "Message ID is missing");
      return;
    }
    try {
      await downloadAndOpenAttachment(gmail, message.id, attachment.attachmentId, attachment.filename);
    } catch (error) {
      showFailureToast(error, { title: "Could not download attachment" });
    }
  }

  return (
    <Action
      title={`Download "${attachment.filename}"`}
      icon={Icon.Download}
      onAction={handleAction}
      shortcut={{ modifiers: ["cmd", "shift"], key: "d" }}
    />
  );
}
