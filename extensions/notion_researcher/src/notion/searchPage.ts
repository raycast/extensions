import { Client } from "@notionhq/client";
import { getPreferenceValues } from "@raycast/api";
import { Preferences } from "../config/index";
import { ParsedPage } from "./types";
import { PageObjectResponse } from "@notionhq/client/build/src/api-endpoints";
import { parsePage } from "./utils";

const preferences = getPreferenceValues<Preferences>();

const notion = new Client({ auth: preferences.notionApiKey });

export async function searchPages(query: string): Promise<ParsedPage[]> {
  const response = await notion.search({
    query: query,
    filter: {
      value: "page",
      property: "object",
    },
    sort: {
      direction: "descending",
      timestamp: "last_edited_time",
    },
    page_size: 10,
  });
  const pages = response.results;
  const parsedPages = pages.map((page) => parsePage(page as PageObjectResponse));
  return parsedPages;
}
