import { Detail } from "@raycast/api";
import { Clipboard, getSelectedText } from "@raycast/api";
import { usePromise } from "@raycast/utils";

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

export default function Command() {
  console.log("Running Command");
  let markdown = "";
  const str = usePromise(
    async () => {
      const result = await getSelectedText();
      const converted = convertHebrewKeyboardToEnglish(result);

      console.log("str is: " + JSON.stringify(converted));
      const resText = converted;
      if (!resText) {
        return <Detail markdown={``} />;
      }

      markdown = `
            # Hebrish To English
            ${resText}
            `;

      const content1 = {
        text: resText,
      };
      console.log("Copying " + JSON.stringify(content1));
      await Clipboard.copy(content1);
      // await showHUD(`✅ Copied to clipboard`);
      console.log("Pasting " + JSON.stringify(content1));
      await Clipboard.paste(content1);
      return markdown;
    },
    [],
    {},
  );

  return <Detail markdown={str.data as string} />;
}
