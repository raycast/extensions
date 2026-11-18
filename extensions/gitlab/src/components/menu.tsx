import {
  Icon,
  Image,
  Keyboard,
  LaunchType,
  MenuBarExtra,
  environment,
  launchCommand,
  openCommandPreferences,
} from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import React from "react";
import { ReactNode } from "react";
export function MenuBarRoot(props: {
  children: React.ReactNode;
  icon?: Image.ImageLike;
  isLoading?: boolean;
  title?: string;
  tooltip?: string;
  error?: string | undefined;
}) {
  const reloadMenu = async () => {
    //environment.commandName;
    try {
      await launchCommand({ name: environment.commandName, type: LaunchType.UserInitiated });
    } catch (error) {
      showFailureToast(error, { title: "Could not open Command" });
    }
  };
  return (
    <MenuBarExtra icon={props.icon} isLoading={props.isLoading} title={props.title} tooltip={props.tooltip}>
      {props.error ? (
        <MenuBarItem title={`Error: ${props.error}`} icon={{ source: Icon.Warning }} onAction={reloadMenu} />
      ) : (
        props.children
      )}
    </MenuBarExtra>
  );
}

export function MenuBarItem(props: {
  title: string;
  subtitle?: string;
  icon?: Image.ImageLike;
  shortcut?: Keyboard.Shortcut | undefined;
  onAction?: ((event: object) => void) | undefined;
  tooltip?: string;
}) {
  return (
    <MenuBarExtra.Item
      title={props.title ? (props.title.length > 100 ? props.title.slice(0, 100) + " ..." : props.title) : "?"}
      icon={props.icon}
      subtitle={props.subtitle}
      shortcut={props.shortcut}
      onAction={props.onAction}
      tooltip={props.tooltip}
    />
  );
}

function shownElements(elements?: ReactNode, maxElements?: number): { shown?: ReactNode; hidden: number } {
  if (!maxElements) {
    return { shown: elements, hidden: 0 };
  }
  if (React.isValidElement(elements)) {
    return { shown: [elements], hidden: 0 };
  }
  const els = elements as React.ReactElement[] | undefined;
  if (!els || els.length <= 0) {
    return { shown: undefined, hidden: 0 };
  }
  const maxShown = maxElements || 10;
  const shown = els.slice(0, maxShown);
  const hidden = els.length - shown.length;
  return { shown, hidden };
}

function joinNonEmpty(parts?: (string | undefined)[], separator?: string | undefined): string | undefined {
  if (!parts || parts.length <= 0) {
    return undefined;
  }
  return parts.join(separator);
}

export function MenuBarSection(props: {
  title?: string;
  subtitle?: string;
  maxChildren?: number;
  children?: ReactNode;
  moreElement?: (hidden: number) => React.ReactNode | null;
}) {
  const { shown, hidden } = shownElements(props.children, props.maxChildren);
  return (
    <MenuBarExtra.Section
      title={joinNonEmpty(
        [props.title, props.subtitle].filter((part) => part),
        " ",
      )}
    >
      {shown}
      {hidden > 0 && props.moreElement && props.moreElement(hidden)}
    </MenuBarExtra.Section>
  );
}

export function MenuBarSubmenu(props: {
  title: string;
  subtitle?: string;
  icon?: Image.ImageLike | undefined;
  children?: ReactNode;
}) {
  return (
    <MenuBarExtra.Submenu
      title={
        joinNonEmpty(
          [props.title, props.subtitle].filter((part) => part),
          " ",
        ) || ""
      }
      icon={props.icon}
    >
      {props.children}
    </MenuBarExtra.Submenu>
  );
}

export function MenuBarItemConfigureCommand() {
  return (
    <MenuBarExtra.Item
      title="Configure Command"
      shortcut={{ modifiers: ["cmd"], key: "," }}
      icon={Icon.Gear}
      onAction={() => openCommandPreferences()}
    />
  );
}
