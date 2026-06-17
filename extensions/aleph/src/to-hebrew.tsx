import { showToast, ToastStyle, showHUD } from "@raycast/api";
import { contents, update } from "./util/clipboard";
const englishToHebrewDict: { [key: string]: string } = {
  q: "/",
  w: "׳",
  e: "ק",
  r: "ר",
  t: "א",
  y: "ט",
  u: "ו",
  i: "ן",
  o: "ם",
  p: "פ",
  a: "ש",
  s: "ד",
  d: "ג",
  f: "כ",
  g: "ע",
  h: "י",
  j: "ח",
  k: "ל",
  l: "ך",
  ";": "ף",
  z: "ז",
  x: "ס",
  c: "ב",
  v: "ה",
  b: "נ",
  n: "מ",
  m: "צ",
  ",": "ת",
  ".": "ץ",
  "<": ",",
  " ": " ",
  ">": ".",
  '"': '"',
  "\n": "\n",
  "'": ",",
  "/": "/",
  "(": ")",
  ")": "(",
};

export default async () => {
  try {
    const clipboard = await contents();
    const encoded = clipboard
      .split("")
      .map((char) => englishToHebrewDict[char.toLowerCase()] || char)
      .join("");
    await update(encoded);
    showHUD("Converted to Hebrew");
  } catch (e) {
    if (typeof e === "string") {
      await showToast(ToastStyle.Failure, "Accessibility permission denied.", e);
    }
  }
};
