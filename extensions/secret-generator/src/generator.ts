import { Clipboard, getPreferenceValues, showHUD, showToast, Toast } from "@raycast/api";
import { randomBytes, randomInt } from "node:crypto";

type SecretKind = "password" | "simple password" | "webhook secret";

const PASSWORD_CHARACTERS = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%^&*-_";
const EASY_TO_READ_PASSWORD_CHARACTERS = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
export const URL_SAFE_CHARACTERS = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789-_";
export const UPPERCASE_CHARACTERS = "ABCDEFGHJKLMNPQRSTUVWXYZ";
export const LOWERCASE_CHARACTERS = "abcdefghjkmnpqrstuvwxyz";
export const DIGIT_CHARACTERS = "23456789";
export const SYMBOL_CHARACTERS = "!@#$%^&*-_";

/** Generates an unbiased random string using the operating system's cryptographically secure RNG. */
export function randomString(length: number, characters: string): string {
  const maximumUnbiasedByte = 256 - (256 % characters.length);
  let result = "";

  while (result.length < length) {
    const bytes = randomBytes(Math.ceil((length - result.length) * 1.2) + 4);

    for (const byte of bytes) {
      if (byte < maximumUnbiasedByte) {
        result += characters[byte % characters.length];
        if (result.length === length) break;
      }
    }
  }

  return result;
}

export function randomIndex(maxExclusive: number): number {
  return randomInt(0, maxExclusive);
}

/** Generates a password containing at least one character from every selected group. */
export function randomPassword(length: number, characterGroups: string[]): string {
  if (characterGroups.length === 0) throw new Error("Choose at least one character group.");
  if (length < characterGroups.length) throw new Error(`Choose a length of at least ${characterGroups.length}.`);

  const characters = characterGroups.join("");
  const result = characterGroups.map((group) => randomString(1, group));
  result.push(...randomString(length - result.length, characters));

  // Fisher–Yates shuffle preserves the character-group guarantee without biasing positions.
  for (let index = result.length - 1; index > 0; index--) {
    const swapIndex = randomIndex(index + 1);
    [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
  }

  return result.join("");
}

export async function deliverSecret(secret: string, label: string): Promise<void> {
  const preferences = getPreferenceValues<Preferences>();

  if (preferences.delivery === "paste") {
    await Clipboard.paste(secret);
    await showHUD(`${label} pasted`);
    return;
  }

  // Generated values are credentials; keep them out of Raycast Clipboard History.
  await Clipboard.copy(secret, { concealed: true });

  if (preferences.delivery === "copy-and-close") {
    await showHUD(`${label} copied`);
    return;
  }

  await showToast({ style: Toast.Style.Success, title: `${label} copied` });
}

export async function generateAndDeliver(length: number, kind: SecretKind): Promise<void> {
  const preferences = getPreferenceValues<Preferences>();
  const characters =
    kind === "webhook secret"
      ? URL_SAFE_CHARACTERS
      : kind === "simple password"
        ? EASY_TO_READ_PASSWORD_CHARACTERS
        : preferences.easyToRead
          ? EASY_TO_READ_PASSWORD_CHARACTERS
          : PASSWORD_CHARACTERS;
  const secret =
    kind === "password"
      ? randomPassword(
          length,
          preferences.easyToRead
            ? [UPPERCASE_CHARACTERS, LOWERCASE_CHARACTERS, DIGIT_CHARACTERS]
            : [UPPERCASE_CHARACTERS, LOWERCASE_CHARACTERS, DIGIT_CHARACTERS, SYMBOL_CHARACTERS],
        )
      : randomString(length, characters);

  await deliverSecret(secret, `${length}-character ${kind}`);
}
