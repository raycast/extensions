import { showHUD, Clipboard, getSelectedText, LaunchProps } from "@raycast/api";

const superscriptMap: Record<string, string> = {
  "0": "⁰",
  "1": "¹",
  "2": "²",
  "3": "³",
  "4": "⁴",

  "5": "⁵",
  "6": "⁶",
  "7": "⁷",
  "8": "⁸",
  "9": "⁹",

  a: "ᵃ",
  b: "ᵇ",
  c: "ᶜ",
  d: "ᵈ",
  e: "ᵉ",

  f: "ᶠ",
  g: "ᵍ",
  h: "ʰ",
  i: "ᶦ",
  j: "ʲ",

  k: "ᵏ",
  l: "ˡ",
  m: "ᵐ",
  n: "ⁿ",
  o: "ᵒ",

  p: "ᵖ",
  q: "ᑫ",
  r: "ʳ",
  s: "ˢ",
  t: "ᵗ",

  u: "ᵘ",
  v: "ᵛ",
  w: "ʷ",
  x: "ˣ",
  y: "ʸ",

  z: "ᶻ",
  A: "ᴬ",
  B: "ᴮ",
  C: "ᶜ",
  D: "ᴰ",

  E: "ᴱ",
  F: "ᶠ",
  G: "ᴳ",
  H: "ᴴ",
  I: "ᴵ",

  J: "ᴶ",
  K: "ᴷ",
  L: "ᴸ",
  M: "ᴹ",
  N: "ᴺ",

  O: "ᴼ",
  P: "ᴾ",
  Q: "Q",
  R: "ᴿ",
  S: "ˢ",

  T: "ᵀ",
  U: "ᵁ",
  V: "ⱽ",
  W: "ᵂ",
  X: "ˣ",

  Y: "ʸ",
  Z: "ᶻ",
  "+": "⁺",
  "-": "⁻",
  "=": "⁼",

  "(": "⁽",
  ")": "⁾",
};

function toSuperscript(text: string): string {
  return text
    .split("")
    .map((char) => superscriptMap[char] || char)
    .join("");
}

interface Arguments {
  text?: string;
}

export default async function main(props: LaunchProps<{ arguments: Arguments }>) {
  try {
    let text = props.arguments.text;

    if (!text) {
      try {
        text = await getSelectedText();
      } catch (error) {
        await showFailureToast(error, { title: "Failed to get selected text" });
        return;
      }
    }

    if (!text || text.trim() === "") {
      await showHUD("No text selected or provided");
      return;
    }

    const superscriptText = toSuperscript(text);
    await Clipboard.copy(superscriptText);

    await showHUD(`Copied superscript text to clipboard: ${superscriptText}`);
  } catch (_error) {
    console.error("Error converting text to superscript:", _error);
    await showHUD("Error converting text to superscript");
  }
}
