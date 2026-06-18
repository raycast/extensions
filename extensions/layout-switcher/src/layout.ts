/**
 * Maps characters between the US QWERTY layout and macOS Cyrillic keyboard
 * layouts by physical key position. This is what lets you "fix" text that was
 * typed with the wrong layout active (e.g. "ghbdtn" -> "привет").
 *
 * The Cyrillic tables below are dumped straight from the macOS system layouts
 * (Carbon UCKeyTranslate), so they match Apple's "Russian", "Ukrainian" and
 * "Byelorussian" layouts exactly. Note these are NOT the Windows ЙЦУКЕН
 * layout: macOS puts ё on the "\" key, "/" stays "/", and the shifted number
 * row differs.
 */

export type LayoutId = "russian" | "ukrainian" | "belarusian";

export type Direction = "cyr-to-en" | "en-to-cyr";

// Physical US QWERTY keys in a fixed order: [unshifted, shifted].
const US: ReadonlyArray<readonly [string, string]> = [
  ["`", "~"],
  ["1", "!"],
  ["2", "@"],
  ["3", "#"],
  ["4", "$"],
  ["5", "%"],
  ["6", "^"],
  ["7", "&"],
  ["8", "*"],
  ["9", "("],
  ["0", ")"],
  ["-", "_"],
  ["=", "+"],
  ["q", "Q"],
  ["w", "W"],
  ["e", "E"],
  ["r", "R"],
  ["t", "T"],
  ["y", "Y"],
  ["u", "U"],
  ["i", "I"],
  ["o", "O"],
  ["p", "P"],
  ["[", "{"],
  ["]", "}"],
  ["\\", "|"],
  ["a", "A"],
  ["s", "S"],
  ["d", "D"],
  ["f", "F"],
  ["g", "G"],
  ["h", "H"],
  ["j", "J"],
  ["k", "K"],
  ["l", "L"],
  [";", ":"],
  ["'", '"'],
  ["z", "Z"],
  ["x", "X"],
  ["c", "C"],
  ["v", "V"],
  ["b", "B"],
  ["n", "N"],
  ["m", "M"],
  [",", "<"],
  [".", ">"],
  ["/", "?"],
];

// Each Cyrillic layout lists the chars its keys produce, in the SAME key order
// as US above: [unshifted, shifted].
const RUSSIAN: ReadonlyArray<readonly [string, string]> = [
  ["]", "["],
  ["1", "!"],
  ["2", '"'],
  ["3", "№"],
  ["4", "%"],
  ["5", ":"],
  ["6", ","],
  ["7", "."],
  ["8", ";"],
  ["9", "("],
  ["0", ")"],
  ["-", "_"],
  ["=", "+"],
  ["й", "Й"],
  ["ц", "Ц"],
  ["у", "У"],
  ["к", "К"],
  ["е", "Е"],
  ["н", "Н"],
  ["г", "Г"],
  ["ш", "Ш"],
  ["щ", "Щ"],
  ["з", "З"],
  ["х", "Х"],
  ["ъ", "Ъ"],
  ["ё", "Ё"],
  ["ф", "Ф"],
  ["ы", "Ы"],
  ["в", "В"],
  ["а", "А"],
  ["п", "П"],
  ["р", "Р"],
  ["о", "О"],
  ["л", "Л"],
  ["д", "Д"],
  ["ж", "Ж"],
  ["э", "Э"],
  ["я", "Я"],
  ["ч", "Ч"],
  ["с", "С"],
  ["м", "М"],
  ["и", "И"],
  ["т", "Т"],
  ["ь", "Ь"],
  ["б", "Б"],
  ["ю", "Ю"],
  ["/", "?"],
];

