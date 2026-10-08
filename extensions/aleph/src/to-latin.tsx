import { showToast, ToastStyle, showHUD } from "@raycast/api";
import { contents, update } from "./util/clipboard";

// Reverse the original dictionary
const hebrewToEnglishDict: { [key: string]: string } = {
  "/": "q",
  "׳": "w",
  ק: "e",
  ר: "r",
  א: "t",
  ט: "y",
  ו: "u",
  ן: "i",
  ם: "o",
  פ: "p",
  ש: "a",
  ד: "s",
  ג: "d",
  כ: "f",
  ע: "g",
  י: "h",
  ח: "j",
  ל: "k",
  ך: "l",
  ף: ";",
  ז: "z",
  ס: "x",
  ב: "c",
  ה: "v",
  נ: "b",
  מ: "n",
  צ: "m",
  ת: ",",
  " ": " ",
  ".": ">",
  ">": ".",
  ץ: ".",
  '"': '"',
  "\n": "\n",
  ",": "'",
  ")": "(",
  "(": ")",
};

export default async () => {
  try {
    const clipboard = await contents();
    const decoded = clipboard
      .split("")
      .map((char) => hebrewToEnglishDict[char] || char)
      .join("");
    await update(decoded);
    showHUD("Converted to Latin");
  } catch (e) {
    if (typeof e === "string") {
      await showToast(ToastStyle.Failure, "Accessibility permission denied.", e);
    }
  }
};
