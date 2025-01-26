import {
  showHUD,
  Clipboard,
  getSelectedText,
  getPreferenceValues,
} from "@raycast/api";
import { en_ua, ua_en } from "./Dict"; // Update to use Ukrainian dictionaries
import { exec as Exec } from "child_process";
import { promisify } from "util";

const exec = promisify(Exec);
interface Preferences {
  layoutSwitchModifier: string;
  enLayoutName: string;
  uaLayoutName: string; // Change from ukLayoutName to uaLayoutName
  showSuccessHUD: boolean;
}

enum Layout {
  EN = "EN",
  UA = "UA", // Change from UK to UA
}

export default async function main() {
  let input = "";
  try {
    input = await getSelectedText();
  } catch (error) {
    console.log("Unable to get selected text", error);
  }

  if (input === "" || input.trim() === "") {
    await showHUD("Nothing to switch");
    return;
  }

  const switchedText = switchStringLayout(input);
  await Clipboard.paste(switchedText);

  const preferences = getPreferenceValues<Preferences>();
  await switchKeyboardLayout(preferences, detectLayout(switchedText));
}

function switchStringLayout(string: string): string {
  const chars: string[] = string.split("");
  return chars.map((ch) => switchCharacterLayout(ch)).join("");
}

async function switchKeyboardLayout(
  preferences: Preferences,
  targetLayout: Layout,
): Promise<void> {
  const languages = await getInstalledLayoutNames();
  const targetLayoutName =
    targetLayout === Layout.EN
      ? preferences.enLayoutName
      : preferences.uaLayoutName; // Change from ukLayoutName to uaLayoutName

  if (!languages.includes(targetLayoutName)) {
    await showHUD(
      "Layout " +
        targetLayoutName +
        " is not installed. Please install it or update the preferences",
    );
    return;
  }

  const currentLayoutName = await getActiveLayoutName();

  if (currentLayoutName === targetLayoutName) {
    return; // Already in target layout
  }

  let attempts = languages.length;

  while (attempts > 0) {
    const modifierKey = preferences.layoutSwitchModifier;
    await exec(
      `osascript -e 'tell application "System Events" to keystroke " " using ` +
        modifierKey +
        ` down'`,
    );

    const activeLayoutName = await getActiveLayoutName();
    if (activeLayoutName === targetLayoutName) {
      if (preferences.showSuccessHUD) await showHUD("Layout switched!");
      return; // Successfully switched layout
    }

    attempts--;
  }

  await showHUD("Failed to switch layout, please check the preferences");
}

function detectLayout(input: string): Layout {
  const array = input.split("");
  const enChars = array.filter((c) => en_ua.has(c)).length; // Use new dictionary
  const uaChars = array.filter((c) => ua_en.has(c)).length; // Use new dictionary
  return enChars > uaChars ? Layout.EN : Layout.UA; // Change from RU to UA
}

function switchCharacterLayout(char: string): string {
  if (en_ua.has(char)) {
    return en_ua.get(char) ?? char; // Use new dictionary
  } else {
    return ua_en.get(char) ?? char; // Use new dictionary
  }
}

async function getInstalledLayoutNames(): Promise<string[]> {
  const result = await exec(
    `defaults read ~/Library/Preferences/com.apple.HIToolbox.plist AppleEnabledInputSources`,
  );
  return result.stdout
    .split("\n")
    .filter((line) => line.includes("KeyboardLayout Name"))
    .map((line) => {
      const match = line.match(/=\s*"?(.*?)"?\s*;/);
      return match ? match[1] : "";
    })
    .filter((name) => name);
}

async function getActiveLayoutName(): Promise<string> {
  const result = await exec(
    `defaults read ~/Library/Preferences/com.apple.HIToolbox.plist AppleSelectedInputSources`,
  );
  const names = result.stdout
    .split("\n")
    .filter((line) => line.includes("KeyboardLayout Name"))
    .map((line) => {
      const match = line.match(/=\s*"?(.*?)"?\s*;/);
      return match ? match[1] : "";
    })
    .filter((name) => name);
  return names[0];
}