const UKRAINIAN: ReadonlyArray<readonly [string, string]> = [
  ["'", "~"],
  ["1", "!"],
  ["2", '"'],
  ["3", "№"],
  ["4", "%"],
  ["5", ":"],
  ["6", ","],
  ["7", "."],
  ["8", ";"],
  ["9", "("],
  ["0", ")"],
  ["-", "_"],
  ["=", "+"],
  ["й", "Й"],
  ["ц", "Ц"],
  ["у", "У"],
  ["к", "К"],
  ["е", "Е"],
  ["н", "Н"],
  ["г", "Г"],
  ["ш", "Ш"],
  ["щ", "Щ"],
  ["з", "З"],
  ["х", "Х"],
  ["ї", "Ї"],
  ["ґ", "Ґ"],
  ["ф", "Ф"],
  ["и", "И"],
  ["в", "В"],
  ["а", "А"],
  ["п", "П"],
  ["р", "Р"],
  ["о", "О"],
  ["л", "Л"],
  ["д", "Д"],
  ["ж", "Ж"],
  ["є", "Є"],
  ["я", "Я"],
  ["ч", "Ч"],
  ["с", "С"],
  ["м", "М"],
  ["і", "І"],
  ["т", "Т"],
  ["ь", "Ь"],
  ["б", "Б"],
  ["ю", "Ю"],
  ["/", "?"],
];

const BELARUSIAN: ReadonlyArray<readonly [string, string]> = [
  ["“", "„"],
  ["1", "!"],
  ["2", '"'],
  ["3", "№"],
  ["4", "%"],
  ["5", ":"],
  ["6", ","],
  ["7", "."],
  ["8", ";"],
  ["9", "("],
  ["0", ")"],
  ["-", "_"],
  ["=", "+"],
  ["й", "Й"],
  ["ц", "Ц"],
  ["у", "У"],
  ["к", "К"],
  ["е", "Е"],
  ["н", "Н"],
  ["г", "Г"],
  ["ш", "Ш"],
  ["ў", "Ў"],
  ["з", "З"],
  ["х", "Х"],
  ["'", "'"],
  ["ё", "Ё"],
  ["ф", "Ф"],
  ["ы", "Ы"],
  ["в", "В"],
  ["а", "А"],
  ["п", "П"],
  ["р", "Р"],
  ["о", "О"],
  ["л", "Л"],
  ["д", "Д"],
  ["ж", "Ж"],
  ["э", "Э"],
  ["я", "Я"],
  ["ч", "Ч"],
  ["с", "С"],
  ["м", "М"],
  ["і", "І"],
  ["т", "Т"],
  ["ь", "Ь"],
  ["б", "Б"],
  ["ю", "Ю"],
  ["/", "?"],
];

type Tables = {
  enToCyr: Record<string, string>;
  cyrToEn: Record<string, string>;
};

function buildTables(cyr: ReadonlyArray<readonly [string, string]>): Tables {
  const enToCyr: Record<string, string> = {};
  const cyrToEn: Record<string, string> = {};
  US.forEach(([enLo, enHi], i) => {
    const [cyLo, cyHi] = cyr[i];
    enToCyr[enLo] = cyLo;
    enToCyr[enHi] = cyHi;
    // First key wins on the reverse map so we don't clobber a letter with a
    // punctuation key that happens to emit the same character.
    if (!(cyLo in cyrToEn)) cyrToEn[cyLo] = enLo;
    if (!(cyHi in cyrToEn)) cyrToEn[cyHi] = enHi;
  });
  return { enToCyr, cyrToEn };
}

const LAYOUTS: Record<LayoutId, Tables> = {
  russian: buildTables(RUSSIAN),
  ukrainian: buildTables(UKRAINIAN),
  belarusian: buildTables(BELARUSIAN),
};

// Match any Cyrillic codepoint so Ukrainian (і ї є ґ) and Belarusian (ў і)
// letters are counted, not just the Russian а–я range.
const CYRILLIC = /[Ѐ-ӿ]/;
const LATIN = /[a-z]/i;

/**
 * Decides which way to convert: if the text is mostly Cyrillic the user meant
 * to type in English (QWERTY), so we convert Cyrillic -> EN, and vice versa.
 */
export function detectDirection(text: string): Direction {
  let cyr = 0;
  let lat = 0;
  for (const ch of text) {
    if (CYRILLIC.test(ch)) cyr++;
    else if (LATIN.test(ch)) lat++;
  }
  return cyr > lat ? "cyr-to-en" : "en-to-cyr";
}

export function convert(
  text: string,
  layout: LayoutId,
  direction?: Direction,
): string {
  const dir = direction ?? detectDirection(text);
  const { enToCyr, cyrToEn } = LAYOUTS[layout];
  const table = dir === "cyr-to-en" ? cyrToEn : enToCyr;
  let out = "";
  for (const ch of text) {
    out += table[ch] ?? ch;
  }
  return out;
}
