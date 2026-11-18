import { Clipboard } from "@raycast/api";
import { DateTime } from "luxon";
import { getSelectedTextContent } from "../../utils/utils";

export const templates = [
  // --- Date & Time (Luxon Implementation) ---
  {
    placeholder: "{time}", // Example: 14:35:02
    replacement: () => DateTime.now().toFormat("HH:mm:ss"),
  },
  {
    placeholder: "{date}", // Example: 2025-04-16
    replacement: () => DateTime.now().toFormat("yyyy-MM-dd"),
  },
  {
    placeholder: "{week}", // ISO 8601 week number, zero-padded. Example: 16
    replacement: () => DateTime.now().toFormat("WW"),
  },
  {
    placeholder: "{year}", // Example: 2025
    replacement: () => DateTime.now().toFormat("yyyy"),
  },
  {
    placeholder: "{month}", // Full month name. Example: April
    replacement: () => DateTime.now().toFormat("MMMM"),
  },
  {
    placeholder: "{day}", // Full weekday name. Example: Wednesday
    replacement: () => DateTime.now().toFormat("cccc"),
  },
  {
    placeholder: "{hour}", // 24-hour format, zero-padded. Example: 14
    replacement: () => DateTime.now().toFormat("HH"),
  },
  {
    placeholder: "{minute}", // Zero-padded. Example: 35
    replacement: () => DateTime.now().toFormat("mm"),
  },
  {
    placeholder: "{second}", // Zero-padded. Example: 02
    replacement: () => DateTime.now().toFormat("ss"),
  },
  {
    placeholder: "{millisecond}", // Zero-padded. Example: 045
    replacement: () => DateTime.now().toFormat("SSS"),
  },
  {
    placeholder: "{timestamp}", // Milliseconds since Unix epoch
    replacement: () => DateTime.now().toMillis().toString(),
  },
  {
    placeholder: "{zettelkastenID}",
    replacement: () => DateTime.now().toMillis().toString(),
  },

  // --- System Interaction ---
  {
    placeholder: "{clipboard}",
    replacement: async () => (await Clipboard.readText()) || "",
  },
  {
    placeholder: "{clip}",
    replacement: async () => (await Clipboard.readText()) || "",
  },
  {
    placeholder: "{selection}",
    replacement: async () => (await getSelectedTextContent()) || "",
  },
  {
    placeholder: "{selected}",
    replacement: async () => (await getSelectedTextContent()) || "",
  },
  {
    placeholder: "{newline}",
    replacement: () => "\n",
  },
  {
    placeholder: "{nl}",
    replacement: () => "\n",
  },
  // Add Luxon format tokens as templates
  ...[
    "S",
    "u",
    "SSS",
    "s",
    "ss",
    "uu",
    "uuu",
    "m",
    "mm",
    "h",
    "hh",
    "H",
    "HH",
    "Z",
    "ZZ",
    "ZZZ",
    "ZZZZ",
    "ZZZZZ",
    "z",
    "a",
    "d",
    "dd",
    "c",
    "ccc",
    "cccc",
    "ccccc",
    "E",
    "EEE",
    "EEEE",
    "EEEEE",
    "L",
    "LL",
    "LLL",
    "LLLL",
    "LLLLL",
    "M",
    "MM",
    "MMM",
    "MMMM",
    "MMMMM",
    "y",
    "yy",
    "yyyy",
    "yyyyyy",
    "G",
    "GG",
    "GGGGG",
    "kk",
    "kkkk",
    "W",
    "WW",
    "n",
    "nn",
    "ii",
    "iiii",
    "o",
    "ooo",
    "q",
    "qq",
    "X",
    "x",
  ].map((format) => ({
    placeholder: `{${format}}`,
    replacement: () => DateTime.now().toFormat(format),
  })),
];

export const templateMap = new Map(templates.map((t) => [t.placeholder, t.replacement]));
