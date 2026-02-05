export type ScriptType =
  | "latin"
  | "cyrillic"
  | "cjk"
  | "arabic"
  | "devanagari"
  | "unknown";

export function detectScript(text: string): ScriptType {
  const trimmed = text.trim();
  if (!trimmed) return "unknown";

  // Count characters in each script range
  let latin = 0;
  let cyrillic = 0;
  let cjk = 0;
  let arabic = 0;
  let devanagari = 0;

  for (const char of trimmed) {
    const code = char.codePointAt(0)!;
    if (
      (code >= 0x0041 && code <= 0x024f) ||
      (code >= 0x1e00 && code <= 0x1eff)
    ) {
      latin++;
    } else if (code >= 0x0400 && code <= 0x04ff) {
      cyrillic++;
    } else if (
      (code >= 0x4e00 && code <= 0x9fff) ||
      (code >= 0x3040 && code <= 0x30ff) ||
      (code >= 0xac00 && code <= 0xd7af)
    ) {
      cjk++;
    } else if (code >= 0x0600 && code <= 0x06ff) {
      arabic++;
    } else if (code >= 0x0900 && code <= 0x097f) {
      devanagari++;
    }
  }

  const counts: [ScriptType, number][] = [
    ["latin", latin],
    ["cyrillic", cyrillic],
    ["cjk", cjk],
    ["arabic", arabic],
    ["devanagari", devanagari],
  ];

  const max = counts.reduce((a, b) => (b[1] > a[1] ? b : a));
  return max[1] > 0 ? max[0] : "unknown";
}
