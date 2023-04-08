import { getPreferenceValues } from "@raycast/api";
import fs from "fs";
import { Hotkey } from "./types";

const HYPERKEY = getPreferenceValues().hyperkey;
const SKHDPATH = getPreferenceValues().skhdPath;

const KEY_SYMBOLS: { [key: string]: string } = {
  cmd: "⌘",
  opt: "⌥",
  ctrl: "⌃",
  shift: "⇧",
  space: "␣",
  hyper: "♦",
  left: "←",
  right: "→",
  up: "↑",
  down: "↓",
};

function formatKeys(keys: string): string {
  // replace hyper with the hyperkey
  if (HYPERKEY) {
    keys = keys.replace(HYPERKEY, "hyper");
  }

  // split at spaces, +, and - and trim
  const keyArray = keys.split(/[\s+-]/).map((key) => key.trim());

  // replace the text with the symbols
  for (const key of keyArray) {
    if (key in KEY_SYMBOLS) {
      keyArray[keyArray.indexOf(key)] = KEY_SYMBOLS[key];
    }
  }

  return keyArray.join(" ");
}

export default function loadHotkeys(): Hotkey[] {
  try {
    const lines = fs
      .readFileSync(SKHDPATH, "utf-8")
      .split("\n")
      .filter((line: string) => line.trim() !== "" && !line.trim().startsWith("#"));

    const hotkeys: Hotkey[] = [];
    for (const line of lines) {
      const [key, command] = line.split(":").map((s) => s.trim());
      hotkeys.push({ key, shellCommand: command });
    }

    for (const hotkey of hotkeys) {
      hotkey.key = formatKeys(hotkey.key);
    }

    return hotkeys;
  } catch (error) {
    return [];
  }
}
