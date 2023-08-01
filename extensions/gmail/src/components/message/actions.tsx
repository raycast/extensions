import { showToast, Toast, Action, Icon, environment, Alert, confirmAlert, Keyboard } from "@raycast/api";
import { gmail_v1 } from "googleapis";
import {
  markMessageAsRead,
  markMessageAsUnread,
  markMessagesAsRead,
  messageDraftEditUrl,
  messageThreadUrl,
  moveMessageToTrash,
} from "../../lib/gmail";
import { getErrorMessage, sleep } from "../../lib/utils";
import { isMailDraft, isMailUnread } from "./utils";

export function MessageMarkAsReadAction(props: { message: gmail_v1.Schema$Message; onRevalidate?: () => void }) {
  if (!isMailUnread(props.message) || isMailDraft(props.message)) {
    return null;
  }
  const handle = async () => {
    try {
      await markMessageAsRead(props.message);

      if (props.onRevalidate) {
        props.onRevalidate();
      }
    } catch (error) {
      showToast({ style: Toast.Style.Failure, title: "Error", message: getErrorMessage(error) });
    }
  };
  return (
    <Action
      title="Mark as Read"
      icon={Icon.Circle}
      shortcut={{ modifiers: ["cmd", "opt"], key: "enter" }}
      onAction={handle}
    />
  );
}

export function MessageMarkAllAsReadAction(props: {
  messages: gmail_v1.Schema$Message[] | undefined;
  onRevalidate?: () => void;
}) {
  if (!props.messages || props.messages.length <= 0) {
    return null;
  }
  const handle = async () => {
    try {
      const options: Alert.Options = {
        title: `Mark all ${props.messages?.length} unread Mails as Read?`,
        primaryAction: {
          title: "Mark as Read",
          style: Alert.ActionStyle.Default,
        },
      };
      if (await confirmAlert(options)) {
        if (props.messages) {
          await markMessagesAsRead(props.messages);
          if (props.onRevalidate) {
            props.onRevalidate();
          }
        }
      }
    } catch (error) {
      showToast({ style: Toast.Style.Failure, title: "Error", message: getErrorMessage(error) });
    }
  };
  return (
    <Action
      title="Mark All as Read"
      icon={Icon.Circle}
      shortcut={{ modifiers: ["cmd", "shift"], key: "enter" }}
      onAction={handle}
    />
  );
}

export function MessageMarkAsUnreadAction(props: { message: gmail_v1.Schema$Message; onRevalidate?: () => void }) {
  if (isMailUnread(props.message) || isMailDraft(props.message)) {
    return null;
  }
  const handle = async () => {
    try {
      await markMessageAsUnread(props.message);

      if (props.onRevalidate) {
        props.onRevalidate();
      }
    } catch (error) {
      showToast({ style: Toast.Style.Failure, title: "Error", message: getErrorMessage(error) });
    }
  };
  return <Action title="Mark as Unread" icon={Icon.CircleFilled} onAction={handle} />;
}

export function MessageDeleteAction(props: { message: gmail_v1.Schema$Message; onRevalidate?: () => void }) {
  if (props.message.id === undefined) {
    return null;
  }
  const handle = async () => {
    try {
      const options: Alert.Options = {
        title: "Move to Trash",
        message: "he Mail can be restored in the next couple of weeks.",
        primaryAction: {
          title: "Move to Trash",
          style: Alert.ActionStyle.Destructive,
        },
      };
      if (await confirmAlert(options)) {
        await moveMessageToTrash(props.message);
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
      shortcut={Keyboard.Shortcut.Common.Remove}
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
  const url = isMailDraft(m) ? messageDraftEditUrl(m) : messageThreadUrl(m);
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
