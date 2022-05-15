import { getPreferenceValues, showToast, Color, Form, Toast } from "@raycast/api";
import { Client, isNotionClientError } from "@notionhq/client";
import fetch from "node-fetch";
import moment from "moment";
import { markdownToBlocks } from "@tryfabric/martian";
import { NotionToMarkdown } from "notion-to-md";

const notion = new Client({
  auth: getPreferenceValues().notion_token,
});

export interface User {
  id: string;
  type: string;
  name: string | null;
  avatar_url: string | null;
}

export interface Database {
  id: string;
  last_edited_time: string;
  title: string | null;
  icon_emoji: string | null;
  icon_file: string | null;
  icon_external: string | null;
}

export interface DatabaseProperty {
  id: string;
  type: string;
  name: string;
  options: DatabasePropertyOption[] | User[];
  relation_id?: string;
}

export interface DatabasePropertyOption {
  id?: string;
  name: string;
  color?: string;
  icon?: string;
}

export interface Page {
  object: string;
  id: string;
  parent_page_id?: string;
  parent_database_id?: string;
  last_edited_time?: string;
  title: string | null;
  icon_emoji: string | null;
  icon_file: string | null;
  icon_external: string | null;
  url?: string;
  properties: Record<string, PagePropertyType>;
}

export interface PageContent {
  markdown: string | undefined;
}

export interface DatabaseView {
  properties?: Record<string, any>;
  create_properties?: string[];
  sort_by?: Record<string, any>;
  type?: string;
  name?: string | null;
  kanban?: KabanView;
}

export interface KabanView {
  property_id: string;
  backlog_ids: string[];
  not_started_ids: string[];
  started_ids: string[];
  completed_ids: string[];
  canceled_ids: string[];
}

function isNotNullOrUndefined<T>(input: null | undefined | T): input is T {
  return input != null;
}

// Fetch databases
export async function fetchDatabases(): Promise<Database[]> {
  try {
    const databases = await notion.search({
      sort: {
        direction: "descending",
        timestamp: "last_edited_time",
      },
      filter: { property: "object", value: "database" },
    });
    return databases.results
      .map((x) => (x.object === "database" && "last_edited_time" in x ? x : undefined))
      .filter(isNotNullOrUndefined)
      .map(
        (x) =>
          ({
            id: x.id,
            last_edited_time: x.last_edited_time,
            title: x.title[0]?.plain_text,
            icon_emoji: x.icon?.type === "emoji" ? x.icon.emoji : null,
            icon_file: x.icon?.type === "file" ? x.icon.file.url : null,
            icon_external: x.icon?.type === "external" ? x.icon.external.url : null,
          } as Database)
      );
  } catch (err: unknown) {
    console.error(err);
    if (isNotionClientError(err)) {
      showToast({
        style: Toast.Style.Failure,
        title: err.message,
      });
    } else {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to fetch databases",
      });
    }
    return [];
  }
}

// Fetch database properties
export async function fetchDatabaseProperties(databaseId: string): Promise<DatabaseProperty[]> {
  try {
    const database = await notion.databases.retrieve({ database_id: databaseId });
    const propertyNames = Object.keys(database.properties).reverse();

    const databaseProperties: DatabaseProperty[] = [];

    propertyNames.forEach(function (name: string) {
      const property = database.properties[name];

      const databaseProperty = {
        id: property.id,
        type: property.type,
        name: name,
        options: [],
      } as DatabaseProperty;

      switch (property.type) {
        case "select":
          (databaseProperty.options as DatabasePropertyOption[]).push({
            id: "_select_null_",
            name: "No Selection",
          });
          databaseProperty.options = (databaseProperty.options as DatabasePropertyOption[]).concat(
            property.select.options
          );
          break;
        case "multi_select":
          databaseProperty.options = property.multi_select.options;
          break;
        case "relation":
          databaseProperty.relation_id = property.relation.database_id;
          break;
      }

      databaseProperties.push(databaseProperty);
    });

    return databaseProperties;
  } catch (err: unknown) {
    console.error(err);
    if (isNotionClientError(err)) {
      showToast({
        style: Toast.Style.Failure,
        title: err.message,
      });
    } else {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to fetch database properties",
      });
    }
    return [];
  }
}

/**
 * Query a database
 */
export async function queryDatabase(
  databaseId: string,
  query: { title: string | undefined } | undefined
): Promise<Page[]> {
  try {
    const database = await notion.databases.query({
      database_id: databaseId,
      page_size: 100,
      sorts: [
        {
          direction: "descending",
          timestamp: "last_edited_time",
        },
      ],
      filter:
        query && query.title
          ? {
              and: [
                {
                  property: "title",
                  title: {
                    contains: query.title,
                  },
                },
              ],
            }
          : undefined,
    });

    return database.results.map(pageMapper);
  } catch (err: unknown) {
    console.error(err);
    if (isNotionClientError(err)) {
      showToast({
        style: Toast.Style.Failure,
        title: err.message,
      });
    } else {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to fetch database properties",
      });
    }
    return [];
  }
}

