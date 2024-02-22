import { Action, ActionPanel, Alert, Color, Icon, Keyboard, Toast, confirmAlert, showToast } from "@raycast/api";
import { gmail_v1 } from "googleapis";
import { ListSelectionController } from "./utils";
import { markMessagesAsRead, markMessagesAsUnread, moveMessagesToTrash } from "../../lib/gmail";
import { getErrorMessage } from "../../lib/utils";
import { isMailUnread, sendUpdateRequestToMenus } from "../message/utils";

export function ToggleSelectedStateAction(props: {
  message: gmail_v1.Schema$Message;
  selectionController: ListSelectionController<gmail_v1.Schema$Message> | undefined;
}) {
  const sc = props.selectionController;
  if (!sc) {
    return null;
  }
  const isSelected = sc.isSelected(props.message);
  const handle = () => {
    if (props.selectionController) {
      if (isSelected) {
        sc.deselect(props.message);
      } else {
        sc.select(props.message);
      }
    }
  };
  return (
    <Action
      title={isSelected ? "Deselect" : "Select"}
      icon={{ source: Icon.CheckCircle, tintColor: isSelected ? Color.Magenta : undefined }}
      shortcut={{ modifiers: ["ctrl"], key: "s" }}
      onAction={handle}
    />
  );
}

export function UnselectAllAction(props: {
  selectionController: ListSelectionController<gmail_v1.Schema$Message> | undefined;
}) {
  const sc = props.selectionController;
  if (!sc || sc.getSelectedKeys().length <= 0) {
    return null;
  }
  const handle = () => {
    if (props.selectionController) {
      sc.deselectAll();
    }
  };
  return (
    <Action
      title="Deselect All"
      icon={{ source: Icon.CheckCircle, tintColor: Color.Magenta }}
      shortcut={{ modifiers: ["shift", "ctrl"], key: "s" }}
      onAction={handle}
    />
  );
}

export function SelectionActionSection(props: {
  message: gmail_v1.Schema$Message;
  selectionController: ListSelectionController<gmail_v1.Schema$Message> | undefined;
}) {
  return (
    <ActionPanel.Section>
      <ToggleSelectedStateAction message={props.message} selectionController={props.selectionController} />
      <UnselectAllAction selectionController={props.selectionController} />
    </ActionPanel.Section>
  );
}

export function MessageMarkSelectedAsReadAction(props: {
  selectionController: ListSelectionController<gmail_v1.Schema$Message>;
  onRevalidate?: () => void;
  shortcut?: Keyboard.Shortcut | null | undefined;
}) {
  const messages = props.selectionController.getSelected().filter((m) => isMailUnread(m));
  if (!messages || messages.length <= 0) {
    return null;
  }
  const handle = async () => {
    try {
      const options: Alert.Options = {
        title: `Mark all ${messages?.length} selected Mails as Read?`,
        primaryAction: {
          title: "Mark as Read",
          style: Alert.ActionStyle.Default,
        },
      };
      if (await confirmAlert(options)) {
        if (messages) {
          const toast = await showToast({
            style: Toast.Style.Animated,
            title: `Marking ${messages.length} selected Mails as Read`,
          });
          await markMessagesAsRead(messages);
          toast.style = Toast.Style.Success;
          toast.title = `Marked ${messages.length} selected Mails as Read`;
          sendUpdateRequestToMenus();

          props.selectionController.deselectAll();
          if (props.onRevalidate) {
            props.onRevalidate();
          }
        }
      }
    } catch (error) {
      showToast({ style: Toast.Style.Failure, title: "Error", message: getErrorMessage(error) });
    }
  };
  return <Action title="Mark Selected as Read" icon={Icon.Circle} shortcut={props.shortcut} onAction={handle} />;
}

export function MessageMarkSelectedAsUnreadAction(props: {
  selectionController: ListSelectionController<gmail_v1.Schema$Message>;
  onRevalidate?: () => void;
  shortcut?: Keyboard.Shortcut | null | undefined;
}) {
  const messages = props.selectionController.getSelected().filter((m) => !isMailUnread(m));
  if (!messages || messages.length <= 0) {
    return null;
  }
  const handle = async () => {
    try {
      const options: Alert.Options = {
        title: `Mark all ${messages?.length} selected Mails as Unread?`,
        primaryAction: {
          title: "Mark as Unread",
          style: Alert.ActionStyle.Default,
        },
      };
      if (await confirmAlert(options)) {
        if (messages) {
          const toast = await showToast({
            style: Toast.Style.Animated,
            title: `Marking ${messages.length} selected Mails as Unread`,
          });
          await markMessagesAsUnread(messages);
          toast.style = Toast.Style.Success;
          toast.title = `Marked ${messages.length} selected Mails as Unread`;
          sendUpdateRequestToMenus();

          props.selectionController.deselectAll();
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
    <Action title="Mark Selected as Unread" icon={Icon.CircleFilled} shortcut={props.shortcut} onAction={handle} />
  );
}

export function MessageDeleteSelectedAction(props: {
  selectionController: ListSelectionController<gmail_v1.Schema$Message>;
  onRevalidate?: () => void;
  shortcut?: Keyboard.Shortcut | null | undefined;
}) {
  const messages = props.selectionController.getSelected().filter((m) => !isMailUnread(m));
  if (!messages || messages.length <= 0) {
    return null;
  }
  const handle = async () => {
    try {
      const options: Alert.Options = {
        title: `Move all ${messages?.length} selected Mails to Trash?`,
        primaryAction: {
          title: "Move to Trash",
          style: Alert.ActionStyle.Default,
        },
      };
      if (await confirmAlert(options)) {
        if (messages) {
          const toast = await showToast({
            style: Toast.Style.Animated,
            title: `Moving ${messages.length} selected Mails to Trash`,
          });
          await moveMessagesToTrash(messages);
          toast.style = Toast.Style.Success;
          toast.title = `Moved ${messages.length} selected Mails to Trash`;
          sendUpdateRequestToMenus();

          props.selectionController.deselectAll();
          if (props.onRevalidate) {
            props.onRevalidate();
          }
        }
      }
    } catch (error) {
      showToast({ style: Toast.Style.Failure, title: "Error", message: getErrorMessage(error) });
    }
  };
  return <Action title="Delete Selected" icon={Icon.XMarkCircle} shortcut={props.shortcut} onAction={handle} />;
}
