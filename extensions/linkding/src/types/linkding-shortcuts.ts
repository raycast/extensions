import { Keyboard } from "@raycast/api";

const DELETE_SHORTCUT: Keyboard.Shortcut = {
  modifiers: ["ctrl"],
  key: "x",
};

const COPY_SHORTCUT: Keyboard.Shortcut = {
  modifiers: ["ctrl"],
  key: "c",
};

export class LinkdingShortcut {
  static COPY_SHORTCUT = COPY_SHORTCUT;
  static DELETE_SHORTCUT = DELETE_SHORTCUT;
}
