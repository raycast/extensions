import * as cheerio from "cheerio";

export interface DocItem {
  name: string;
  path: string;
  desc: string;
  type: string;
  url: string;
}

const STD_DOCS_URL = "https://doc.rust-lang.org/std/";
const ALL_ITEMS_URL = "https://doc.rust-lang.org/std/all.html";
const STD_INDEX_URL = "https://doc.rust-lang.org/std/index.html";

// We also fetch 'core' and 'alloc' because 'std' re-exports many items from them (e.g. Vec, Option)
// but they don't appear in std/all.html.
const CORE_ITEMS_URL = "https://doc.rust-lang.org/core/all.html";
const ALLOC_ITEMS_URL = "https://doc.rust-lang.org/alloc/all.html";

// Regex to capture lists of items.
const ITEM_REGEX = /<a href="([^"]+)">([^<]+)<\/a>/g;

export const fetchSearchIndex = async (): Promise<DocItem[]> => {
  try {
    const urls = [
      ALL_ITEMS_URL,
      STD_INDEX_URL,
      CORE_ITEMS_URL,
      ALLOC_ITEMS_URL,
    ];
    const responses = await Promise.all(urls.map((url) => fetch(url)));

    const texts = await Promise.all(
      responses.map(async (res, index) => {
        if (!res.ok) {
          console.warn(`Failed to fetch ${urls[index]}`);
          return "";
        }
        return res.text();
      }),
    );

    const stdAllHtml = texts[0];
    const stdIndexHtml = texts[1];
    const coreHtml = texts[2];
    const allocHtml = texts[3];

    // std/index.html contains Keywords, Primitive Types, Modules, Macros
    const stdIndexItems = parseIndexItems(stdIndexHtml);

    // all.html contains Structs, Enums, Traits, Functions, Typedefs, Unions, Constants, Statics
    // but usually MISSES Modules and Primitives and Keywords.
    const stdItems = parseHtmlIndex(stdAllHtml, STD_DOCS_URL);

    const coreItems = parseHtmlIndex(
      coreHtml,
      "https://doc.rust-lang.org/core/",
    );
    const allocItems = parseHtmlIndex(
      allocHtml,
      "https://doc.rust-lang.org/alloc/",
    );

    // Merge logic: Index items (Keywords, Modules) should take precedence or at least exist.
    // De-duplication: if name and type match?
    // Let's just concat. Raycast list handles duplicates by key, but we need unique key.
    // DocItem doesn't have ID.
    // We'll trust the user search.

    return [...stdIndexItems, ...stdItems, ...coreItems, ...allocItems];
  } catch (error) {
    console.error("Error fetching documentation:", error);
    throw error;
  }
};

const parseIndexItems = (html: string): DocItem[] => {
  if (!html) return [];
  try {
    const $ = cheerio.load(html);
    const items: DocItem[] = [];

    // Selectors for different sections in index.html
    // Keywords: a.keyword
    // Modules: a.mod
    // Primitives: a.primitive
    // Macros: a.macro

    const selectors = [
      { css: "a.keyword", type: "keyword" },
      { css: "a.mod", type: "module" },
      { css: "a.primitive", type: "primitive" },
      { css: "a.macro", type: "macro" },
    ];

    selectors.forEach(({ css, type }) => {
      $(css).each((_, el) => {
        const link = $(el);
        const name = link.text();
        const href = link.attr("href") || "";

        // Description is usually in the following <dd>
        const dt = link.parent("dt");
        const dd = dt.next("dd");
        const desc = dd.text().trim(); // Basic plain text description

        if (name && href) {
          items.push({
            name,
            path: name, // Top-level usually
            desc,
            type,
            url: new URL(href, STD_DOCS_URL).toString(),
          });
        }
      });
    });

    return items;
  } catch (e) {
    console.error("Error parsing index items", e);
    return [];
  }
};

