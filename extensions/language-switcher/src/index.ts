import { showHUD, Clipboard, getSelectedText, environment } from "@raycast/api";
import { en_ukr, ukr_en } from "./Layout";
import { exec as Exec } from "child_process";
import { promisify } from "util";

const exec = promisify(Exec);

export default async function main() {
  let input = "";
  try {
    input = await getSelectedText();
  } catch (error) {
    console.log("Unable to get selected text");
    await showHUD("Unable to get selected text");
    return;
  }

  if (!input) {
    await showHUD("Nothing to switch");
    return;
  }

  const detectedLayout = detectLayout(input);
  const switched = switchStringLayout(input, detectedLayout);

  await Clipboard.paste(switched);
  await switchLayout(detectedLayout === "ABC" ? "Ukrainian" : "ABC");

  await showHUD(`Layout switched to ${detectedLayout === "ABC" ? "Ukrainian 🇺🇦" : "English 🇬🇧"}!`);
}

function switchStringLayout(string: string, currentLayout: string): string {
  const layoutMap = currentLayout === "ABC" ? en_ukr : ukr_en;
  return string
    .split("")
    .map((char) => layoutMap.get(char) ?? char)
    .join("");
}

async function switchLayout(target: string): Promise<void> {
  await exec(`/bin/chmod u+x ${environment.assetsPath}/keyboardSwitcher`);
  await exec(`${environment.assetsPath}/keyboardSwitcher select '${target}'`);
}

function detectLayout(input: string): string {
  const enChars = input.split("").filter((c) => en_ukr.has(c)).length;
  const ukrChars = input.split("").filter((c) => ukr_en.has(c)).length;
  return enChars > ukrChars ? "ABC" : "Ukrainian";
}