// Create database page
export async function createDatabasePage(values: Form.Values): Promise<Page | undefined> {
  try {
    const { database, content, ...props } = values;

    const arg: Parameters<typeof notion.pages.create>[0] = {
      parent: { database_id: database },
      properties: {},
    };

    if (content) {
      arg.children = markdownToBlocks(content);
    }

    Object.keys(props).forEach(function (formId) {
      const type = formId.match(/(?<=property::).*(?=::)/g)?.[0];
      if (!type) {
        return;
      }
      const propId = formId.match(new RegExp("(?<=property::" + type + "::).*", "g"))?.[0];
      if (!propId) {
        return;
      }
      const value = values[formId];

      if (value) {
        switch (type) {
          case "title":
            arg.properties[propId] = {
              title: [
                {
                  text: {
                    content: value,
                  },
                },
              ],
            };
            break;
          case "number":
            arg.properties[propId] = {
              number: parseFloat(value),
            };
            break;
          case "rich_text":
            arg.properties[propId] = {
              rich_text: [
                {
                  text: {
                    content: value,
                  },
                },
              ],
            };
            break;
          case "url":
            arg.properties[propId] = {
              url: value,
            };
            break;
          case "email":
            arg.properties[propId] = {
              email: value,
            };
            break;
          case "phone_number":
            arg.properties[propId] = {
              phone_number: value,
            };
            break;
          case "date":
            arg.properties[propId] = {
              date: {
                start: value,
              },
            };
            break;
          case "checkbox":
            arg.properties[propId] = {
              checkbox: value === 1 ? true : false,
            };
            break;
          case "select":
            if (value !== "_select_null_") {
              arg.properties[propId] = {
                select: { id: value },
              };
            }
            break;
          case "multi_select":
            arg.properties[propId] = {
              multi_select: value.map(function (multi_select_id: string) {
                return { id: multi_select_id };
              }),
            };
            break;
          case "relation":
            arg.properties[propId] = {
              relation: value.map(function (relation_page_id: string) {
                return { id: relation_page_id };
              }),
            };
            break;
          case "people":
            arg.properties[propId] = {
              people: value.map(function (user_id: string) {
                return { id: user_id };
              }),
            };
            break;
        }
      }
    });

    const page = await notion.pages.create(arg);

    return pageMapper(page);
  } catch (err: unknown) {
    console.error(err);
    if (isNotionClientError(err)) {
      showToast({
        style: Toast.Style.Failure,
        title: err.message,
      });
    } else {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to create page",
      });
    }
    return undefined;
  }
}

// Patch page
export async function patchPage(
  pageId: string,
  properties: Parameters<typeof notion.pages.update>[0]["properties"]
): Promise<Page | undefined> {
  try {
    const page = await notion.pages.update({
      page_id: pageId,
      properties,
    });

    return pageMapper(page);
  } catch (err: unknown) {
    console.error(err);
    if (isNotionClientError(err)) {
      showToast({
        style: Toast.Style.Failure,
        title: err.message,
      });
    } else {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to fetch database properties",
      });
    }
    return undefined;
  }
}

// Search pages
export async function searchPages(query: string | undefined): Promise<Page[]> {
  try {
    const database = await notion.search({
      sort: {
        direction: "descending",
        timestamp: "last_edited_time",
      },
      filter: { property: "object", value: "page" },
      query,
    });

    return database.results.map(pageMapper);
  } catch (err: unknown) {
    console.error(err);
    if (isNotionClientError(err)) {
      showToast({
        style: Toast.Style.Failure,
        title: err.message,
      });
    } else {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to load pages",
      });
    }
    return [];
  }
}

// Fetch page content
export async function fetchPageContent(pageId: string): Promise<PageContent | undefined> {
  try {
    const { results } = await notion.blocks.children.list({
      block_id: pageId,
    });

    const n2m = new NotionToMarkdown({ notionClient: notion });

    return {
      markdown: results.length === 0 ? "*Page is empty*" : n2m.toMarkdownString(await n2m.blocksToMarkdown(results)),
    };
  } catch (err: unknown) {
    console.error(err);
    if (isNotionClientError(err)) {
      showToast({
        style: Toast.Style.Failure,
        title: err.message,
      });
    } else {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to fetch page content",
      });
    }
    return undefined;
  }
}

// Fetch users
export async function fetchUsers(): Promise<User[]> {
  try {
    const users = await notion.users.list({});
    return users.results
      .map((x) => (x.object === "user" && x.type === "person" ? x : undefined))
      .filter(isNotNullOrUndefined)
      .map(
        (x) =>
          ({
            id: x.id,
            name: x.name,
            type: x.type,
            avatar_url: x.avatar_url,
          } as User)
      );
  } catch (err: unknown) {
    console.error(err);
    if (isNotionClientError(err)) {
      showToast({
        style: Toast.Style.Failure,
        title: err.message,
      });
    } else {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to fetch users",
      });
    }
    return [];
  }
}

