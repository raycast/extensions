import {
  MenuBarExtra,
  Icon,
  openCommandPreferences,
  Clipboard,
  showHUD,
  showToast,
  Toast,
  Image,
  launchCommand,
  LaunchType,
  Keyboard,
  open,
} from "@raycast/api";
import { getErrorMessage } from "@lib/utils";
import { ReactNode } from "react";

export function MenuBarItemConfigureCommand(): JSX.Element {
  return (
    <MenuBarExtra.Item
      title="Configure Command"
      shortcut={{ modifiers: ["cmd"], key: "," }}
      icon={Icon.Gear}
      onAction={() => openCommandPreferences()}
    />
  );
}

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

export function OpenInBrowserMenubarItem(props: {
  url: string;
  shortcut?: Keyboard.Shortcut;
  title?: string;
  icon?: Image.ImageLike;
}) {
  return (
    <MenuBarExtra.Item
      title={props.title ? props.title : "Open in Browser"}
      shortcut={props.shortcut}
      onAction={() => open(props.url)}
      icon={props.icon ? props.icon : Icon.Globe}
    />
  );
}
