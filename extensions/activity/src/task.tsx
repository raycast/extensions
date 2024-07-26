import { ActionPanel, Action, List, Icon, Color, Keyboard, Toast, getPreferenceValues, showToast } from "@raycast/api";
import { Client, isFullPage, collectPaginatedAPI } from "@notionhq/client";
import { getProgressIcon, useCachedPromise } from "@raycast/utils";
import day, { extend } from "dayjs";
import UTC from "dayjs/plugin/utc";
import TZ from "dayjs/plugin/timezone";
import { type PageObjectResponse } from "@notionhq/client/build/src/api-endpoints";

extend(UTC);
extend(TZ);

const notion = new Client({
  auth: getPreferenceValues().NOTION_TOKEN,
});

function showRichText(property?: PageObjectResponse["properties"][string]) {
  if (property?.type !== "title" && property?.type !== "rich_text") return "";
  return (property.type === "title" ? property.title : property.rich_text)
    .map((t) => {
      switch (t.type) {
        case "text":
          return t.text.content;
        case "mention":
          return t.plain_text;
        case "equation":
          return t.plain_text;
      }
    })
    .join("");
}

function showStatus(property?: PageObjectResponse["properties"][string]) {
  if (property?.type !== "status") return "";
  return property.status?.name ?? "";
}

function showDate(property?: PageObjectResponse["properties"][string]) {
  function parse(input: string | undefined) {
    return input ? new Date(input) : undefined;
  }

  switch (property?.type) {
    case "date":
      return parse(property.date?.start);
    case "rollup":
      return parse(property.rollup.type === "date" ? property.rollup.date?.start : undefined);
    default:
      return undefined;
  }
}

function showDuration(property?: PageObjectResponse["properties"][string]) {
  if (property?.type !== "formula") return "";
  if (property.formula.type !== "string") return "";
  return property.formula.string ?? "";
}

function showHealth(property?: PageObjectResponse["properties"][string]) {
  if (property?.type !== "formula") return undefined;
  if (property.formula.type !== "number") return undefined;
  return getProgressIcon(property.formula.number ?? 0, Color.Green);
}

