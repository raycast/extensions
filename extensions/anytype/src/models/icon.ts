export enum IconFormat {
  Emoji = "emoji",
  File = "file",
  Icon = "icon",
}

export interface ObjectIcon {
  format: IconFormat;
  emoji?: string;
  file?: string;
  name?: string;
  color?: string;
}
