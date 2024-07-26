import { keyToAppleScriptCode } from "./constants";

export type Key = keyof typeof keyToAppleScriptCode;
export type Modifier = "command" | "control" | "shift" | "option" | "";

export interface ShortcutToRun {
  key: Key;
  modifiers: Modifier[];
}

export interface ApplicationShortcut {
  type: "app";
  applicationName: string;
  shortcutToRun: ShortcutToRun;
}

export interface WebShortcut {
  type: "web";
  websiteUrl: string;
  shortcutToRun: ShortcutToRun;
}

export interface CommandRecord {
  id: string;
  name: string;
  shortcuts: (ApplicationShortcut | WebShortcut)[];
  isPredefined: boolean;
}

export enum FormFields {
  commandName = "commandName",
  apps = "apps",
  urls = "urls",
}

interface IFormValuesAppOrUrlShortcuts {
  [key: string]: (Key | Modifier)[];
}

interface IFormValuesOther {
  [FormFields.commandName]: string;
  [FormFields.apps]: string[];
  [FormFields.urls]: string;
}

export type IFormValues = IFormValuesOther & IFormValuesAppOrUrlShortcuts;
