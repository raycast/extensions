import { Client } from "@notionhq/client";
import { getPreferenceValues } from "@raycast/api";
import { Preferences } from "../config/index";
import { markdownToBlocks } from "@tryfabric/martian";
import { BlockObjectRequest } from "@notionhq/client/build/src/api-endpoints";

const preferences = getPreferenceValues<Preferences>();

const notion = new Client({ auth: preferences.notionApiKey });

function escapeLaTeX(str: string): string {
  return str.replace(/\\\(/g, "$").replace(/\\\)/g, "$").replace(/\\\[/g, "$$$\n\n").replace(/\\\]/g, "\n\n$$$");
}

function removeUnsupportedLaTeX(str: string): string {
  // No support for textsc in Katex atm.
  const pattern = /\\textsc\{(.*?)\}/g;
  const replacement = "$1";
  return str.replace(pattern, replacement);
}

function preprocessText(str: string): string {
  str = removeUnsupportedLaTeX(str);
  str = escapeLaTeX(str);
  return str;
}

export async function createConceptNotionPage(title: string, markdown: string): Promise<string> {
  const notionObjects: BlockObjectRequest[] = markdownToBlocks(preprocessText(markdown)) as BlockObjectRequest[];

  const response = await notion.pages.create({
    parent: { database_id: preferences.conceptDatabaseKey },
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
    },
    children: [...notionObjects],
  });

  return response.id;
}
