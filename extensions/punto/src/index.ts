import {
  showHUD,
  Clipboard,
  getSelectedText,
  getPreferenceValues,
} from "@raycast/api";
import { en_ru, ru_en } from "./Dict";
import { exec as Exec } from "child_process";
import { promisify } from "util";

const exec = promisify(Exec);
interface Preferences {
  layoutSwitchModifier: string;
  latLayoutName: string;
  cyrLayoutName: string;
  showSuccessHUD: boolean;
}

enum Layout {
  LAT = "LAT",
  CYR = "CYR",
}

export default async function main() {
  // genMap();
  // return;
  let input = "";
  try {
    input = await getSelectedText();
  } catch (error) {
    console.log("unable to get selected text", error);
  }

  if (input === "" || input.trim() === "") {
    await showHUD("Nothing to switch");
    return;
  }

  const switchedText = switchStringLayout(input);
  // console.log(switchedText);
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
  // console.log("installed layout names are " + languages.join(", "));
  // console.log("target layout is " + targetLayout);
  const targetLayoutName =
    targetLayout === Layout.LAT
      ? preferences.latLayoutName
      : preferences.cyrLayoutName;
  if (!languages.includes(targetLayoutName)) {
    await showHUD(
      "Layout " +
        targetLayoutName +
        " is not installed. Please install it or update the preferences",
    );
    return;
  }

  const currentLayoutName = await getActiveLayoutName();
  // console.log("current layout name is " + currentLayoutName);

  if (currentLayoutName === targetLayoutName) {
    // console.log("already in target layout");
    return;
  }

  // console.log("switching to " + targetLayoutName);
  let attempts = languages.length;

  while (attempts > 0) {
    const modifierKey = preferences.layoutSwitchModifier;
    await exec(
      `osascript -e 'tell application "System Events" to keystroke " " using ` +
        modifierKey +
        ` down'`,
    );
    const activeLayoutName = await getActiveLayoutName();
    // console.log("active layout after switch is " + activeLayoutName);
    if (activeLayoutName === targetLayoutName) {
      if (preferences.showSuccessHUD) await showHUD("Layout switched!");
      // console.log("layout switched");
      return;
    }
    if (currentLayoutName === activeLayoutName) {
      break;
    }
    attempts--;
  }

  await showHUD("Failed to switch layout, please check the preferences");
  // console.log("failed to switch layout");
}

function detectLayout(input: string): Layout {
  const array = input.split("");
  const enChars = array.filter((c) => en_ru.has(c)).length;
  const ruChars = array.filter((c) => ru_en.has(c)).length;
  return enChars > ruChars ? Layout.LAT : Layout.CYR;
}

function switchCharacterLayout(char: string): string {
  if (en_ru.has(char)) {
    // console.log(char + " detected in en dict")
    return en_ru.get(char) ?? char;
  } else {
    // console.log(char + " is probably detected in ru dict"),
    return ru_en.get(char) ?? char;
  }
}

async function getInstalledLayoutNames(): Promise<string[]> {
  const result = await exec(
    `defaults read ~/Library/Preferences/com.apple.HIToolbox.plist AppleEnabledInputSources`,
  );
  return result.stdout
    .split("\n")
    .filter((line) => line.includes("KeyboardLayout Name"))
    .map((line) => line.split("=")[1].trim().replace(/;/g, ""));
}

async function getActiveLayoutName(): Promise<string> {
  const result = await exec(
    `defaults read ~/Library/Preferences/com.apple.HIToolbox.plist AppleSelectedInputSources`,
  );
  return result.stdout
    .split("\n")
    .filter((line) => line.includes("KeyboardLayout Name"))
    .map((line) => line.split("=")[1].trim().replace(/;/g, ""))[0];
}
