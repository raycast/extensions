import { Icon } from "@raycast/api";
import * as cheerio from "cheerio";
import type { Element } from "domhandler";
import { DocItem, DocsConfig, FolderPage, ParsedNavigation, SectionInfo } from "./types";

export type { ParsedNavigation };

export async function fetchDocsHtml(url: string): Promise<string> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch docs page: ${response.status}`);
  }
  return response.text();
}

function getNavigationContainer($: cheerio.CheerioAPI): cheerio.Cheerio<Element> | null {
  const viewport = $("div[data-radix-scroll-area-viewport]");

  if (viewport.length === 0) {
    return null;
  }

  const tableDiv = viewport.children("div").first();

  if (tableDiv.length === 0) {
    return null;
  }

  return tableDiv;
}

function extractLinkTitle($link: cheerio.Cheerio<Element>): string {
  const $clone = $link.clone();
  $clone.find("svg").remove();
  const title = $clone.text().trim();

  if (title) {
    return title;
  }

  const href = $link.attr("href") || "";
  return formatSlugAsTitle(href.split("/").pop() || "");
}

function isFolderLink($link: cheerio.Cheerio<Element>): boolean {
  return $link.next("div[data-state][id]").length > 0;
}

export function formatSlugAsTitle(slug: string): string {
  if (!slug || slug === "index") return "Getting Started";
  return slug
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export function parseNavigationFromHtml(html: string, baseUrl: string, sourceName: string): ParsedNavigation {
  const $ = cheerio.load(html);
  const sections: SectionInfo[] = [];
  const docs: DocItem[] = [];

  let currentSection: SectionInfo = { name: "Documentation", pages: [] };
  let orderIndex = 0;

  const tableDiv = getNavigationContainer($);

  if (!tableDiv) {
    return { sections, docs };
  }

  function getNavChildren($container: cheerio.Cheerio<Element>): Element[] {
    const children: Element[] = [];
    $container.children().each((_, element) => {
      const $el = $(element);
      if (element.tagName === "div" && !$el.attr("data-state")) {
        children.push(...getNavChildren($el));
      } else {
        children.push(element);
      }
    });
    return children;
  }

  const navChildren = getNavChildren(tableDiv);

  navChildren.forEach((element) => {
    const $el = $(element);

    if (element.tagName === "p") {
      const sectionName = $el.text().trim();
      if (sectionName) {
        if (currentSection.pages.length > 0) {
          sections.push(currentSection);
        }
        currentSection = { name: sectionName, pages: [] };
      }
    } else if (element.tagName === "a") {
      const href = $el.attr("href");
      if (href) {
        const title = extractLinkTitle($el);
        const fullUrl = href.startsWith("http") ? href : `${baseUrl}${href.startsWith("/") ? "" : "/"}${href}`;

        currentSection.pages.push(href);
        docs.push({
          title,
          url: fullUrl,
          section: currentSection.name,
          orderIndex: orderIndex++,
          icon: Icon.Document,
          source: sourceName,
        });
      }
    } else if (element.tagName === "div" && $el.attr("data-state")) {
      const $links = $el.find("a");

      if ($links.length > 0) {
        $links.each((_, linkEl) => {
          const $link = $(linkEl);
          const href = $link.attr("href");

          if (href) {
            const title = extractLinkTitle($link);
            const fullUrl = href.startsWith("http") ? href : `${baseUrl}${href.startsWith("/") ? "" : "/"}${href}`;

            currentSection.pages.push(href);
            docs.push({
              title,
              url: fullUrl,
              section: currentSection.name,
              orderIndex: orderIndex++,
              icon: isFolderLink($link) ? Icon.Folder : Icon.Document,
              source: sourceName,
            });
          }
        });
      }
    }
  });

  if (currentSection.pages.length > 0) {
    sections.push(currentSection);
  }

  return { sections, docs };
}

export async function fetchAndParseNavigation(docConfig: DocsConfig): Promise<ParsedNavigation> {
  try {
    const html = await fetchDocsHtml(docConfig.url);
    const baseUrl = new URL(docConfig.url).origin;
    return parseNavigationFromHtml(html, baseUrl, docConfig.name);
  } catch (error) {
    console.error(`Failed to fetch ${docConfig.name} (${docConfig.url}):`, error);
    return { sections: [], docs: [] };
  }
}

export async function parseFolderPages(folderUrl: string): Promise<FolderPage[]> {
  const html = await fetchDocsHtml(folderUrl);
  const $ = cheerio.load(html);
  const pages: FolderPage[] = [];
  const baseUrl = new URL(folderUrl).origin;
  const folderPath = new URL(folderUrl).pathname;

  const tableDiv = getNavigationContainer($);

  if (!tableDiv) {
    return pages;
  }

  tableDiv.children().each((_, element) => {
    const $el = $(element);

    if (element.tagName === "div" && $el.attr("data-state")) {
      const $firstLink = $el.children("a").first();
      const href = $firstLink.attr("href");

      if (href === folderPath) {
        const $childDiv = $el.children("div[data-state]").first();

        if ($childDiv.length > 0) {
          let currentSection = "";

          $childDiv.children().each((_, childEl) => {
            const $child = $(childEl);

            if (childEl.tagName === "p") {
              currentSection = $child.text().trim();
            } else if (childEl.tagName === "a") {
              const linkHref = $child.attr("href");

              if (linkHref && linkHref !== folderPath) {
                pages.push({
                  title: extractLinkTitle($child),
                  url: `${baseUrl}${linkHref}`,
                  isFolder: isFolderLink($child),
                  section: currentSection,
                });
              }
            }
          });
        }

        return false;
      }
    }
  });

  return pages;
}
