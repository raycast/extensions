import { Database } from "src/types";
import { Client } from "@notionhq/client";
import { getPreferenceValues } from "@raycast/api";
import { PostContents, Preferences } from "../types";

const { NOTION_INTEGRATION_TOKEN } = getPreferenceValues<Preferences>();

/* Initializing a client */
const notion = new Client({
  auth: NOTION_INTEGRATION_TOKEN,
});

/**
 * Database へ保存
 */
export const postContents = async (values: PostContents) => {
  return await notion.pages.create({
    parent: {
      database_id: values.databaseId,
    },
    properties: {
      title: {
        title: [
          {
            text: {
              content: values.title,
            },
          },
        ],
      },
      ...(values.category && {
        category: {
          select: {
            name: values.category,
          },
        },
      }),
      ...(values.tags &&
        values.tags?.length > 0 && {
          tags: {
            multi_select: values.tags.map((tagName) => ({
              name: tagName,
            })),
          },
        }),
      ...(values.date && {
        date: {
          date: {
            start: values.date.toISOString().split("T")[0], // 日付のみ保存
          },
        },
      }),
    },

    ...(values.content && {
      children: values.content.split("\n").map((line) => {
        return {
          object: "block",
          type: "paragraph",
          paragraph: {
            rich_text: [
              {
                type: "text",
                text: {
                  content: line,
                },
              },
            ],
          },
        };
      }),
    }),
  });
};

/**
 * Database の情報を取得
 */
export const getDatabaseInfo = async (database_id: string): Promise<Database> => {
  try {
    const response = await notion.databases.retrieve({ database_id });

    if ("icon" in response && "title" in response) {
      const title = response.title.length > 0 ? response.title[0].plain_text : "Untitled";

      const icon = response.icon && "emoji" in response.icon ? response.icon.emoji : "📁";

      const selectOptions =
        "category" in response.properties &&
        response.properties?.category.type === "select" &&
        response.properties.category.select.options;
      const categoryNames = selectOptions && selectOptions.map((option) => option.name);

      const multiSelectOptions =
        "tags" in response.properties &&
        response.properties?.tags.type === "multi_select" &&
        response.properties.tags.multi_select.options;
      const tagNames = multiSelectOptions && multiSelectOptions.map((option) => option.name);

      const includeDate = "date" in response.properties && response.properties?.date.type === "date";

      const includeCheckbox = "check" in response.properties && response.properties?.check.type === "checkbox";

      return {
        id: response.id,
        title: `${icon} ${title}`,
        categories: categoryNames || null,
        tags: tagNames || null,
        check: !!includeCheckbox,
        date: !!includeDate,
      };
    } else {
      throw Error("[Notion API Error]: Invalid response");
    }
  } catch (error) {
    throw Error("[Notion API Error]: " + error);
  }
};
