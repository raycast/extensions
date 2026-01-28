import {
  Icon,
  Image,
  Keyboard,
  LaunchType,
  MenuBarExtra,
  environment,
  getPreferenceValues,
  launchCommand,
  openCommandPreferences,
} from "@raycast/api";
import React, { ReactNode } from "react";

function clipText(text: string) {
  const maxLength = 100;
  if (text.length > maxLength) {
    return text.slice(0, maxLength) + " ...";
  }
  return text;
}

export function MenuBarRoot(props: {
  children?: React.ReactNode;
  icon?: Image.ImageLike;
  isLoading?: boolean;
  title?: string;
  tooltip?: string;
  error?: string | undefined;
}): JSX.Element {
  const error = props.error;
  const reloadMenu = () => {
    environment.commandName;
    launchCommand({ name: environment.commandName, type: LaunchType.UserInitiated });
  };
  return (
    <MenuBarExtra icon={props.icon} isLoading={props.isLoading} title={props.title} tooltip={props.tooltip}>
      {error ? (
        <MenuBarItem title={`Error: ${error}`} icon={{ source: Icon.Warning }} onAction={reloadMenu} />
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
}): JSX.Element {
  return (
    <MenuBarExtra.Item
      title={clipText(props.title)}
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
  const els = elements as JSX.Element[] | undefined;
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
  moreElement?: (hidden: number) => JSX.Element | null;
  emptyElement?: JSX.Element | null;
}): JSX.Element | null {
  const title = joinNonEmpty(
    [props.title, props.subtitle].filter((e) => e),
    " ",
  );
  const { shown, hidden } = shownElements(props.children, props.maxChildren);
  const empty = shown === undefined || (shown as object[]).length <= 0;
  return (
    <MenuBarExtra.Section title={title}>
      {shown}
      {hidden > 0 && props.moreElement && props.moreElement(hidden)}
      {empty && props.emptyElement && props.emptyElement}
    </MenuBarExtra.Section>
  );
}

export function MenuBarSubmenu(props: {
  title: string;
  subtitle?: string;
  icon?: Image.ImageLike | undefined;
  children?: ReactNode;
}): JSX.Element {
  const title =
    joinNonEmpty(
      [props.title, props.subtitle].filter((e) => e),
      " ",
    ) || "";
  return (
    <MenuBarExtra.Submenu title={title} icon={props.icon}>
      {props.children}
    </MenuBarExtra.Submenu>
  );
}

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

export function getBoundedPreferenceNumber(params: {
  name: string;
  min?: number;
  max?: number;
  default?: number;
}): number {
  const boundMin = params.min || 1;
  const boundMax = params.max || 100;
  const fallback = params.default || 10;
  const prefs = getPreferenceValues();
  const maxtext = (prefs[params.name] as string) || "";
  const max = Number(maxtext);
  if (isNaN(max)) {
    return fallback;
  }
  if (max < boundMin) {
    return fallback;
  }
  if (max > boundMax) {
    return fallback;
  }
  return max;
}
