import { TerminalSettings } from "../types";

export interface TerminalSettingOption<T = string> {
  value: T;
  title: string;
}

export interface TerminalSettingConfig<K extends keyof TerminalSettings> {
  key: K;
  title: string;
  options: TerminalSettingOption<TerminalSettings[K]>[];
}

// Caret Character Options
export const CARET_CHAR_OPTIONS: TerminalSettingOption<string>[] = [
  { value: "█", title: "Block (█)" },
  { value: "|", title: "Pipe (|)" },
  { value: "_", title: "Underscore (_)" },
];

// Style Options
export const STYLE_CORRECT_OPTIONS: TerminalSettingOption<string>[] = [
  { value: "none", title: "Normal" },
  { value: "bold", title: "Bold" },
  { value: "italic", title: "Italic" },
  { value: "link", title: "Link" },
];

export const STYLE_WRONG_OPTIONS: TerminalSettingOption<string>[] = [
  { value: "strikethrough", title: "Strikethrough" },
  { value: "italic", title: "Italic" },
  { value: "none", title: "Normal" },
];

export const STYLE_CURRENT_OPTIONS: TerminalSettingOption<string>[] = [
  { value: "link", title: "Link" },
  { value: "italic", title: "Italic" },
  { value: "bold", title: "Bold" },
  { value: "none", title: "Normal" },
];

export const TERMINAL_SETTINGS_CONFIG: TerminalSettingConfig<
  keyof TerminalSettings
>[] = [
  {
    key: "caretChar",
    title: "Caret Character",
    options: CARET_CHAR_OPTIONS,
  },
  {
    key: "styleCorrect",
    title: "Correct Text",
    options: STYLE_CORRECT_OPTIONS,
  },
  {
    key: "styleWrong",
    title: "Wrong Text",
    options: STYLE_WRONG_OPTIONS,
  },
  {
    key: "styleCurrent",
    title: "Current Word",
    options: STYLE_CURRENT_OPTIONS,
  },
];

export const DEFAULT_TERM: TerminalSettings = {
  styleCorrect: "link",
  styleWrong: "strikethrough",
  styleCurrent: "bold",
  caretChar: "|",
};
