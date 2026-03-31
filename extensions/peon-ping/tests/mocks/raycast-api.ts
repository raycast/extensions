import type { ReactNode } from "react";

export enum LaunchType {
  UserInitiated = "userInitiated",
  Background = "background",
}

export class Toast {
}

export namespace Toast {
  export enum Style {
    Failure = "failure",
  }
}

export enum Icon {
  ArrowClockwise = "arrow-clockwise-16",
  ArrowRight = "arrow-right-16",
  AppWindowSidebarRight = "app-window-sidebar-right-16",
  Bell = "bell-16",
  BulletPoints = "bullet-points-16",
  Checkmark = "checkmark-16",
  Circle = "circle-16",
  CircleFilled = "circle-filled-16",
  Clock = "clock-16",
  Headphones = "headphones-16",
  Mobile = "mobile-16",
  Music = "music-16",
  Pause = "pause-16",
  Play = "play-16",
  SpeakerOn = "speaker-on-16",
  Window = "window-16",
}

export enum Color {
  Red = "red",
  Green = "green",
  Blue = "blue",
  Yellow = "yellow",
  Orange = "orange",
  Purple = "purple",
  Magenta = "magenta",
  SecondaryText = "secondary-text",
  PrimaryText = "primary-text",
}

export const environment = {
  launchType: LaunchType.UserInitiated,
  commandName: "peon-ping-menu-bar",
};

export async function showHUD(_title: string): Promise<void> {}

export async function showToast(_options: {
  style: Toast.Style;
  title: string;
  message?: string;
}): Promise<Toast> {
  return new Toast();
}

export async function launchCommand(_options: {
  name: string;
  type: LaunchType;
}): Promise<void> {}

export function getPreferenceValues() {
  return {
    claudeConfigDir: undefined as string | undefined,
  };
}

export type ListProps = {
  children?: ReactNode;
  navigationTitle?: string;
  searchBarPlaceholder?: string;
  isShowingDetail?: boolean;
};

export type ListSectionProps = {
  title?: string;
  children?: ReactNode;
};

export type ListItemAccessory = {
  icon?: Icon;
  text?: string;
  tag?: { value: string; color: Color };
};

export type ListItemProps = {
  id?: string;
  title: string;
  subtitle?: string;
  icon?: Icon;
  actions?: ReactNode;
  accessories?: ListItemAccessory[];
  detail?: ReactNode;
};

export function List(_props: ListProps): null {
  return null;
}

List.Section = function ListSection(_props: ListSectionProps): null {
  return null;
};

List.Item = function ListItem(_props: ListItemProps): null {
  return null;
};

List.Item.Detail = function ListItemDetail(_props: {
  markdown?: string | null;
  metadata?: ReactNode;
  isLoading?: boolean;
}): null {
  return null;
};

List.Item.Detail.Metadata = function Metadata(_props: {
  children?: ReactNode;
}): null {
  return null;
};

List.Item.Detail.Metadata.Label = function MetadataLabel(_props: {
  title: string;
  text?: string | { value: string; color?: Color };
  icon?: string;
}): null {
  return null;
};

List.Item.Detail.Metadata.Separator = function MetadataSeparator(): null {
  return null;
};

List.Item.Detail.Metadata.TagList = function MetadataTagList(_props: {
  title: string;
  children?: ReactNode;
}): null {
  return null;
};

List.Item.Detail.Metadata.TagList.Item = function TagListItem(_props: {
  text?: string;
  color?: Color;
}): null {
  return null;
};

export type ActionPanelProps = {
  title?: string;
  children?: ReactNode;
};

export function ActionPanel(_props: ActionPanelProps): null {
  return null;
}

ActionPanel.Section = function ActionPanelSection(_props: {
  title?: string;
  children?: ReactNode;
}): null {
  return null;
};

export type ActionProps = {
  title: string;
  icon?: Icon;
  onAction?: () => void;
};

export function Action(_props: ActionProps): null {
  return null;
}

Action.Push = function ActionPush(_props: {
  title: string;
  target: ReactNode;
  icon?: Icon;
}): null {
  return null;
};

export function MenuBarExtra(_props: { children?: ReactNode }) {
  return null;
}

MenuBarExtra.Item = function MenuBarExtraItem(_props: {
  title?: string;
  children?: ReactNode;
  icon?: Icon;
  onAction?: () => void;
}): null {
  return null;
};

MenuBarExtra.Section = function MenuBarExtraSection(_props: {
  title?: string;
  children?: ReactNode;
}): null {
  return null;
};
