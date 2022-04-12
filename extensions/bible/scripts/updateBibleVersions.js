/* eslint-disable @typescript-eslint/no-var-requires */
const fs = require("fs/promises");
const path = require("path");
const axios = require("axios");
const cheerio = require("cheerio");

const BIBLE_VERSIONS_FILE_LOCATION = path.join(__dirname, "../assets/bible-versions.json");

/**
 * Fetches the bible versions from the biblegateway.com website
 * @returns {Promise<{name: string; abbreviation: string}[]>}
 */
async function versions() {
  const response = await axios.get("https://biblegateway.com/passage?interface=print");
  const $ = cheerio.load(response.data);
  const versions = $("select.search-dropdown")
    .children("option:not(.lang):not(.spacer)")
    .map((_, el) => {
      const full = $(el).text();
      return { name: full, abbreviation: parseVersionAbbreviation(full) };
    })
    .toArray();
  return versions;
}

/**
 * Gets the version abbreviation that is at the end of the string, otherwise
 * returns the full version string that was given to it
 * @param {string} fullVersionName The full version name, e.g. "English Standard Version (ESV)"
 * @returns {string} The abbreviation of the version, e.g. "ESV"
 */
function parseVersionAbbreviation(fullVersionName) {
  const lastOpenParenIndex = fullVersionName.lastIndexOf("(");
  const lastCloseParenIndex = fullVersionName.lastIndexOf(")");
  if (lastOpenParenIndex === -1 || lastCloseParenIndex === -1) {
    return fullVersionName; // no parentheses found, return the whole string
  }
  return fullVersionName.slice(lastOpenParenIndex + 1, lastCloseParenIndex);
}

async function main() {
  const bibleVersions = await versions();
  await fs.writeFile(BIBLE_VERSIONS_FILE_LOCATION, JSON.stringify({ versions: bibleVersions }));
}

if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}
