import { showToast, Toast, Action, Icon, environment, Alert, confirmAlert, Keyboard, ActionPanel } from "@raycast/api";
import { gmail_v1 } from "googleapis";
import {
  markMessageAsArchived,
  markMessageAsRead,
  markMessageAsUnread,
  markMessagesAsRead,
  messageDraftEditUrl,
  messageThreadUrl,
  moveMessageToTrash,
} from "../../lib/gmail";
import { getErrorMessage, sleep, toastifiedPromiseCall } from "../../lib/utils";
import {
  SemanticLabels,
  canMessageBeArchived,
  convertToSemanticLabels,
  generateLabelFilter,
  getLabelIcon,
  getLabelName,
  isMailDraft,
  isMailUnread,
  sendUpdateRequestToMenus,
} from "./utils";
import path from "path";
import * as fs from "fs";
import { useCurrentProfile } from "./hooks";
import { getGMailClient } from "../../lib/withGmailClient";
import { ListSelectionController } from "../selection/utils";
import {
  MessageDeleteSelectedAction,
  MessageMarkSelectedAsReadAction,
  MessageMarkSelectedAsUnreadAction,
} from "../selection/actions";

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
            await markMessageAsArchived(props.message);
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

export function MessageMarkAsReadAction(props: {
  message: gmail_v1.Schema$Message;
  onRevalidate?: () => void;
  selectionController?: ListSelectionController<gmail_v1.Schema$Message>;
}) {
  const shortcut: Keyboard.Shortcut = { modifiers: ["cmd", "opt"], key: "enter" };
  if (props.selectionController && props.selectionController.getSelectedKeys().length > 0) {
    return (
      <MessageMarkSelectedAsReadAction
        selectionController={props.selectionController}
        shortcut={shortcut}
        onRevalidate={props.onRevalidate}
      />
    );
  }
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
            await markMessageAsRead(props.message);
            if (props.onRevalidate) {
              props.onRevalidate();
            }
            sendUpdateRequestToMenus();
          },
          title: "Marking Mail as Read",
          finishTitle: "Marked Mail as Read",
        })
      }
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
          sendUpdateRequestToMenus();

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

export function MessageMarkAsUnreadAction(props: {
  message: gmail_v1.Schema$Message;
  onRevalidate?: () => void;
  selectionController?: ListSelectionController<gmail_v1.Schema$Message>;
}) {
  if (props.selectionController && props.selectionController.getSelectedKeys().length > 0) {
    return (
      <MessageMarkSelectedAsUnreadAction
        selectionController={props.selectionController}
        onRevalidate={props.onRevalidate}
      />
    );
  }
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
            await markMessageAsUnread(props.message);
            if (props.onRevalidate) {
              props.onRevalidate();
            }
            sendUpdateRequestToMenus();
          },
          title: "Marking Mail as Unread",
          finishTitle: "Marked Mail as Unread",
        })
      }
    />
  );
}

