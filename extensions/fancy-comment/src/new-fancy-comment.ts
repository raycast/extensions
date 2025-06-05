import { Clipboard, closeMainWindow, showHUD } from "@raycast/api";
import { execSync } from "child_process";
import figlet from "figlet";
import fs from "fs";
import path from "path";

export default async function main() {
  await closeMainWindow();

  const fontPath = path.join(__dirname, "assets", "fonts", "ANSI Shadow.flf");
  const fontData = fs.readFileSync(fontPath, "utf8");
  figlet.parseFont("ANSI Shadow", fontData);

  execSync(`osascript -e 'tell application "System Events" to keystroke "c" using command down'`);
  await new Promise((r) => setTimeout(r, 300));

  const text = await Clipboard.readText();
  if (!text) {
    await showHUD("Mark some text! 🫠");
    return;
  }

  const ascii = figlet.textSync(text, { font: "ANSI Shadow" });

  const commentedAscii = ascii
    .split("\n")
    .filter((line, idx, arr) => idx < arr.length - 1 || line.trim() !== "")
    .map((line) => `//? ${line}`)
    .join("\n");

  await Clipboard.copy(commentedAscii + "\n\n");

  execSync(`osascript -e 'tell application "System Events" to key code 51'`);

  execSync(`osascript -e 'tell application "System Events" to keystroke "v" using command down'`);

  await showHUD("Fancy Comment™ ready! 🔥");
}