// Fetch Extension README
export async function fetchExtensionReadMe(): Promise<string | undefined> {
  try {
    const response = await fetch(
      `https://raw.githubusercontent.com/raycast/extensions/main/extensions/notion/README.md`,
      {
        method: "get",
      }
    );
    const text = (await response.text()) as string;

    return text;
  } catch (err) {
    showToast({
      style: Toast.Style.Failure,
      title: "Failed to load Extension README",
    });
  }
}

function getPropertiesTypes(page: UnwrapArray<UnwrapPromise<ReturnType<typeof notion.search>>["results"]>) {
  if (page.object === "page" && "properties" in page) {
    return page.properties;
  }
  throw new Error("this function won't ever be called, it's only for typescript");
}

type UnwrapRecord<T> = T extends Record<string, infer U> ? U : T;

type UnwrapPromise<T> = T extends Promise<infer U> ? U : T;

type UnwrapArray<T> = T extends Array<infer U> ? U : T;

export type PagePropertyType = UnwrapRecord<ReturnType<typeof getPropertiesTypes>>;

function pageMapper(jsonPage: UnwrapArray<UnwrapPromise<ReturnType<typeof notion.search>>["results"]>): Page {
  const page: Page = {
    object: jsonPage.object,
    id: jsonPage.id,
    title: "Untitled",
    properties: {},
    parent_page_id: "parent" in jsonPage && "page_id" in jsonPage.parent ? jsonPage.parent.page_id : undefined,
    parent_database_id:
      "parent" in jsonPage && "database_id" in jsonPage.parent ? jsonPage.parent.database_id : undefined,
    last_edited_time: "last_edited_time" in jsonPage ? jsonPage.last_edited_time : undefined,
    icon_emoji: "icon" in jsonPage && jsonPage.icon?.type === "emoji" ? jsonPage.icon.emoji : null,
    icon_file: "icon" in jsonPage && jsonPage.icon?.type === "file" ? jsonPage.icon.file.url : null,
    icon_external: "icon" in jsonPage && jsonPage.icon?.type === "external" ? jsonPage.icon.external.url : null,
    url: "url" in jsonPage ? jsonPage.url : undefined,
  };

  if (jsonPage.object === "page" && "properties" in jsonPage) {
    page.properties = jsonPage.properties;
    Object.keys(jsonPage.properties).forEach(function (pk) {
      const property = jsonPage.properties[pk];

      // Save page title
      if (property.type === "title") {
        if (property.title[0]?.plain_text) {
          page.title = property.title[0].plain_text;
        }
      }
    });
  }

  if ("title" in jsonPage && jsonPage.title[0]?.plain_text) {
    page.title = jsonPage.title[0]?.plain_text;
  }

  return page;
}

export function notionColorToTintColor(notionColor: string | undefined): Color {
  const colorMapper = {
    default: Color.PrimaryText,
    gray: Color.PrimaryText,
    brown: Color.Brown,
    red: Color.Red,
    blue: Color.Blue,
    green: Color.Green,
    yellow: Color.Yellow,
    orange: Color.Orange,
    purple: Color.Purple,
    pink: Color.Magenta,
  } as Record<string, Color>;

  if (notionColor === undefined) {
    return colorMapper["default"];
  }
  return colorMapper[notionColor];
}

export function extractPropertyValue(
  property?:
    | PagePropertyType
    | {
        type: "string";
        string: string | null;
      }
    | {
        type: "date";
        date: {
          start: string;
          end: string | null;
        } | null;
      }
    | {
        type: "number";
        number: number | null;
      }
    | {
        type: "boolean";
        boolean: boolean | null;
      }
): string | null {
  if (!property) {
    return null;
  }

  switch (property.type) {
    case "title":
      return property.title[0] ? property.title[0].plain_text : "Untitled";
    case "number":
      return property.number?.toString() || null;
    case "rich_text":
      return property.rich_text[0] ? property.rich_text[0].plain_text : null;
    case "url":
      return property.url;
    case "email":
      return property.email;
    case "phone_number":
      return property.phone_number;
    case "date":
      return moment(property.date?.start).fromNow();
    case "checkbox":
      return property.checkbox ? "☑" : "☐";
    case "select":
      return property.select?.name || null;
    case "multi_select":
      return property.multi_select
        .map(function (selection) {
          return selection.name;
        })
        .join(", ");
    case "string":
      return property.string;
    case "boolean":
      return property.boolean ? "☑" : "☐";
    case "formula":
      return extractPropertyValue(property.formula);
  }

  return null;
}
