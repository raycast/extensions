const TABLE = new Map<number, string | null>();

for (let i = 0; i < 10; i++) {
  TABLE.set(0x06f0 + i, String(i)); // Persian ۰–۹
  TABLE.set(0x0660 + i, String(i)); // Arabic-Indic ٠–٩
}
TABLE.set(0x066b, "."); // ٫ decimal separator
TABLE.set(0x066c, ","); // ٬ thousands separator

const BIDI_MARKS = [0x200e, 0x200f, 0x061c, 0x202a, 0x202b, 0x202c, 0x202d, 0x202e, 0x2066, 0x2067, 0x2068, 0x2069];

for (const cp of BIDI_MARKS) {
  TABLE.set(cp, null);
}

export function persianDigitsToEnglish(text: string): string {
  let result = "";
  for (const char of text) {
    const cp = char.codePointAt(0);
    if (cp !== undefined && TABLE.has(cp)) {
      const mapped = TABLE.get(cp);
      if (mapped !== null && mapped !== undefined) {
        result += mapped;
      }
    } else {
      result += char;
    }
  }
  return result;
}
