import { Client } from "@notionhq/client";
import { getPreferenceValues } from "@raycast/api";
import { ArticleMetadata } from "arxivjs";
import { Status } from "./types";
import { Preferences } from "../config/index";
import { splitTextAndEquations } from "./utils";

const preferences = getPreferenceValues<Preferences>();

const notion = new Client({ auth: preferences.notionApiKey });

export async function createArticleNotionPage(articleMetadata: ArticleMetadata): Promise<string> {
  const { authors, categoryNames, pdf, summary, title } = articleMetadata;

  // Get only the date
  const date = new Date(articleMetadata.date).toISOString().split("T")[0];

  const response = await notion.pages.create({
    parent: { database_id: preferences.databaseKey },
    icon: {
      emoji: "📄",
    },
    properties: {
      Title: {
        title: [
          {
            text: {
              content: title,
            },
          },
        ],
      },
      Tags: {
        multi_select: [],
      },
      Category: {
        multi_select: [...categoryNames.map((x) => ({ name: x }))],
      },
      Authors: {
        multi_select: [...authors.map((x) => ({ name: x }))],
      },
      Status: {
        select: {
          name: Status.NotRead,
        },
      },
      URL: {
        url: pdf,
      },
      Date: {
        date: { start: date },
      },
    },
    children: [
      {
        object: "block",
        type: "heading_2",
        heading_2: {
          rich_text: [{ type: "text", text: { content: "Abstract" } }],
          color: "purple",
        },
      },
      {
        object: "block",
        type: "paragraph",
        paragraph: {
          rich_text: splitTextAndEquations(summary.trim()),
        },
      },
      {
        object: "block",
        type: "paragraph",
        paragraph: {
          rich_text: [
            {
              type: "text",
              annotations: {
                bold: true,
              },
              text: {
                content: authors.join(", "),
              },
            },
          ],
        },
      },
    ],
  });

  return response.id;
}

export async function updateArticlePageReaderUrl(pageId: string, readerUrl: string) {
  return notion.pages.update({
    page_id: pageId,
    properties: {
      "Reader Url": {
        url: readerUrl,
      },
    },
  });
}

export async function findArticlePage(url: string) {
  const res = await notion.databases.query({
    database_id: preferences.databaseKey,
    filter: {
      property: "URL",
      url: {
        equals: url,
      },
    },
  });

  return res.results.length > 0;
}
