export enum IconFormat {
  Emoji = "emoji",
  File = "file",
  Icon = "icon",
}

export enum Color {
  Grey = "grey",
  Yellow = "yellow",
  Orange = "orange",
  Red = "red",
  Pink = "pink",
  Purple = "purple",
  Blue = "blue",
  Ice = "ice",
  Teal = "teal",
  Lime = "lime",
}

export interface EmojiIcon {
  format: IconFormat.Emoji;
  emoji: string;
}

export interface FileIcon {
  format: IconFormat.File;
  file: string;
}

export interface NamedIcon {
  format: IconFormat.Icon;
  name: string;
  color?: Color | string;
}

export type ObjectIcon = EmojiIcon | FileIcon | NamedIcon;
