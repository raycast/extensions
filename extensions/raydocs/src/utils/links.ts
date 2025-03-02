import { load } from "cheerio";
import crypto from "crypto";
import fetch from "node-fetch";
import showdown from "showdown";
import { Link } from "@/types";
import { docsUrl, linksUrl, markdownUrl } from "@/utils/constants";

const converter = new showdown.Converter();

export async function getLinks(): Promise<Link[]> {
  try {
    const res = await fetch(linksUrl);
    const resText = await res.text();

    const html = converter.makeHtml(resText);

    const $ = load(html);

    let sectionTitle: string | undefined;

    const menuItems: Link[] = $("body > *")
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

    return menuItems;
  } catch (err) {
    console.error(err);
    return [];
  }
}

function parseUrl(url: string | undefined): Link["url"] {
  if (!url) {
    return {
      path: docsUrl,
      markdown: markdownUrl,
      external: false,
    };
  } else if (url === "README.md") {
    return {
      path: docsUrl,
      markdown: `${markdownUrl}/${url}`,
      external: false,
    };
  } else if (url.startsWith("http")) {
    return {
      path: url,
      markdown: url,
      external: true,
    };
  } else if (url.endsWith("README.md")) {
    return {
      path: `${docsUrl}/${url.replace("/README.md", "")}`,
      markdown: `${markdownUrl}/${url}`,
      external: false,
    };
  } else {
    return {
      path: `${docsUrl}/${url.replace(".md", "")}`,
      markdown: `${markdownUrl}/${url}`,
      external: false,
    };
  }
}
