import fs from "fs/promises";
import path from "path";
import * as cheerio from "cheerio";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);

/**
 * Fetches the bible versions from the biblegateway.com website
 */
async function versions() {
  const response = await fetch("https://biblegateway.com/passage?interface=print");
  const $ = cheerio.load(await response.text());
  const versions = $("select.search-dropdown")
    .children("option:not(.lang):not(.spacer)")
    .map((_, el) => {
      const version = $(el).text();
      const abbrev = getContentsOfLastParenthesis(version);
      return {
        id: abbrev,
        name: version.replace(`(${abbrev})`, "").trim(),
        abbrev,
      };
    })
    .toArray();
  return versions;
}

/**
 * Returns the string between the last pair of parentheses in a string.
 * Used to get the bible version abbreviation in a string like "New American Bible (Revised Edition) (NABRE)".
 * In that case the function would return "NABRE".
 *
 * Returns the original string if no parentheses are found.
 *
 * @param version The full version name, e.g. "English Standard Version (ESV)"
 * @returns The abbreviation of the version, e.g. "ESV"
 */
function getContentsOfLastParenthesis(version: string): string {
  const lastOpenParenIndex = version.lastIndexOf("(");
  const lastCloseParenIndex = version.lastIndexOf(")");
  if (lastOpenParenIndex === -1 || lastCloseParenIndex === -1) {
    return version; // no parentheses found, return the whole string
  }
  return version.slice(lastOpenParenIndex + 1, lastCloseParenIndex);
}

async function main() {
  const bibleVersionsFileLocation = path.join(process.cwd(), process.argv[2] || "bible-versions.json");
  const bibleVersions = await versions();
  await fs.writeFile(bibleVersionsFileLocation, JSON.stringify({ versions: bibleVersions }));
  console.log(`[bible] Wrote ${bibleVersions.length} bible versions to ${bibleVersionsFileLocation}`);
}

if (__filename === process.argv[1]) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}
