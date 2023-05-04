import { ActionPanel, Detail, List, Action, showToast, ToastStyle, Toast } from "@raycast/api";
import { Client } from "@notionhq/client";
import { useEffect } from "react";
import { useFetch, usePromise } from "@raycast/utils";

const NOTION_API_KEY = "secret_yqrzST3nC8xpNQhtQbNqsAfTj49erafiz9U0bWWzDjk";
const NOTION_PAGE_ID = "372257fe610f4e74bedd53ebb3b89911";
const NOTION_DATABASE_ID = "db01b27689954d5180c8309e01c40fde";
const notion = new Client({ auth: NOTION_API_KEY });
const updateDatabaseProperties = async (database_id: string) => {
  const response = await notion.databases.update({
    database_id,
    properties: {
      title: {
        name: "titleName",
      },
      titleId: {
        rich_text: {},
      },
      deviceType: {
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
        number: {},
      },
      totalPlayedMinutes: {
        number: {},
      },
    },
  });
  return response;
};
const getDatabaseItems = async (database_id: string) => {
  const response = await notion.databases.query({
    database_id,
  });
  return response;
};
const createPage = async (data: any) => {
  const response = await notion.pages
    .create({
      parent: {
        type: "database_id",
        database_id: NOTION_DATABASE_ID,
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
        deviceType: {
          rich_text: [
            {
              type: "text",
              text: {
                content: data.deviceType,
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
    })
    .then((data) => {
      console.log("Create", data.id);
    });
  return response;
};
const updatePage = async (page_id: string, data: any) => {
  const response = await notion.pages
    .update({
      page_id,
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
        deviceType: {
          rich_text: [
            {
              type: "text",
              text: {
                content: data.deviceType,
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
    })
    .then((data) => {
      console.log("Update", data.id);
    });
  return response;
};
const resolveHistory = async (
  items: any,
  existingItems: {
    [key: string]: {
      page_id: string;
      lastUpdatedAt: string;
    };
  }
) => {
  items.forEach(async (item: any) => {
    const { page_id, lastUpdatedAt } = existingItems[item.titleId] || {};
    if (page_id) {
      if (Date.parse(lastUpdatedAt) < Date.parse(item.lastUpdatedAt.replace(/:\d{2}\+/, "+"))) {
        await updatePage(page_id, item);
      }
    } else {
      await createPage(item);
    }
  });
};

export default function Command() {
  const { data: items, isLoading, revalidate } = usePromise(getDatabaseItems, [NOTION_DATABASE_ID], {});
  const existingItems =
    items?.results.reduce((acc: any, item: any) => {
      acc[item.properties.titleId.rich_text[0].plain_text] = {
        page_id: item.id,
        lastUpdatedAt: item.properties.lastUpdatedAt.date.start,
      };
      return acc;
    }, {}) || {};
  return (
    <List isLoading={isLoading}>
      {items?.object === "list" &&
        items.results.map((item: any) => (
          <List.Item
            key={item.id}
            icon={item.icon.external.url}
            title={item.properties.titleName.title[0].text.content}
            accessories={[
              {
                tag: {
                  value: item.properties.totalPlayedMinutes.number + " mins",
                  color: "green",
                },
              },
              { date: new Date(item.properties.lastPlayedAt.date.start), tooltip: "Last played at" },
            ]}
          />
        ))}
    </List>
  );
}
