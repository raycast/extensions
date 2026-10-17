/**
 * Offline formatter — no AI, instant, free.
 *
 * Philosophy: PRESERVE, don't invent. The old version guessed paragraph breaks
 * by chopping every 3rd sentence, which mangled real structure. This version
 * keeps whatever structure already exists (bold, italic, bullets, numbered
 * lists, line breaks) and only normalizes spacing. It does NOT try to guess
 * paragraph boundaries inside a true wall-of-text — that's the AI engine's job.
 *
 * Output is markdown (preserving **bold** / *italic* / - bullets), which then
 * gets converted to HTML for the rich-text clipboard flavor by the caller.
 */

import { restoreParagraphs } from "./restore-paragraphs";

const ABBREVIATIONS = [
  "Mr",
  "Mrs",
  "Ms",
  "Dr",
  "Prof",
  "Sr",
  "Jr",
  "Inc",
  "Ltd",
  "Co",
  "Corp",
  "vs",
  "etc",
  "e.g",
  "i.e",
  "approx",
  "est",
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
  "U.S",
  "U.K",
  "A.I",
];

function protectAbbreviations(text: string): [string, Map<string, string>] {
  const map = new Map<string, string>();
  let t = text;
  ABBREVIATIONS.forEach((abbrev, i) => {
    const key = `__ABBREV${i}__`;
    const escaped = abbrev.replace(/\./g, "\\.");
    const regex = new RegExp(`\\b${escaped}\\.`, "g");
    if (regex.test(t)) {
      map.set(key, `${abbrev}.`);
      t = t.replace(new RegExp(`\\b${escaped}\\.`, "g"), key);
    }
  });
  return [t, map];
}

function restoreAbbreviations(text: string, map: Map<string, string>): string {
  let t = text;
  map.forEach((val, key) => {
    t = t.replace(new RegExp(key, "g"), val);
  });
  return t;
}

export function offlineFormat(text: string): string {
  let t = text.trim();
  t = t.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  const [protectedText, abbrevMap] = protectAbbreviations(t);
  t = protectedText;

  // Break inline bullet glyphs onto their own lines, normalized to markdown "- ".
  // Handles "foo • bar • baz" jammed onto one line.
  if (/[^\n]\s*[•●▪◦‣·]\s/.test(t)) {
    t = t.replace(/\s*[•●▪◦‣·]\s*/g, "\n- ");
    t = t.replace(/^\n- /, "- ");
  } else {
    // Normalize existing leading bullet glyphs to markdown "- ".
    t = t.replace(/^[ \t]*[•●▪◦‣·]\s+/gm, "- ");
  }

  // Split a numbered item that got glued to the end of a sentence:
  // "...done. 2. Next thing" -> newline before "2.".
  t = t.replace(/([.!?])\s+(\d+\.)\s+/g, "$1\n$2 ");

  // Ensure a blank line BEFORE the first item of a list and AFTER the last —
  // but a SINGLE newline between consecutive items (a "tight" list). Done as a
  // line walk so we don't accidentally space out items relative to each other.
  const isItem = (line: string) => /^(- |\d+\. )/.test(line.trimStart());
  const lines = t.split("\n");
  const out: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const prev = i > 0 ? lines[i - 1] : "";
    const curItem = isItem(line);
    const prevItem = isItem(prev);
    // Entering a list from a non-list, non-blank line -> insert one blank line.
    if (curItem && !prevItem && prev.trim() !== "" && i > 0) out.push("");
    // Leaving a list into a non-list, non-blank line -> insert one blank line.
    if (!curItem && line.trim() !== "" && prevItem) out.push("");
    out.push(line);
  }
  t = out.join("\n");

  // Last: if what we have is still one undifferentiated block, restore paragraph
  // breaks from linguistic cues. Runs while abbreviations are still masked so a
  // period inside "e.g." is never mistaken for a sentence boundary.
  t = restoreParagraphs(t);

  t = restoreAbbreviations(t, abbrevMap);

  // Collapse 3+ blank lines down to a single blank line (one paragraph gap).
  t = t.replace(/\n{3,}/g, "\n\n");

  return t.trim();
}
