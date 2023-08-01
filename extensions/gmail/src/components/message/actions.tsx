import { showToast, Toast, Action, Icon } from "@raycast/api";
import { gmail_v1 } from "googleapis";
import { markMessageAsRead, markMessageAsUnread } from "../../lib/gmail";
import { getErrorMessage } from "../../lib/utils";
import { isMailDraft, isMailUnread } from "./utils";

export function GMailMessageMarkAsReadAction(props: { message: gmail_v1.Schema$Message; onRevalidate?: () => void }) {
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

export function GMailMessageMarkAsUnreadAction(props: { message: gmail_v1.Schema$Message; onRevalidate?: () => void }) {
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

export function GMailRefreshAction(props: { onRevalidate?: () => void }) {
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
