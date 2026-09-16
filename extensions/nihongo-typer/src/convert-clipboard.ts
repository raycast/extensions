import { Clipboard, getPreferenceValues, showHUD } from "@raycast/api";
import { JAPANESE_SCRIPT, toHiraganaFinal, toKatakanaFinal } from "./romaji";
import { romajiForJapanese } from "./dictionary";

export default async function Command() {
  const { clipboardTarget } =
    getPreferenceValues<Preferences.ConvertClipboard>();

  const text = (await Clipboard.readText())?.trim();
  if (!text) {
    await showHUD("Clipboard is empty");
    return;
  }

  // Mirrors the view command's two directions: Japanese in the clipboard comes
  // back as Romaji, anything else is treated as Romaji to convert.
  const reverse = JAPANESE_SCRIPT.test(text);
  let converted: string;
  if (reverse) {
    const result = romajiForJapanese(text);
    if (result.kind === "unknown") {
      await showHUD(`No known reading for "${text}"`);
      return;
    }
    if (result.kind === "ambiguous") {
      // Pasting a guess into whatever the user is typing in would be worse than
      // doing nothing; the view command lists every reading to choose from.
      const options = result.readings.map((r) => r.reading).join(" / ");
      await showHUD(
        `"${text}" has several readings (${options}) — use Convert Romaji to Kana`,
      );
      return;
    }
    converted = result.romaji;
  } else {
    converted =
      clipboardTarget === "katakana"
        ? toKatakanaFinal(text)
        : toHiraganaFinal(text);
  }

  if (converted === text) {
    await showHUD("Nothing to convert");
    return;
  }

  await Clipboard.paste(converted);
  const label = reverse
    ? "Romaji"
    : clipboardTarget === "katakana"
      ? "Katakana"
      : "Hiragana";
  await showHUD(`Converted to ${label}`);
}
