import { load } from "cheerio";
import crypto from "crypto";
import fetch from "node-fetch";
import showdown from "showdown";
import { Link } from "@/types";

const docsUrl = "https://developers.raycast.com";
const linksUrl = "https://raw.githubusercontent.com/raycast/extensions/gh-pages/SUMMARY.md";
const converter = new showdown.Converter();

export async function getLinks() {
  try {
    const res = await fetch(linksUrl).then((res) => res.text());

    const html = converter.makeHtml(res);

    const $ = load(html);

    let sectionTitle: string | undefined;

    const menuItems = $("body > *")
      .map((_, element) => {
        if (/h[1-6]/.test(element.name)) {
          sectionTitle = $(element).text();
          return;
        }

        if (/hr/.test(element.name)) {
          sectionTitle = undefined;
          return;
        }

        if (/ul/.test(element.name)) {
          const links = $(element)
            .find("li > a")
            .map((_, link) => {
              return {
                id: crypto.randomUUID(),
                sectionTitle,
                title: $(link).text(),
                url: parseUrl($(link).attr("href")),
              };
            })
            .toArray();

          return links;
        }
      })
      .toArray();

    return menuItems as Link[];
  } catch (err) {
    console.error(err);
  }
}

function parseUrl(url: string | undefined) {
  if (!url || url === "README.md") {
    return {
      path: docsUrl,
      external: false,
    };
  } else if (url.startsWith("http")) {
    return {
      path: url,
      external: true,
    };
  } else if (url.endsWith("README.md")) {
    return {
      path: `${docsUrl}/${url.replace("/README.md", "")}`,
      external: false,
    };
  } else {
    return {
      path: `${docsUrl}/${url.replace(".md", "")}`,
      external: false,
    };
  }
}
