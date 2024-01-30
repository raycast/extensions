import { Clipboard, getSelectedText } from "@raycast/api";

function convertHebrewKeyboardToEnglish(input: string): string {
  const hebrewToEnglishKeyboardMap: { [key: string]: string } = {
    a: "ש",
    A: "ש",
    b: "נ",
    B: "נ",
    c: "ב",
    C: "ב",
    d: "ג",
    D: "ג",
    e: "ק",
    E: "ק",
    f: "כ",
    F: "כ",
    g: "ע",
    G: "ע",
    h: "י",
    H: "י",
    i: "ן",
    I: "ן",
    j: "ח",
    J: "ח",
    k: "ל",
    K: "ל",
    l: "ך",
    L: "ך",
    m: "צ",
    M: "צ",
    n: "מ",
    N: "מ",
    o: "ם",
    O: "ם",
    p: "פ",
    P: "פ",
    q: "/",
    Q: "/",
    r: "ר",
    R: "ר",
    s: "ד",
    S: "ד",
    t: "א",
    T: "א",
    u: "ו",
    U: "ו",
    v: "ה",
    V: "ה",
    w: "׳",
    W: "׳",
    x: "ס",
    X: "ס",
    y: "ט",
    Y: "ט",
    z: "ז",
    Z: "ז",
    ",": "ת",
    ".": "ץ",
    ";": "ף",
    "'": ",",
    "/": ".",
    "`": ";",
    "[": "[",
    "]": "]",
    "\\": "\\",
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
    "<": "<",
    ">": ">",
    "?": "?",
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
