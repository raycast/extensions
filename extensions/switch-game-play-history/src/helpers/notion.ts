import { Client } from "@notionhq/client";
import { IPlayHistory } from "../types/nintendo";
import { Toast, getPreferenceValues, showToast } from "@raycast/api";
const PROPERTY_KEYS = [
  "titleName",
  "titleId",
  "imageUrl",
  "lastUpdatedAt",
  "firstPlayedAt",
  "lastPlayedAt",
  "totalPlayedDays",
  "totalPlayedMinutes",
] as const;

let notionClient: Client;
const getNotionClient = () => {
  if (notionClient) return notionClient;
  const { NOTION_API_KEY } = getPreferenceValues<{
    NOTION_API_KEY?: string;
  }>();
  if (!NOTION_API_KEY) {
    throw new Error("Notion API Key is not set");
  }
  notionClient = new Client({ auth: NOTION_API_KEY });
  return notionClient;
};
const checkProperties = async (databaseID: string) => {
  const notionClient = getNotionClient();
  const { properties } = await notionClient.databases.retrieve({
    database_id: databaseID,
  });
  for (const key of PROPERTY_KEYS) {
    if (!properties[key]) {
      return await notionClient.databases.update({
        database_id: databaseID,
        properties: {
          title: {
            name: "titleName",
          },
          titleId: {
            rich_text: {},
          },
          imageUrl: {
            url: {},
          },
          lastUpdatedAt: {
            date: {},
          },
          firstPlayedAt: {
            date: {},
          },
          lastPlayedAt: {
            date: {},
          },
          totalPlayedDays: {
            number: { format: "number" },
          },
          totalPlayedMinutes: {
            number: { format: "number" },
          },
        },
      });
    }
  }
};
const createPage = async (databaseID: string, data: IPlayHistory) => {
  const notionClient = getNotionClient();
  const response = await notionClient.pages.create({
    parent: {
      type: "database_id",
      database_id: databaseID,
    },
    icon: {
      type: "external",
      external: {
        url: data.imageUrl,
      },
    },
    properties: {
      titleName: {
        title: [
          {
            type: "text",
            text: {
              content: data.titleName,
            },
          },
        ],
      },
      titleId: {
        rich_text: [
          {
            type: "text",
            text: {
              content: data.titleId,
            },
          },
        ],
      },
      imageUrl: {
        url: data.imageUrl,
      },
      lastUpdatedAt: {
        date: {
          start: data.lastUpdatedAt,
        },
      },
      firstPlayedAt: {
        date: {
          start: data.firstPlayedAt,
        },
      },
      lastPlayedAt: {
        date: {
          start: data.lastPlayedAt,
        },
      },
      totalPlayedDays: {
        number: data.totalPlayedDays,
      },
      totalPlayedMinutes: {
        number: data.totalPlayedMinutes,
      },
    },
  });

  return response;
};
const updatePage = async (pageId: string, data: IPlayHistory) => {
  const notionClient = getNotionClient();
  const response = await notionClient.pages.update({
    page_id: pageId,
    properties: {
      titleName: {
        title: [
          {
            type: "text",
            text: {
              content: data.titleName,
            },
          },
        ],
      },
      lastUpdatedAt: {
        date: {
          start: data.lastUpdatedAt,
        },
      },
      firstPlayedAt: {
        date: {
          start: data.firstPlayedAt,
        },
      },
      lastPlayedAt: {
        date: {
          start: data.lastPlayedAt,
        },
      },
      totalPlayedDays: {
        number: data.totalPlayedDays,
      },
      totalPlayedMinutes: {
        number: data.totalPlayedMinutes,
      },
    },
  });

  return response;
};
export const syncDataToNotionDatabase = async (data: IPlayHistory[]) => {
  let successCount = 0;
  let failedCount = 0;
  let totalCount = 0;
  let notionClient: Client;

  // Start Sync
  const toast = await showToast(Toast.Style.Animated, "Syncing data to Notion");

  // Get Notion Client
  try {
    notionClient = getNotionClient();
  } catch (error: any) {
    toast.style = Toast.Style.Failure;
    toast.title = error.message;
    return;
  }

  // Check Notion Database ID
  const { NOTION_DATABASE_ID } = getPreferenceValues<{
    NOTION_DATABASE_ID?: string;
  }>();
  if (!NOTION_DATABASE_ID) {
    toast.style = Toast.Style.Failure;
    toast.title = "Notion Database ID is not set";
    return;
  }
  try {
    // Check Database Properties
    await checkProperties(NOTION_DATABASE_ID);

    // Diff Database
    const { results } = await notionClient.databases.query({
      database_id: NOTION_DATABASE_ID,
    });
    const pagesToCreate = data.filter((item) => {
      const page = results.find((result) => {
        if ("properties" in result && "rich_text" in result.properties.titleId)
          return result.properties.titleId.rich_text[0].plain_text === item.titleId;
      });
      if (!page) return true;
    });
    const pagesToUpdate = data.reduce<{ pageId: string; data: IPlayHistory }[]>((pages, item) => {
      const page = results.find((result) => {
        if (
          "properties" in result &&
          "rich_text" in result.properties.titleId &&
          "number" in result.properties.totalPlayedMinutes
        ) {
          return (
            result.properties.titleId.rich_text[0].plain_text === item.titleId &&
            result.properties.totalPlayedMinutes.number !== item.totalPlayedMinutes
          );
        }
      });
      if (page) {
        pages.push({ pageId: page.id, data: item });
      }
      return pages;
    }, []);
    totalCount = pagesToCreate.length + pagesToUpdate.length;

    // Sync to Database
    const promises = [
      ...pagesToCreate.map((item) => createPage(NOTION_DATABASE_ID, item)),
      ...pagesToUpdate.map((item) => updatePage(item.pageId, item.data)),
    ];
    promises.forEach((promise) => {
      promise
        .then(() => {
          successCount++;
          toast.message = `( ${successCount} / ${totalCount} )`;
        })
        .catch(() => {
          failedCount++;
        });
    });
    await Promise.all(promises);
  } catch (error: any) {
    toast.style = Toast.Style.Failure;
    toast.title = error.message;
    return;
  }

  // End Sync
  toast.style = Toast.Style.Success;
  if (totalCount === 0) {
    toast.title = `No data to sync`;
    toast.message = undefined;
    return;
  }
  toast.title = `Synced ${successCount} data to Notion`;
  toast.message = failedCount ? `${failedCount} failed` : undefined;
};
