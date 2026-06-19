import { LaunchProps, showToast, Toast } from "@raycast/api";
import { wrapSelectedText } from "./utils";

// Known bracket/quote pairs: opening → closing
const PAIRS: Record<string, string> = {
  "(": ")",
  "[": "]",
  "{": "}",
  "<": ">",
  "\u00AB": "\u00BB",
  "\u2039": "\u203A",
  "\u201C": "\u201D",
  "\u2018": "\u2019",
};

/**
 * Build the reverse map (closing → opening) so we can detect
 * inputs given as the closing character too, e.g. "}" → wrap with { }
 *
 * Note: if a character were ever used as both an opening and closing pair
 * (i.e. symmetric, like " in some locales), Object.fromEntries would silently
 * overwrite the earlier entry. All current pairs are asymmetric, so this is safe.
 */
const REVERSE_PAIRS: Record<string, string> = Object.fromEntries(Object.entries(PAIRS).map(([k, v]) => [v, k]));

export default async function Command(props: LaunchProps<{ arguments: Arguments.WrapCustom }>) {
  const input = props.arguments.wrapper.trim();

  if (input.length === 0) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Invalid input",
      message: "Enter at least 1 character",
    });
    return;
  }

  // --- 1. Single character ---
  if (input.length === 1) {
    const ch = input;
    if (PAIRS[ch]) {
      // e.g. "<" → <text>
      await wrapSelectedText(ch, PAIRS[ch]);
    } else if (REVERSE_PAIRS[ch]) {
      // e.g. ">" → <text>
      await wrapSelectedText(REVERSE_PAIRS[ch], ch);
    } else {
      // symmetric char, e.g. "*" → *text*
      await wrapSelectedText(ch, ch);
    }
    return;
  }

  // --- 2. All-same characters (e.g. "**", "$$", "###") ---
  const allSame = input.split("").every((c) => c === input[0]);
  if (allSame) {
    const ch = input[0];
    if (PAIRS[ch] || REVERSE_PAIRS[ch]) {
      // e.g. "<<" → <<text>>, "((" → ((text))
      const left = PAIRS[ch] ? ch : REVERSE_PAIRS[ch];
      const right = PAIRS[ch] ? PAIRS[ch] : ch;
      const repeated = input.length;
      await wrapSelectedText(left.repeat(repeated), right.repeat(repeated));
    } else {
      // e.g. "**" → **text**, "$$" → $$text$$
      await wrapSelectedText(input, input);
    }
    return;
  }

  // --- 3. Even-length mixed characters – split in half ---
  if (input.length % 2 === 0) {
    const mid = input.length / 2;
    await wrapSelectedText(input.slice(0, mid), input.slice(mid));
    return;
  }

  // --- 4. Odd-length mixed – use as symmetric wrapper ---
  await wrapSelectedText(input, input);
}
