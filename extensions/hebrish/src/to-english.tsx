import { Clipboard, getSelectedText } from "@raycast/api";

function convertHebrewKeyboardToEnglish(input: string): string {
  const hebrewToEnglishKeyboardMap: { [key: string]: string } = {
    ק: "e",
    ו: "u",
    א: "t",
    ר: "r",
    ט: "y",
    י: "h",
    פ: "p",
    ש: "a",
    ד: "s",
    ג: "d",
    כ: "f",
    ך: "l",
    ל: "k",
    ח: "j",
    ז: "z",
    ס: "x",
    ב: "c",
    ה: "v",
    נ: "b",
    מ: "n",
    צ: "m",
    ת: ",",
    ץ: ".",
    ף: ";",
    ן: "i",
    ם: "o",
    ",": "'",
    ".": "/",
    "/": "q",
    ";": "`",
    "׳": "w",
    "[": "[",
    "]": "]",
    "\\": "\\",
    "`": "`",
    "~": "~",
    "!": "!",
    "@": "@",
    "#": "#",
    $: "$",
    "%": "%",
    "^": "^",
    "&": "&",
    "*": "*",
    "(": "(",
    ")": ")",
    _: "_",
    "+": "+",
    "{": "{",
    "}": "}",
    "|": "|",
    ":": ":",
    '"': "'",
    "<": "<",
    ">": ">",
    "?": "?",
    שׁ: "A",
    לֹ: "C",
    "„": "D",
    ע: "g",
  };

  return input
    .split("")
    .map((char) => hebrewToEnglishKeyboardMap[char] || char)
    .join("");
}

export default async function Command() {
  let result = "";
  try {
    result = await getSelectedText();
  } catch (err) {
    result = "";
  }
  const converted = convertHebrewKeyboardToEnglish(result);
  const resText = converted;
  if (!resText) {
    return;
  }

  const content1 = {
    text: resText,
  };
  await Clipboard.paste(content1);
}
