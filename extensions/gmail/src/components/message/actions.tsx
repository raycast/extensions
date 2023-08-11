import { showToast, Toast, Action, Icon, environment, Alert, confirmAlert, Keyboard, ActionPanel } from "@raycast/api";
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
import {
  SemanticLabels,
  convertToSemanticLabels,
  generateLabelFilter,
  getLabelIcon,
  getLabelName,
  isMailDraft,
  isMailUnread,
} from "./utils";
import path from "path";
import * as fs from "fs";
import { useCurrentProfile } from "./hooks";
import { getGMailClient } from "../../lib/withGmailClient";

export function MessageMarkAsReadAction(props: { message: gmail_v1.Schema$Message; onRevalidate?: () => void }) {
  if (!isMailUnread(props.message) || isMailDraft(props.message)) {
    return null;
  }
  const handle = async () => {
    try {
      const toast = await showToast({ style: Toast.Style.Animated, title: "Marking Mail as Read" });
      await markMessageAsRead(props.message);
      toast.style = Toast.Style.Success;
      toast.title = "Marked Mail as Read";

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
          const toast = await showToast({
            style: Toast.Style.Animated,
            title: `Marking ${props.messages.length} Mails as Read`,
          });
          await markMessagesAsRead(props.messages);
          toast.style = Toast.Style.Success;
          toast.title = `Marked ${props.messages.length} Mails as Read`;

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
      const toast = await showToast({ style: Toast.Style.Animated, title: "Marking Mail as Unread" });
      await markMessageAsUnread(props.message);
      toast.style = Toast.Style.Success;
      toast.title = "Marked Mail as Unread";

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
        message: "The Mail can be restored in the next couple of weeks.",
        primaryAction: {
          title: "Move to Trash",
          style: Alert.ActionStyle.Destructive,
        },
      };
      if (await confirmAlert(options)) {
        const toast = await showToast({ style: Toast.Style.Animated, title: "Moving Mail to Trash" });
        await moveMessageToTrash(props.message);
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

export function MessageShowDetailsAction(props: { detailsShown: boolean; onAction?: (newValue: boolean) => void }) {
  const handle = () => {
    if (props.onAction) {
      props.onAction(!props.detailsShown);
    }
  };
  return (
    <Action
      title={props.detailsShown ? "Hide Details" : "Show Details"}
      icon={props.detailsShown ? Icon.EyeDisabled : Icon.Eye}
      shortcut={{ modifiers: ["opt"], key: "d" }}
      onAction={handle}
    />
  );
}

export function MessageDebugDump(props: { message: gmail_v1.Schema$Message; toFile?: boolean }) {
  const handle = () => {
    try {
      const data = JSON.stringify(props.message, null, 4);
      if (props.toFile === true) {
        const folder = path.join(environment.supportPath, "debug");
        fs.mkdirSync(folder, { recursive: true });
        const filename = path.join(folder, `msg_${props.message.id}.json`);
        console.log(`Dump message to ${filename}`);
        fs.writeFileSync(filename, data, "utf-8");
      } else {
        console.log(data);
      }
    } catch (error) {
      showToast({ style: Toast.Style.Failure, title: "Error", message: getErrorMessage(error) });
    }
  };
  if (!environment.isDevelopment) {
    return null;
  }
  return (
    <Action title={props.toFile === true ? "Dump to File" : "Dump To Console"} icon={Icon.Bug} onAction={handle} />
  );
}

export function MessageDebugActionPanelSection(props: { message: gmail_v1.Schema$Message }) {
  return (
    <ActionPanel.Section title="Debug">
      <MessageDebugDump message={props.message} />
      <MessageDebugDump message={props.message} toFile={true} />
    </ActionPanel.Section>
  );
}

export function UserLabelFilterAddAction(props: {
  labelsAll: gmail_v1.Schema$Label[] | undefined;
  searchText?: string;
  setSearchText: ((newValue: string) => void) | undefined;
}) {
  return (
    <FilterAddAction
      title="Add Label Filter"
      labelsAll={props.labelsAll}
      searchText={props.searchText}
      setSearchText={props.setSearchText}
      shortcut={{ modifiers: ["cmd"], key: "l" }}
      onFilter={(l) => l.userLabels}
    />
  );
}

export function SystemLabelFilterAddAction(props: {
  labelsAll: gmail_v1.Schema$Label[] | undefined;
  searchText?: string;
  setSearchText: ((newValue: string) => void) | undefined;
}) {
  return (
    <FilterAddAction
      title="Add System Filter"
      labelsAll={props.labelsAll}
      searchText={props.searchText}
      setSearchText={props.setSearchText}
      shortcut={{ modifiers: ["cmd"], key: "s" }}
      onFilter={(l) => l.systemLabels}
    />
  );
}

export function CategoryLabelFilterAddAction(props: {
  labelsAll: gmail_v1.Schema$Label[] | undefined;
  searchText?: string;
  setSearchText: ((newValue: string) => void) | undefined;
}) {
  return (
    <FilterAddAction
      title="Add Category Filter"
      labelsAll={props.labelsAll}
      searchText={props.searchText}
      setSearchText={props.setSearchText}
      shortcut={{ modifiers: ["opt", "cmd"], key: "c" }}
      onFilter={(l) => l.categories}
    />
  );
}

export function FilterAddAction(props: {
  title: string;
  labelsAll: gmail_v1.Schema$Label[] | undefined;
  searchText?: string;
  setSearchText: ((newValue: string) => void) | undefined;
  shortcut?: Keyboard.Shortcut | undefined;
  onFilter: (semanticLabels: SemanticLabels) => gmail_v1.Schema$Label[] | undefined;
}) {
  const semantic = convertToSemanticLabels(props.labelsAll);
  const labelsAll = props.onFilter(semantic);
  if (!labelsAll || labelsAll.length <= 0 || !props.setSearchText) {
    return null;
  }
  const handle = (selectedLabel: gmail_v1.Schema$Label, prefix: string) => {
    if (props.setSearchText) {
      const currentText = props.searchText || "";
      const labelText = `${prefix}${generateLabelFilter(selectedLabel) || ""}`;
      const nt = currentText && currentText.trim().length > 0 ? `${currentText} ${labelText}` : labelText;
      props.setSearchText(nt);
    }
  };
  return (
    <ActionPanel.Submenu title={props.title} shortcut={props.shortcut} icon={Icon.Book}>
      <ActionPanel.Submenu title="Match">
        {labelsAll.map((l) => (
          <Action title={getLabelName(l) || "?"} icon={getLabelIcon(l)} onAction={() => handle(l, "")} />
        ))}
      </ActionPanel.Submenu>
      <ActionPanel.Submenu title="Not Match">
        {labelsAll.map((l) => (
          <Action title={getLabelName(l) || "?"} icon={getLabelIcon(l)} onAction={() => handle(l, "-")} />
        ))}
      </ActionPanel.Submenu>
    </ActionPanel.Submenu>
  );
}

export function FilterActionPanelSection(props: {
  title?: string;
  labelsAll: gmail_v1.Schema$Label[] | undefined;
  searchText?: string;
  setSearchText: ((newValue: string) => void) | undefined;
}) {
  return (
    <ActionPanel.Section title={props.title}>
      <UserLabelFilterAddAction
        labelsAll={props.labelsAll}
        searchText={props.searchText}
        setSearchText={props.setSearchText}
      />
      <SystemLabelFilterAddAction
        labelsAll={props.labelsAll}
        searchText={props.searchText}
        setSearchText={props.setSearchText}
      />
      <CategoryLabelFilterAddAction
        labelsAll={props.labelsAll}
        searchText={props.searchText}
        setSearchText={props.setSearchText}
      />
    </ActionPanel.Section>
  );
}
