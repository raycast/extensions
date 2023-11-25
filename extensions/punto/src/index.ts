import { showHUD, Clipboard, getSelectedText, environment } from "@raycast/api";
import { en_ru, ru_en } from "./Dict";
import { exec as Exec } from "child_process";
import { promisify } from "util";

const exec = promisify(Exec);

export default async function main() {
  // genMap();
  // return;
  let input = "";
  try {
    input = await getSelectedText();
  } catch (error) {
    console.log("unable to get selected text");
  }

  const buf = Buffer.from(input, "utf8");
  const encodedInput = buf.toString("base64");
  // console.log(encodedInput);

  if (input === "" || encodedInput === "Cg==") {
    await showHUD("Nothing to switch");
    return;
  }
  const switched = switchStringLayout(input);
  switchLayout(detectLayout(switched));
  // console.log(switched);
  // await Clipboard.copy(switched);
  await Clipboard.paste(switched);
  await showHUD("Layout switched!");
}

function switchStringLayout(string: string): string {
  const chars: string[] = string.split("");
  return chars.map((ch) => switchCharacterLayout(ch)).join("");
}

// supports ABC, Russian
async function switchLayout(target: string): Promise<void> {
  await exec(`/bin/chmod u+x ${environment.assetsPath}/keyboardSwitcher`);
  const result = await exec(
    `${environment.assetsPath}/keyboardSwitcher select '${target}'`
  );
  result.stdout.split("\n")[1];
  // console.log(result.stdout);

  // exec(`${environment.assetsPath}/keyboardSwitcher json`),
  // exec(`${environment.assetsPath}/keyboardSwitcher get`),
}

function detectLayout(input: string): string {
  const array = input.split("");
  const enChars = array.filter((c) => en_ru.has(c)).length;
  const ruChars = array.filter((c) => ru_en.has(c)).length;
  let targetLayout = "";
  if (enChars > ruChars) {
    targetLayout = "ABC";
  } else {
    targetLayout = "Russian";
  }
  // console.log("Layout detected: " + targetLayout);
  return targetLayout;
}

function switchCharacterLayout(char: string): string {
  if (en_ru.has(char)) {
    // console.log(char + " detected in en dict")
    switchLayout("Russian");
    return en_ru.get(char) ?? char;
  } else {
    // console.log(char + " is probably detected in ru dict")
    switchLayout("ABC");
    return ru_en.get(char) ?? char;
  }
}
