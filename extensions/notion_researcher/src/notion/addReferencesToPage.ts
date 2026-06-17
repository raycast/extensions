import { Client } from "@notionhq/client";
import { getPreferenceValues } from "@raycast/api";
import { Preferences } from "../config/index";
import { CitedPaper } from "../semanticScholar/types";

const preferences = getPreferenceValues<Preferences>();

const notion = new Client({ auth: preferences.notionApiKey });

export async function addReferencesToNotion(pageId: string, references: CitedPaper[]) {
  const response = await notion.blocks.children.append({
    block_id: pageId,
    children: [
      {
        heading_2: {
          rich_text: [
            {
              text: {
                content: "References",
              },
            },
          ],
          color: "green",
        },
      },
      ...references.map(({ title, url, citationCount, openAccessPdf }) => ({
        numbered_list_item: {
          rich_text: [
            {
              text: {
                content: `${title}`,
                link: { url: openAccessPdf?.url ?? url },
              },
            },
            {
              text: {
                content: ` [${citationCount}]`,
              },
              annotations: {
                bold: true,
              },
            },
          ],
        },
      })),
    ],
  });

  return response;
}
