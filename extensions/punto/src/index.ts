import {
  showHUD,
  Clipboard,
  getSelectedText,
  getPreferenceValues,
} from "@raycast/api";
import {
  en_ru,
  ru_en,
  ru_en_phonetic,
  en_ru_phonetic,
  en_uk,
  uk_en,
  uk_en_phonetic,
  en_uk_phonetic,
} from "./Dict";
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

  const preferences = getPreferenceValues<Preferences>();
  const switchedText = switchStringLayout(input, preferences);
  // console.log(switchedText);
  await Clipboard.paste(switchedText);

  await switchKeyboardLayout(preferences, detectLayout(switchedText));
}

function switchStringLayout(string: string, preferences: Preferences): string {
  const chars: string[] = string.split("");
  return chars.map((ch) => switchCharacterLayout(ch, preferences)).join("");
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

  const latChars = array.filter((c) => /[a-zA-Z]/.test(c)).length;
  const cyrChars = array.filter((c) => /[а-яА-ЯёЁіІїЇєЄґҐ]/.test(c)).length;

  return latChars > cyrChars ? Layout.LAT : Layout.CYR;
}

function switchCharacterLayout(char: string, preferences: Preferences): string {
  let cyrToLatMap = ru_en;
  let latToCyrMap = en_ru;

  if (preferences.cyrLayoutID === "com.apple.keylayout.Russian-Phonetic") {
    cyrToLatMap = ru_en_phonetic;
    latToCyrMap = en_ru_phonetic;
  } else if (
    preferences.cyrLayoutID === "com.apple.keylayout.Ukrainian-QWERTY"
  ) {
    cyrToLatMap = uk_en_phonetic;
    latToCyrMap = en_uk_phonetic;
  } else if (preferences.cyrLayoutID === "com.apple.keylayout.Ukrainian-PC") {
    cyrToLatMap = uk_en;
    latToCyrMap = en_uk;
  }

  if (latToCyrMap.has(char)) {
    // console.log(char + " detected in en dict")
    return latToCyrMap.get(char) ?? char;
  } else {
    // console.log(char + " is probably detected in ru dict"),
    return cyrToLatMap.get(char) ?? char;
  }
}
