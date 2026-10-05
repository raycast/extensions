import { getPlatform, Platform } from "../../load/platform";

export enum Modifiers {
  command = "command down",
  control = "control down",
  option = "option down",
  shift = "shift down",
  win = "win down",
}

const macOSModifierSymbols: Map<Modifiers, string> = new Map([
  [Modifiers.command, "⌘"],
  [Modifiers.control, "⌃"],
  [Modifiers.option, "⌥"],
  [Modifiers.shift, "⇧"],
  [Modifiers.win, "Win"],
]);

const windowsModifierSymbols: Map<Modifiers, string> = new Map([
  [Modifiers.command, "Cmd"],
  [Modifiers.control, "Ctrl"],
  [Modifiers.option, "Alt"],
  [Modifiers.shift, "Shift"],
  [Modifiers.win, "Win"],
]);

export function getModifierSymbols(platform: Platform = getPlatform()): Map<Modifiers, string> {
  return platform === "macos" ? macOSModifierSymbols : windowsModifierSymbols;
}

export const modifierMapping: Map<string, Modifiers> = new Map([
  ["ctrl", Modifiers.control],
  ["shift", Modifiers.shift],
  ["opt", Modifiers.option],
  ["alt", Modifiers.option],
  ["cmd", Modifiers.command],
  ["win", Modifiers.win],
]);

export const modifierTokens: string[] = ["ctrl", "shift", "opt", "alt", "cmd", "win"];