export function MessageDeleteAction(props: {
  message: gmail_v1.Schema$Message;
  onRevalidate?: () => void;
  selectionController?: ListSelectionController<gmail_v1.Schema$Message>;
}) {
  const shortcut = Keyboard.Shortcut.Common.Remove;
  if (props.selectionController && props.selectionController.getSelectedKeys().length > 0) {
    return (
      <MessageDeleteSelectedAction
        selectionController={props.selectionController}
        onRevalidate={props.onRevalidate}
        shortcut={shortcut}
      />
    );
  }
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
        sendUpdateRequestToMenus();
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

export function FilterMessagesLikeGivenAction(props: {
  email: string | undefined;
  setSearchText: ((newValue: string) => void) | undefined;
}) {
  if (!props.email || props.email.trim().length <= 0) {
    return null;
  }
  const handle = () => {
    if (props.setSearchText) {
      props.setSearchText(`from:${props.email}`);
    }
  };
  return (
    <Action
      title="Filter Mails From Sender"
      icon={Icon.Person}
      shortcut={{ modifiers: ["cmd", "opt"], key: "s" }}
      onAction={handle}
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

export function CopyQueryAction(props: { query: string | undefined }) {
  if (!environment.isDevelopment) {
    return null;
  }
  return <Action.CopyToClipboard title="Copy Query to Clipboard" content={props.query || ""} />;
}

export function MessageDebugActionPanelSection(props: { message: gmail_v1.Schema$Message; query?: string }) {
  return (
    <ActionPanel.Section title="Debug">
      <MessageDebugDump message={props.message} />
      <MessageDebugDump message={props.message} toFile={true} />
      <CopyQueryAction query={props.query} />
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

export function OlderThanFilterAddAction(props: {
  searchText?: string;
  setSearchText: ((newValue: string) => void) | undefined;
}) {
  return (
    <TimeThanFilterAddAction
      title="Older Than"
      shortcut={{ modifiers: ["cmd", "opt"], key: "o" }}
      searchText={props.searchText}
      setSearchText={props.setSearchText}
      prefix="older_than"
    />
  );
}

export function NewerThanFilterAddAction(props: {
  searchText?: string;
  setSearchText: ((newValue: string) => void) | undefined;
}) {
  return (
    <TimeThanFilterAddAction
      title="Newer Than"
      shortcut={{ modifiers: ["cmd", "opt"], key: "n" }}
      searchText={props.searchText}
      setSearchText={props.setSearchText}
      prefix="newer_than"
    />
  );
}

export function HasAttachmentsFilterAddAction(props: {
  searchText?: string;
  setSearchText: ((newValue: string) => void) | undefined;
}) {
  const keyword = "has:attachment";
  const alreadySet = props.searchText ? props.searchText.includes(keyword) : false;
  if (alreadySet) {
    return null;
  }
  const handle = () => {
    const s = props.searchText || "";
    if (props.setSearchText) {
      props.setSearchText(`${s}${s ? " " : ""}${keyword}`);
    }
  };
  return (
    <Action
      title="Has Attachment Filter"
      icon={Icon.Paperclip}
      shortcut={{ modifiers: ["ctrl"], key: "a" }}
      onAction={handle}
    />
  );
}

export function TimeThanFilterAddAction(props: {
  searchText?: string;
  setSearchText: ((newValue: string) => void) | undefined;
  prefix: string;
  title: string;
  shortcut?: Keyboard.Shortcut;
}) {
  if (!props.setSearchText) {
    return null;
  }
  if (props.searchText && props.searchText.includes(`${props.prefix}:`)) {
    return null;
  }
  const handle = (val: string) => {
    const s = props.searchText ? props.searchText.trim() : "";
    if (props.setSearchText) {
      props.setSearchText(`${s}${s.length > 0 ? " " : ""}${props.prefix}:${val}`);
    }
  };
  const Days = ({ days }: { days: number }) => (
    <Action title={`${days} ${days <= 1 ? "Day" : "Days"}`} onAction={() => handle(`${days}d`)} />
  );
  const Months = ({ months }: { months: number }) => (
    <Action title={`${months} ${months <= 1 ? "Month" : "Months"}`} onAction={() => handle(`${months}m`)} />
  );
  const Weeks = ({ weeks }: { weeks: number }) => (
    <Action title={`${weeks} ${weeks <= 1 ? "Week" : "Weeks"}`} onAction={() => handle(`${weeks * 7}d`)} />
  );
  const Years = ({ years }: { years: number }) => (
    <Action title={`${years} ${years <= 1 ? "Year" : "Years"}`} onAction={() => handle(`${years}y`)} />
  );
  const days = [1, 2, 3, 4, 6];
  const weeks = [1, 2, 3];
  const months = [1, 2, 3, 4, 5, 6, 7, 8, 9, 11];
  const years = [1, 2, 3, 4, 5, 6];
  return (
    <ActionPanel.Submenu title={props.title} icon={Icon.Clock} shortcut={props.shortcut}>
      {days.map((d) => (
        <Days days={d} />
      ))}
      {weeks.map((w) => (
        <Weeks weeks={w} />
      ))}
      {months.map((m) => (
        <Months months={m} />
      ))}
      {years.map((y) => (
        <Years years={y} />
      ))}
    </ActionPanel.Submenu>
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

export function CreateQueryQuickLinkAction(props: { searchText: string | undefined }) {
  const s = props.searchText;
  if (environment.commandName !== "mails") {
    return null;
  }
  if (!s || s.trim().length <= 0) {
    return null;
  }
  const args: Record<string, string> = {
    query: s,
  };
  return (
    <Action.CreateQuicklink
      title="Save Query as Quicklink"
      quicklink={{ link: `raycast://extensions/tonka3000/gmail/mails?arguments=${encodeURI(JSON.stringify(args))}` }}
    />
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
      <HasAttachmentsFilterAddAction searchText={props.searchText} setSearchText={props.setSearchText} />
      <OlderThanFilterAddAction searchText={props.searchText} setSearchText={props.setSearchText} />
      <NewerThanFilterAddAction searchText={props.searchText} setSearchText={props.setSearchText} />
    </ActionPanel.Section>
  );
}
