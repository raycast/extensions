import { Client } from "@notionhq/client";
import { getPreferenceValues } from "@raycast/api";
import { Preferences } from "../config/index";
import { ParsedPage } from "./types";
import { PageObjectResponse } from "@notionhq/client/build/src/api-endpoints";
import { parsePage } from "./utils";

const preferences = getPreferenceValues<Preferences>();

const notion = new Client({ auth: preferences.notionApiKey });
const databaseId = preferences.conceptDatabaseKey;

export async function queryDatabase(query: string): Promise<ParsedPage[]> {
  const response = await notion.databases.query({
    database_id: databaseId,
    filter: {
      property: "Title",
      title: {
        contains: query,
      },
    },
    sorts: [
      {
        property: "Created time",
        direction: "descending",
      },
    ],
    page_size: 15,
  });

  const pages = response.results;
  const parsedPages = pages.map((page) => parsePage(page as PageObjectResponse));

  return parsedPages;
}
