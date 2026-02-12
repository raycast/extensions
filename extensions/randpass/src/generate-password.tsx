import { Clipboard, showHUD, environment } from "@raycast/api";
import { readFileSync } from "fs";
import { join } from "path";

export default async function Command() {
  const password = generatePassword();
  await Clipboard.copy(password);
  await showHUD("Password copied to clipboard!");
}

function generatePassword(): string {
  const words = loadWordlist();
  const specialChars = ["!", "@", "#", "$", "%", "&", "*", "+", "=", "?"];

  const prefix = getCharNumberCombo(specialChars);
  const suffix = getCharNumberCombo(specialChars);

  const selectedWords = Array.from({ length: 4 }, () =>
    capitalizeFirst(words[Math.floor(Math.random() * words.length)]),
  );

  return `${prefix}${selectedWords.join("-")}${suffix}`;
}

function loadWordlist(): string[] {
  const wordlistPath = join(environment.assetsPath, "eff_large_wordlist.txt");
  const content = readFileSync(wordlistPath, "utf-8");

  return content
    .split("\n")
    .map((line) => line.split("\t")[1])
    .filter(Boolean);
}

function getCharNumberCombo(specialChars: string[]): string {
  const char = specialChars[Math.floor(Math.random() * specialChars.length)];
  const num = Math.floor(Math.random() * 10);

  return Math.random() < 0.5 ? `${char}${num}` : `${num}${char}`;
}

function capitalizeFirst(s: string): string {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
}
