import {
  showHUD,
  Clipboard,
  getSelectedText,
  getPreferenceValues,
} from "@raycast/api";
import { en_ru, ru_en } from "./Dict";
import {
  getAvailableInputSourceIds,
  selectInputSource,
} from "swift:../swift/Punto";

interface Preferences {
  latLayoutID: string;
  cyrLayoutID: string;
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
  const languageIds =
    (await getAvailableInputSourceIds()) as unknown as string[];
  // console.log("installed layout names are " + languageIds.join(", "));
  // console.log("target layout is " + targetLayout);

  const targetLayoutID =
    targetLayout === Layout.LAT
      ? preferences.latLayoutID
      : preferences.cyrLayoutID;

  if (!languageIds.includes(targetLayoutID)) {
    await showHUD(
      "Layout " +
        targetLayoutID +
        " is not installed. Please install it or update the preferences." +
        `Available layouts include: ${languageIds.join(", ")}`,
    );
    return;
  }

  // console.log("switching to " + targetLayoutID);

  await selectInputSource(targetLayoutID);
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
