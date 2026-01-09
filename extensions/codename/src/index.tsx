import { Clipboard, getPreferenceValues, showToast } from "@raycast/api";

const UPPERCASE_LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const LOWERCASE_LETTERS = "abcdefghijklmnopqrstuvwxyz";
const DIGITS = "0123456789";

function secureRandom(min: number, max: number): number {
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    const array = new Uint32Array(1);
    crypto.getRandomValues(array);
    return Math.floor((array[0] / (0xffffffff + 1)) * (max - min + 1)) + min;
  }
  return Math.floor(Math.random() * (max - min + 1) + min);
}

function generateFromTemplate(template: string): string {
  try {
    return template.replace(/\{[LlDd]\}/g, (match) => {
      switch (match) {
        case "{L}":
          return UPPERCASE_LETTERS[secureRandom(0, UPPERCASE_LETTERS.length - 1)];
        case "{l}":
          return LOWERCASE_LETTERS[secureRandom(0, LOWERCASE_LETTERS.length - 1)];
        case "{D}":
        case "{d}":
          return DIGITS[secureRandom(0, DIGITS.length - 1)];
        default:
          return match;
      }
    });
  } catch (error) {
    console.error("Error parsing template:", error);
    return template;
  }
}

function generateCodename(preferences: ExtensionPreferences): string {
  try {
    const template =
      preferences.customFormat && preferences.customFormat.trim() ? preferences.customFormat.trim() : "{L}{L}-{D}{D}";

    return generateFromTemplate(template);
  } catch (error) {
    console.error("Error generating codename:", error);
    return "AB-12";
  }
}

export default async function Command() {
  const preferences = getPreferenceValues<Preferences>();
  const codename = generateCodename(preferences);

  await Clipboard.copy(codename);
  await showToast({ title: "Copied", message: codename });
}
