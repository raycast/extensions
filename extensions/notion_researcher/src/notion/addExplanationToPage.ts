import { Client } from "@notionhq/client";
import { getPreferenceValues } from "@raycast/api";
import { Preferences } from "../config/index";
import { Explanation } from "../llm/types";

const preferences = getPreferenceValues<Preferences>();

const notion = new Client({ auth: preferences.notionApiKey });

export async function addExplanationsToNotion(pageId: string, explanations: Explanation[]) {
  const response = await notion.blocks.children.append({
    block_id: pageId,
    children: [
      {
        heading_2: {
          rich_text: [
            {
              text: {
                content: "Explanations",
              },
            },
          ],
          color: "blue",
        },
      },
      ...explanations.map(({ title, explanation }) => ({
        paragraph: {
          rich_text: [
            {
              text: {
                content: `${title}: `,
              },
              annotations: {
                bold: true,
              },
            },
            {
              text: {
                content: explanation,
              },
            },
          ],
        },
      })),
    ],
  });

  return response;
}
