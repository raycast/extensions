import { ha } from "@lib/common";
import { State } from "@lib/haapi";
import { formatToHumanDateTime, getErrorMessage } from "@lib/utils";
import {
  Clipboard,
  Icon,
  Image,
  Keyboard,
  LaunchType,
  MenuBarExtra,
  Toast,
  launchCommand,
  open,
  showHUD,
  showToast,
} from "@raycast/api";
import { ReactNode } from "react";

export async function copyToClipboardWithHUD(content: string | number | Clipboard.Content) {
  await Clipboard.copy(content);
  showHUD("Copied to Clipboard");
}

export function CopyToClipboardMenubarItem(props: { title: string; content: string; tooltip?: string }) {
  const copyToClipboard = async () => {
    try {
      await copyToClipboardWithHUD(props.content);
    } catch (error) {
      showToast({ style: Toast.Style.Failure, title: "Error", message: getErrorMessage(error) });
    }
  };
  return (
    <MenuBarExtra.Item
      title={props.title}
      icon={Icon.CopyClipboard}
      onAction={copyToClipboard}
      tooltip={props.tooltip}
    />
  );
}

export function LastUpdateChangeMenubarItem({ state, onAction }: { state: State; onAction?: () => void }) {
  const humanDateString = (dt: string) => {
    const r = `${formatToHumanDateTime(dt)}`;
    return r ? r : "?";
  };
  const tooltip = (dt: string) => {
    try {
      return `${humanDateString(dt)} (${new Date(dt).toLocaleString()})`;
    } catch (error) {
      return `${humanDateString(dt)}`;
    }
  };
  return (
    <>
      <MenuBarExtra.Item
        title={"Last Change"}
        subtitle={`${humanDateString(state.last_changed)}`}
        icon={Icon.Clock}
        onAction={onAction ? onAction : () => {}}
        tooltip={`Last Change: ${tooltip(state.last_changed)}`}
      />
      <MenuBarExtra.Item
        title={"Last Update"}
        subtitle={`${humanDateString(state.last_updated)}`}
        icon={Icon.Clock}
        onAction={onAction ? onAction : () => {}}
        tooltip={`Last Update: ${tooltip(state.last_updated)}`}
      />
    </>
  );
}

function joinNonEmpty(parts?: (string | undefined)[], separator?: string | undefined): string | undefined {
  if (!parts || parts.length <= 0) {
    return undefined;
  }
  return parts.join(separator);
}

export function MenuBarSubmenu(props: {
  title: string;
  subtitle?: string;
  icon?: Image.ImageLike | undefined;
  children?: ReactNode;
  separator?: string;
}): JSX.Element {
  const sep = props.separator && props.separator.length > 0 ? props.separator : "|";
  const title =
    joinNonEmpty(
      [props.title, props.subtitle && props.subtitle.length > 0 ? sep : undefined, props.subtitle].filter((e) => e),
      " ",
    ) || "";
  return (
    <MenuBarExtra.Submenu title={title} icon={props.icon}>
      {props.children}
    </MenuBarExtra.Submenu>
  );
}

export function LaunchCommandMenubarItem(props: {
  title: string;
  icon?: Image.ImageLike;
  name: string;
  type: LaunchType;
}) {
  const launch = async () => {
    try {
      return await launchCommand({ name: props.name, type: props.type });
    } catch (error) {
      showToast({ style: Toast.Style.Failure, title: getErrorMessage(error) || "Internal Error" });
    }
  };
  return (
    <MenuBarExtra.Item
      title={props.title}
      icon={props.icon}
      shortcut={{ modifiers: ["cmd"], key: "o" }}
      onAction={launch}
    />
  );
}

export function OpenInMenubarItem(props: {
  url: string;
  shortcut?: Keyboard.Shortcut;
  title?: string;
  icon?: Image.ImageLike;
  action?: string;
}) {
  const url = props.url;
  const isCompanion = ha.isCompanionUrl(url);
  const app = isCompanion ? "Companion" : "Browser";
  const action = props.action ? props.action : "Open In";
  const title = `${action} ${app}`;
  const icon = isCompanion ? "home-assistant.png" : Icon.Globe;
  return (
    <MenuBarExtra.Item
      title={props.title ? props.title : title}
      shortcut={props.shortcut}
      onAction={() => open(url)}
      icon={props.icon ? props.icon : icon}
    />
  );
}
