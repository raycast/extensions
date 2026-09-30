import { getPreferenceValues } from "@raycast/api";
import { getDomain } from "tldts";
import * as https from "https";
import * as cheerio from "cheerio";

const preferences: ExtensionPreferences = getPreferenceValues();
// Username (URL path) to retrieve data from Bento
const username = preferences.username;

/**
 * Retrieve the links from the Bento profile.
 *
 * @returns A promise that resolves with an array of strings, each being the URL of a link.
 */
function getLinks() {
  return new Promise<string[]>((resolve, reject) => {
    let data = "";
    const links: string[] = [];

    https
      .get(`https://bento.me/${username}`, (resp) => {
        resp.on("data", (chunk) => {
          data += chunk;
        });

        resp.on("end", () => {
          const output = cheerio.load(data);
          const url = output(".bento-grid__item a");
          url.each((_, element) => {
            const link = output(element).attr("href");
            if (link && link.trim() !== "") {
              links.push(link);
            }
          });
          links.push(`https://bento.me/${username}`);
          links.sort((a, b) => {
            const domainA = getDomain(a) || "";
            const domainB = getDomain(b) || "";
            return domainA.localeCompare(domainB);
          });
          resolve(links);
        });
      })
      .on("error", (err) => {
        reject(new Error(err.message));
      });
  });
}

export { getLinks };
