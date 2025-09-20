import { ha } from "@lib/common";
import { State } from "@lib/haapi";
import { formatToHumanDateTime } from "@lib/utils";
import { MenuBarExtra as RUIMenuBarExtra } from "@raycast-community/ui";
import { Icon, Image, Keyboard, MenuBarExtra } from "@raycast/api";

export function LastUpdateChangeMenubarItem({ state, onAction }: { state: State; onAction?: () => void }) {
  const humanDateString = (dt: string) => {
    const r = `${formatToHumanDateTime(dt)}`;
    return r ? r : "?";
  };
  const tooltip = (dt: string) => {
    try {
      return `${humanDateString(dt)} (${new Date(dt).toLocaleString()})`;
    } catch (
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      error
    ) {
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

export function MenuBarSubmenu({ titleSeparator, children, ...restProps }: RUIMenuBarExtra.Submenu.Props) {
  return (
    <RUIMenuBarExtra.Submenu titleSeparator={titleSeparator ?? "|"} {...restProps}>
      {children}
    </RUIMenuBarExtra.Submenu>
  );
}

export function LaunchCommandMenubarItem({ shortcut, ...restProps }: RUIMenuBarExtra.LaunchCommand.Props) {
  return <RUIMenuBarExtra.LaunchCommand shortcut={shortcut ?? { modifiers: ["cmd"], key: "o" }} {...restProps} />;
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
  const icon = isCompanion ? "home-assistant.svg" : Icon.Globe;
  return (
    <RUIMenuBarExtra.OpenInBrowser
      url={url}
      title={props.title ? props.title : title}
      shortcut={props.shortcut}
      icon={props.icon ? props.icon : icon}
    />
  );
}
