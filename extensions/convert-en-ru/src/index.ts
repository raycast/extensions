import { showHUD, Clipboard, getSelectedText } from "@raycast/api";

const latinToCyrillicMap: Record<string, string> = {
  a: "а",
  b: "б",
  v: "в",
  g: "г",
  d: "д",
  e: "э",
  yo: "ё",
  zh: "ж",
  z: "з",
  i: "и",
  y: "й",
  k: "к",
  l: "л",
  m: "м",
  n: "н",
  o: "о",
  p: "п",
  r: "р",
  s: "с",
  t: "т",
  u: "у",
  f: "ф",
  h: "х",
  ts: "ц",
  ch: "ч",
  w: "ш",
  sh: "щ",
  '"': "ъ",
  yi: "ы",
  "’": "ь",
  ye: "е",
  yu: "ю",
  ya: "я",
};

function translateRussianLatinToCyrillic(text: string) {
  const characters = text.toLowerCase().split("");
  console.log(characters);

  for (let i = 0; i < characters.length; i++) {
    const char = characters[i];
    const nextChar = characters[i + 1];

    if (nextChar && latinToCyrillicMap[char + nextChar]) {
      characters[i] = latinToCyrillicMap[char + nextChar];
      characters.splice(i + 1, 1);
    } else if (latinToCyrillicMap[char]) {
      characters[i] = latinToCyrillicMap[char];
    }
  }

  return characters.join("");
}

export default async function main() {
  let selectedText = "";
  try {
    selectedText = await getSelectedText();
    console.log(selectedText);
  } catch (error) {
    showHUD("Couldn't grab selected text from foreground app");
    return;
  }

  const translated = translateRussianLatinToCyrillic(selectedText);
  console.log(translated);

  await Clipboard.paste(translated);
  showHUD("Copied to clipboard");
}
