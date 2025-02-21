import dedent from "dedent";

import { getPageContent, getPageData, getPageLinks, getPageMetadata, searchPages } from "@/utils/api";
import { renderContent, replaceLinks } from "@/utils/formatting";
import type { Locale } from "@/utils/language";

type Input = {
  /**
   * Search query to send to Wikipedia.
   */
  query: string;
  /**
   * Language to search articles in.
   */
  language: Locale;
};

/**
 * Return the article that best matches the query and a list of other articles that also match.
 */
export default async function (input: Input) {
  const pages = await searchPages(input.query, input.language);

  if (pages.length === 0) {
    return `No results found '${input.query}'`;
  }

  const title = pages[0].title;

  const [page, metadata, content, links] = await Promise.all([
    getPageData(title, input.language),
    getPageMetadata(title, input.language),
    getPageContent(title, input.language),
    getPageLinks(title, input.language),
  ]);

  const body = content ? renderContent(content, 2, links, input.language) : "";

  const markdown = page
    ? dedent`
      # ${page.title}

      ${replaceLinks(page.extract, input.language, links)}

      ${body.slice(0, 300_000)}
    `
    : "";

  return {
    title,
    metadata,
    content: markdown,
    results: pages.slice(1).map((page) => page.title),
  };
}
