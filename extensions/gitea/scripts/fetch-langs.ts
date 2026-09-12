import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import yaml from "js-yaml";
import { LinguistLanguage } from "../src/utils/languages";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LINGUIST_URL = "https://raw.githubusercontent.com/github/linguist/master/lib/linguist/languages.yml";
const OUT_PATH = path.resolve(__dirname, "../assets/languages.json");

async function fetchLanguages(): Promise<LinguistLanguage[]> {
  const response = await fetch(LINGUIST_URL);
  const data = await response.text();
  const languages = yaml.load(data) as LinguistLanguage[];
  return languages;
}

async function main() {
  const languages = await fetchLanguages();
  await fs.mkdir(path.dirname(OUT_PATH), { recursive: true });
  await fs.writeFile(OUT_PATH, JSON.stringify(languages, null, 2));
}

main();
