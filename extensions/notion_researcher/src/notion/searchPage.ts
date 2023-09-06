import { Client } from "@notionhq/client";
import { getPreferenceValues } from "@raycast/api";
import { Preferences } from "../config/index";
import { ParsedPage } from "./types";
import { PageObjectResponse } from "@notionhq/client/build/src/api-endpoints";

const preferences = getPreferenceValues<Preferences>();

const notion = new Client({ auth: preferences.notionApiKey });

function getTitle(pageProperties: any) {
  if (Object.keys(pageProperties).includes("title")) {
    return pageProperties.title.title[0].plain_text;
  } else {
    return pageProperties.Title.title[0].plain_text;
  }
}

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

function parsePage(page: any): ParsedPage {
  try {
    return {
      id: page.id,
      title: getTitle(page.properties),
      icon: page.icon?.type === "emoji" ? page.icon.emoji : "",
    };
  } catch (e: any) {
    throw new Error("Page must have a title");
  }
}
