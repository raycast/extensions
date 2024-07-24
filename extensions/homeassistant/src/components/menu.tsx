import { ha } from "@lib/common";
import { State } from "@lib/haapi";
import { formatToHumanDateTime, getErrorMessage } from "@lib/utils";
import { Icon, Image, Keyboard, LaunchType, MenuBarExtra, Toast, launchCommand, showToast } from "@raycast/api";
import { MenuBarExtra as RUIMenuBarExtra } from "@raycast-community/ui";

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

export interface MenuBarSubmenuProps extends RUIMenuBarExtra.Submenu.Props {}

export function MenuBarSubmenu({ titleSeparator, children, ...restProps }: MenuBarSubmenuProps) {
  return (
    <RUIMenuBarExtra.Submenu titleSeparator={titleSeparator ?? "|"} {...restProps}>
      {children}
    </RUIMenuBarExtra.Submenu>
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
    <RUIMenuBarExtra.OpenInBrowser
      url={url}
      title={props.title ? props.title : title}
      shortcut={props.shortcut}
      icon={props.icon ? props.icon : icon}
    />
  );
}