const parseHtmlIndex = (html: string, baseUrl: string): DocItem[] => {
  const items: DocItem[] = [];
  let match;

  while ((match = ITEM_REGEX.exec(html)) !== null) {
    const href = match[1];
    const fullPath = match[2];

    if (href.startsWith("#") || href.startsWith("..") || href === "index.html")
      continue;

    let type = "unknown";
    const parts = href.split("/");
    const filename = parts[parts.length - 1]; // e.g. "struct.Vec.html"
    const typeMatch = filename.split(".");

    if (typeMatch.length >= 2) {
      // e.g. "struct"
      type = typeMatch[0];
    } else if (filename === "index.html") {
      type = "module";
    }

    type = normalizeType(type);

    const pathParts = fullPath.split("::");
    const name = pathParts[pathParts.length - 1];

    items.push({
      name,
      path: fullPath,
      desc: "",
      type,
      url: new URL(href, baseUrl).toString(),
    });
  }

  return items;
};

function normalizeType(type: string): string {
  if (type === "constant") return "const";
  if (type === "typedef") return "type"; // "type" alias
  return type;
}

export const fetchDocPage = async (url: string): Promise<string> => {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error("Failed to fetch page");
    }
    const html = await response.text();
    const $ = cheerio.load(html);

    // Try top docblock
    const docblock = $(".docblock").first();
    if (docblock.length > 0) {
      return convertCheerioToMarkdown($, docblock, url);
    } else {
      return "*No documentation summary found.*";
    }
  } catch (e) {
    console.error("Error fetching doc page", e);
    return "*Failed to load documentation.*";
  }
};

function convertCheerioToMarkdown(
  $: cheerio.Root,
  element: cheerio.Cheerio,
  baseUrl: string,
): string {
  let markdown = "";

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  element.contents().each((_: number, el: any) => {
    const type = el.type;
    const tagName = el.tagName;

    if (type === "text") {
      const text = $(el).text();
      // Avoid excessive newlines from whitespace text nodes
      markdown += text;
    } else if (tagName === "p") {
      markdown +=
        "\n" + convertCheerioToMarkdown($, $(el), baseUrl).trim() + "\n\n";
    } else if (tagName === "h1") {
      markdown += "# " + $(el).text() + "\n\n";
    } else if (tagName === "h2") {
      markdown += "## " + $(el).text() + "\n\n";
    } else if (tagName === "h3") {
      markdown += "### " + $(el).text() + "\n\n";
    } else if (tagName === "h4") {
      markdown += "#### " + $(el).text() + "\n\n";
    } else if (tagName === "pre") {
      const code = $(el).text();
      markdown += "\n```rust\n" + code.trim() + "\n```\n\n";
    } else if (tagName === "code") {
      markdown += "`" + $(el).text() + "`";
    } else if (tagName === "a") {
      const href = $(el).attr("href");
      const text = convertCheerioToMarkdown($, $(el), baseUrl);
      if (href) {
        try {
          // Resolve relative URLs to absolute ones
          const absoluteUrl = new URL(href, baseUrl).toString();
          markdown += `[${text}](${absoluteUrl})`;
        } catch {
          // Fallback to original text if URL parsing fails
          markdown += text;
        }
      } else {
        markdown += text;
      }
    } else if (tagName === "ul") {
      markdown += convertCheerioToMarkdown($, $(el), baseUrl) + "\n";
    } else if (tagName === "li") {
      markdown +=
        "- " + convertCheerioToMarkdown($, $(el), baseUrl).trim() + "\n";
    } else if (tagName === "div" && $(el).hasClass("example-wrap")) {
      markdown += convertCheerioToMarkdown($, $(el), baseUrl);
    } else if (tagName === "div" || tagName === "span") {
      markdown += convertCheerioToMarkdown($, $(el), baseUrl);
    } else {
      markdown += convertCheerioToMarkdown($, $(el), baseUrl);
    }
  });

  return markdown.replace(/\n\n\n+/g, "\n\n").trim();
}
