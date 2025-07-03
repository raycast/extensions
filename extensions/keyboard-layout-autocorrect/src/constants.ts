export const CYR_TO_EN: Record<string, string> = {
  й: "q",
  ц: "w",
  у: "e",
  к: "r",
  е: "t",
  н: "y",
  г: "u",
  ш: "i",
  щ: "o",
  з: "p",
  х: "[",
  ъ: "]",
  ф: "a",
  ы: "s",
  в: "d",
  а: "f",
  п: "g",
  р: "h",
  о: "j",
  л: "k",
  д: "l",
  ж: ";",
  э: "'",
  я: "z",
  ч: "x",
  с: "c",
  м: "v",
  и: "b",
  т: "n",
  ь: "m",
  б: ",",
  ю: ".",
  ё: "`",

  // Ukrainian letters (added)
  // TODO: add multiple variants
  і: "b", // i (note: Ukrainian і maps to 'b' key same as Russian и)
  ї: "]", // yi - often mapped to ']'
  є: "'", // ye
  ґ: "\\", // g with upturn (usually backslash)
};
