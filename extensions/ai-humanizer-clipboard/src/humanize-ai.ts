import { Clipboard, showHUD } from "@raycast/api";

type ReplacementFunction = (match: string) => string;

export default async function main() {
  try {
    const text = await Clipboard.readText();
    if (!text) {
      await showHUD("Clipboard is empty");
      return;
    }

    const patterns: { regex: RegExp; replacement: string | ReplacementFunction }[] = [
      { regex: /[\p{Cf}]/gu, replacement: "" },
      { regex: /[\u00A0\u1680\u2000-\u200A\u202F\u205F\u3000]/g, replacement: " " },
      { regex: /[\u2010-\u2015\u2212]/g, replacement: "-" },
      {
        regex: /[\u2018-\u201F\u2032\u2033\u2035\u2036\u00AB\u00BB]/g,
        replacement: (c: string) => (["'", "'", "‚", "‛"].includes(c) ? "'" : '"'),
      },
      {
        regex: /[\u2026\u2022\u00B7\uFF01-\uFF5E]/g,
        replacement: (c: string) =>
          c === "…" ? "..." : ["•", "·"].includes(c) ? "-" : String.fromCharCode(c.charCodeAt(0) - 0xfee0),
      },
      { regex: /[ \t]+\n/g, replacement: "\n" },
      { regex: /^[-*_]{3,}$/gm, replacement: "" },
      { regex: /[\u2E3A-\u2E3B]/g, replacement: "" },
      { regex: /\n{3,}/g, replacement: "\n\n" },
    ];

    let cleaned = text;
    patterns.forEach(({ regex, replacement }) => {
      if (typeof replacement === "string") {
        cleaned = cleaned.replace(regex, replacement);
      } else {
        cleaned = cleaned.replace(regex, replacement);
      }
    });

    await Clipboard.paste(cleaned);
    await showHUD("🧼 Text cleaned and copied");
  } catch (err) {
    await showHUD("❌ Error cleaning text");
    console.error(err);
  }
}