export default function Command() {
  const {
    data: items,
    isLoading,
    revalidate,
  } = useCachedPromise(
    async () => {
      const results = await collectPaginatedAPI(notion.databases.query, {
        database_id: "7edac47b9aec4edb97f3afd64480ff99",
        filter: {
          and: [
            {
              or: [
                {
                  property: "Status",
                  status: {
                    equals: "Scheduled",
                  },
                },
                {
                  property: "Status",
                  status: {
                    equals: "Lurking",
                  },
                },
              ],
            },
            {
              property: "Searchable",
              formula: {
                checkbox: {
                  equals: true,
                },
              },
            },
            {
              property: "Last Activity",
              rollup: {
                date: {
                  on_or_before: new Date().toISOString(),
                },
              },
            },
          ],
        },
        sorts: [
          {
            property: "Last Activity",
            direction: "descending",
          },
          {
            property: "Minutes",
            direction: "descending",
          },
        ],
        page_size: 20,
      });

      return results.filter(isFullPage);
    },
    [],
    {
      failureToastOptions: {
        title: "Failed to Update Tasks",
        primaryAction: {
          title: "Retry",
          shortcut: Keyboard.Shortcut.Common.Refresh,
          onAction: (toast) => {
            toast.hide();
            revalidate();
          },
        },
      },
    },
  );

  // useEffect(() => {
  //   items
  //     ?.map((item) => showDate(item.properties["Due Date"]))
  //     .forEach((d) => {
  //       console.log(d);
  //     });
  // }, [items]);

  return (
    <List isLoading={isLoading}>
      {items?.map((page) => (
        <List.Item
          key={page.id}
          id={page.id}
          icon={
            showStatus(page.properties["Status"]) === "Scheduled"
              ? { source: Icon.BullsEye, tintColor: Color.PrimaryText }
              : { source: Icon.BullsEyeMissed, tintColor: Color.SecondaryText }
          }
          title={showRichText(page.properties["Name"])}
          subtitle={showRichText(page.properties["Note"])}
          accessories={[
            ...(showDate(page.properties["Due Date"])
              ? [
                  {
                    date: { value: showDate(page.properties["Due Date"]), color: Color.Red },
                    icon: { source: Icon.Exclamationmark2, tintColor: Color.Red },
                  },
                ]
              : []),
            {
              text: showDuration(page.properties["Duration"]),
              icon: Icon.Clock,
            },
            {
              tag: "",
              icon: showHealth(page.properties["Health"]),
            },
          ]}
          actions={
            <ActionPanel>
              <Action
                title="Spawn"
                icon={Icon.PlusCircle}
                shortcut={Keyboard.Shortcut.Common.New}
                onAction={async function () {
                  const toast = await showToast({
                    style: Toast.Style.Animated,
                    title: `Creating New Activity ...`,
                  });

                  const {
                    results: [cursor],
                  } = await notion.databases.query({
                    database_id: "1455f83b66c64cbe95f2424b87104e21",
                    filter: {
                      and: [
                        {
                          property: "Cursor",
                          checkbox: { equals: true },
                        },
                      ],
                    },
                    sorts: [
                      {
                        property: "Span",
                        direction: "descending",
                      },
                    ],
                    page_size: 1,
                  });

                  const tasks: Array<Promise<unknown>> = [];

                  update: if (isFullPage(cursor)) {
                    const span = cursor.properties["Span"];
                    if (span.type !== "date" || span.date === null) break update;
                    if (span.date.end !== null) break update;

                    toast.title = `Closing Current Activity & Creating New Activity ...`;

                    tasks.push(
                      notion.pages.update({
                        page_id: cursor.id,
                        properties: {
                          Span: {
                            date: {
                              start: day(span.date.start).format("YYYY-MM-DDTHH:mm:ss"),
                              end: day().format("YYYY-MM-DDTHH:mm:ss"),
                              time_zone: day.tz.guess() as never,
                            },
                          },
                        },
                      }),
                    );
                  }

                  tasks.splice(
                    0,
                    0,
                    notion.pages.create({
                      parent: {
                        database_id: "1455f83b66c64cbe95f2424b87104e21",
                      },
                      icon: {
                        external: {
                          url: "https://cdn.sa.net/2024/02/26/CWBGNRUnJwE1f35.png",
                        },
                      },
                      properties: {
                        Task: {
                          relation: [{ id: page.id }],
                        },
                        Span: {
                          date: {
                            start: day().format("YYYY-MM-DDTHH:mm:ss"),
                            time_zone: day.tz.guess() as never,
                          },
                        },
                      },
                    }),
                  );

                  await Promise.allSettled(tasks);

                  toast.style = Toast.Style.Success;
                  toast.title = `Created New Activity ${showRichText(page.properties["Name"])}`;
                }}
              />
              <Action
                title="New"
                icon={Icon.Plus}
                shortcut={{ modifiers: ["cmd", "shift"], key: "n" }}
                onAction={async function () {
                  const toast = await showToast({
                    style: Toast.Style.Animated,
                    title: `Creating New Activity ...`,
                  });

                  const { id } = await notion.pages.create({
                    parent: {
                      database_id: "1455f83b66c64cbe95f2424b87104e21",
                    },
                    icon: {
                      external: {
                        url: "https://cdn.sa.net/2024/02/26/CWBGNRUnJwE1f35.png",
                      },
                    },
                    properties: {
                      Task: {
                        relation: [{ id: page.id }],
                      },
                      Span: {
                        date: {
                          start: day().format("YYYY-MM-DDTHH:mm:ss"),
                          time_zone: day.tz.guess() as never,
                        },
                      },
                    },
                  });

                  toast.style = Toast.Style.Success;
                  toast.title = `Created New Activity ${showRichText(page.properties["Name"])}`;
                  toast.primaryAction = {
                    title: "Undo",
                    shortcut: { modifiers: ["cmd"], key: "z" },
                    onAction: async function () {
                      toast.style = Toast.Style.Animated;
                      toast.title = `Deleting Activity ${showRichText(page.properties["Name"])} ...`;
                      await notion.pages.update({
                        page_id: id,
                        in_trash: true,
                      });
                      toast.style = Toast.Style.Success;
                      toast.title = `Deleted Activity ${showRichText(page.properties["Name"])}`;
                      toast.primaryAction = undefined;
                    },
                  };
                }}
              />
              <Action.Open
                title="Open in Notion"
                icon={Icon.Folder}
                shortcut={Keyboard.Shortcut.Common.Open}
                target={`notion://${page.url}`}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
