/* eslint-disable @typescript-eslint/no-var-requires */
const fs = require("fs/promises");
const path = require("path");
const axios = require("axios");
const cheerio = require("cheerio");

/**
 * Fetches the bible versions from the biblegateway.com website
 * @returns {Promise<[string, string][]>} An array of [version full name, version abbreviation] tuples
 */
async function versions() {
  const response = await axios.get("https://biblegateway.com/passage?interface=print");
  const $ = cheerio.load(response.data);
  const versions = $("select.search-dropdown")
    .children("option:not(.lang):not(.spacer)")
    .map((_, el) => {
      const version = $(el).text();
      return { version, versionAbbr: getContentsOfLastParenthesis(version) };
    })
    .toArray()
    .map(({ version, versionAbbr }) => [version, versionAbbr]);
  return versions;
}

/**
 * Returns the string between the last pair of parentheses in a string.
 * Used to get the bible version abbreviation in a string like "New American Bible (Revised Edition) (NABRE)".
 * In that case the function would return "NABRE".
 *
 * Returns the original string if no parentheses are found.
 *
 * @param {string} version The full version name, e.g. "English Standard Version (ESV)"
 * @returns {string} The abbreviation of the version, e.g. "ESV"
 */
function getContentsOfLastParenthesis(version) {
  const lastOpenParenIndex = version.lastIndexOf("(");
  const lastCloseParenIndex = version.lastIndexOf(")");
  if (lastOpenParenIndex === -1 || lastCloseParenIndex === -1) {
    return version; // no parentheses found, return the whole string
  }
  return version.slice(lastOpenParenIndex + 1, lastCloseParenIndex);
}

async function main() {
  const bibleVersionsFileLocation = path.join(__dirname, "../assets/bible-versions.json");
  const bibleVersions = await versions();
  await fs.writeFile(bibleVersionsFileLocation, JSON.stringify({ versions: bibleVersions }));
  console.log(`[bible] Wrote ${bibleVersions.length} bible versions to ${bibleVersionsFileLocation}`);
}

if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}
