import { preferences, FormValues, showToast, ToastStyle, Color } from "@raycast/api";
import fetch, { Headers } from "node-fetch";
import moment from "moment";

const headers = new Headers({
  Authorization: "Bearer " + preferences.notion_token.value,
  "Notion-Version": "2021-08-16",
  "Content-Type": "application/json;charset=UTF-8",
});
const apiURL = "https://api.notion.com/";

export interface User {
  id: string;
  type: string;
  name: string | null;
  avatar_url: string | null;
}

export interface Database {
  id: string;
  last_edited_time: number;
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
  id: string;
  name: string;
  color?: string;
  icon?: string;
}

export interface Page {
  object: string;
  id: string;
  parent_page_id?: string;
  parent_database_id?: string;
  last_edited_time: number;
  title: string | null;
  icon_emoji: string | null;
  icon_file: string | null;
  icon_external: string | null;
  url: string;
  properties: Record<string, any>;
}

export interface PageContent {
  markdown: string | undefined;
  blocks: Record<string, any>[];
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

// Fetch databases
export async function fetchDatabases(): Promise<Database[] | undefined> {
  const databases = await rawFetchDatabases();
  return databases;
}

// Raw function for fetching databases
async function rawFetchDatabases(): Promise<Database[] | undefined> {
  try {
    const response = await fetch(apiURL + `v1/search`, {
      method: "post",
      headers: headers,
      body: JSON.stringify({
        sort: {
          direction: "descending",
          timestamp: "last_edited_time",
        },
        filter: {
          value: "database",
          property: "object",
        },
      }),
    });
    const json = await response.json();

    if (json.object === "error") {
      showToast(ToastStyle.Failure, json.message);
      return [];
    }

    const databases = recordsMapper({
      sourceRecords: json.results as any[],
      models: [
        { targetKey: "last_edited_time", sourceKeys: ["last_edited_time"] },
        { targetKey: "id", sourceKeys: ["id"] },
        { targetKey: "title", sourceKeys: ["title", "0", "plain_text"] },
        { targetKey: "icon_emoji", sourceKeys: ["icon", "emoji"] },
        { targetKey: "icon_file", sourceKeys: ["icon", "file", "url"] },
        { targetKey: "icon_external", sourceKeys: ["icon", "external", "url"] },
      ] as any,
    }) as Database[];

    return databases;
  } catch (err) {
    console.error(err);
    showToast(ToastStyle.Failure, "Failed to fetch databases");
    // throw new Error('Failed to fetch databases')
  }
}

// Fetch database properties
export async function fetchDatabaseProperties(databaseId: string): Promise<DatabaseProperty[] | undefined> {
  const databaseProperties = await rawDatabaseProperties(databaseId);
  return databaseProperties;
}

// Raw function for fetching databases
async function rawDatabaseProperties(databaseId: string): Promise<DatabaseProperty[] | undefined> {
  const databaseProperties: DatabaseProperty[] = [];
  try {
    const response = await fetch(apiURL + `v1/databases/${databaseId}`, {
      method: "get",
      headers: headers,
    });
    const json = await response.json();

    if (json.object === "error") {
      showToast(ToastStyle.Failure, json.message);
      return [];
    }

    const properties = json.properties as Record<string, any>;
    const propertyNames = Object.keys(properties).reverse() as string[];

    propertyNames.forEach(function (name: string) {
      const property = properties[name] as Record<string, any>;

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
          } as DatabasePropertyOption);
          databaseProperty.options = (databaseProperty.options as DatabasePropertyOption[]).concat(
            property.select.options as DatabasePropertyOption[]
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
  } catch (err) {
    console.error(err);
    showToast(ToastStyle.Failure, "Failed to fetch database properties");
    // throw new Error('Failed to fetch database properties')
  }
}

// Create database page
export async function queryDatabase(
  databaseId: string,
  query: { title: string | undefined } | undefined
): Promise<Page[] | undefined> {
  const pages = await rawQueryDatabase(databaseId, query);
  return pages;
}

// Raw function to query databases
async function rawQueryDatabase(
  databaseId: string,
  query: { title: string | undefined } | undefined
): Promise<Page[] | undefined> {
  try {
    const requestBody = {
      page_size: 100,
      sorts: [
        {
          direction: "descending",
          timestamp: "last_edited_time",
        },
      ],
    } as Record<string, any>;

    if (query && query.title) {
      requestBody.filter = {
        and: [
          {
            property: "title",
            title: {
              contains: query.title,
            },
          },
        ],
      };
    }

    const response = await fetch(apiURL + `v1/databases/${databaseId}/query`, {
      method: "post",
      headers: headers,
      body: JSON.stringify(requestBody),
    });
    const json = await response.json();

    if (json.object === "error") {
      showToast(ToastStyle.Failure, json.message);
      return [];
    }

    const fetchedPages = pageListMapper(json.results as Record<string, any>[]);

    return fetchedPages;
  } catch (err) {
    console.error(err);
    showToast(ToastStyle.Failure, "Failed to query databases");
    // throw new Error('Failed to query databases')
  }
}

// Create database page
export async function createDatabasePage(values: FormValues): Promise<Page | undefined> {
  const page = await rawCreateDatabasePage(values);
  return page;
}

// Raw function for creating database page
async function rawCreateDatabasePage(values: FormValues): Promise<Page | undefined> {
  try {
    const requestBody = {
      parent: {
        database_id: values.database,
      },
      properties: {},
    } as Record<string, any>;

    delete values.database;

    Object.keys(values).forEach(function (formId: string) {
      const type = formId.match(/(?<=property::).*(?=::)/g)![0];
      const propId = formId.match(new RegExp("(?<=property::" + type + "::).*", "g"))![0];
      const value = values[formId];

      if (value) {
        switch (type) {
          case "title":
            requestBody.properties[propId] = {
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
            requestBody.properties[propId] = {
              number: parseFloat(value),
            };
            break;
          case "rich_text":
            requestBody.properties[propId] = {
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
            requestBody.properties[propId] = {
              url: value,
            };
            break;
          case "email":
            requestBody.properties[propId] = {
              email: value,
            };
            break;
          case "phone_number":
            requestBody.properties[propId] = {
              phone_number: value,
            };
            break;
          case "date":
            requestBody.properties[propId] = {
              date: {
                start: value,
              },
            };
            break;
          case "checkbox":
            requestBody.properties[propId] = {
              checkbox: value === 1 ? true : false,
            };
            break;
          case "select":
            if (value !== "_select_null_") {
              requestBody.properties[propId] = {
                select: { id: value },
              };
            }
            break;
          case "multi_select":
            requestBody.properties[propId] = {
              multi_select: value.map(function (multi_select_id: string) {
                return { id: multi_select_id };
              }),
            };
            break;
          case "relation":
            requestBody.properties[propId] = {
              relation: value.map(function (relation_page_id: string) {
                return { id: relation_page_id };
              }),
            };
            break;
          case "people":
            requestBody.properties[propId] = {
              people: value.map(function (user_id: string) {
                return { id: user_id };
              }),
            };
            break;
        }
      }
    });
    const response = await fetch(apiURL + `v1/pages`, {
      method: "post",
      headers: headers,
      body: JSON.stringify(requestBody),
    });
    const json = (await response.json()) as Record<string, any>;

    const page = pageMapper(json);

    return page;
  } catch (err) {
    console.error(err);
    showToast(ToastStyle.Failure, "Failed to create page");
    // throw new Error('Failed to create page')
  }
}

// Patch page
export async function patchPage(pageId: string, properties: Record<string, any>): Promise<Page | undefined> {
  const page = await rawPatchPage(pageId, properties);
  return page;
}
// Raw function for updating page
async function rawPatchPage(pageId: string, properties: Record<string, any>): Promise<Page | undefined> {
  try {
    const requestBody = {
      properties: properties,
    };

    const response = await fetch(apiURL + `v1/pages/${pageId}`, {
      method: "patch",
      headers: headers,
      body: JSON.stringify(requestBody),
    });
    const json = (await response.json()) as Record<string, any>;

    if (json.object === "error") {
      showToast(ToastStyle.Failure, json.message);
      return undefined;
    }

    const page = pageMapper(json);

    return page;
  } catch (err) {
    console.error(err);
    showToast(ToastStyle.Failure, "Failed to update page");
    // throw new Error('Failed to update page')
  }
}

// Search pages
export async function searchPages(query: string | undefined): Promise<Page[] | undefined> {
  const pages = await rawSearchPages(query);
  return pages;
}

// Raw function for searching pages
async function rawSearchPages(query: string | undefined): Promise<Page[] | undefined> {
  try {
    const requestBody = {
      sort: {
        direction: "descending",
        timestamp: "last_edited_time",
      },
    } as Record<string, any>;

    if (query) {
      requestBody.query = query;
    }

    const response = await fetch(apiURL + `v1/search`, {
      method: "post",
      headers: headers,
      body: JSON.stringify(requestBody),
    });
    const json = (await response.json()) as Record<string, any>;

    if (json.object === "error") {
      showToast(ToastStyle.Failure, json.message);
      return [];
    }

    const pages = pageListMapper(json.results as Record<string, any>[]);

    return pages;
  } catch (err) {
    showToast(ToastStyle.Failure, "Failed to load pages");
    // throw new Error('Failed to load pages')
  }
}

// Fetch page content
export async function fetchPageContent(pageId: string): Promise<PageContent | undefined> {
  const fetchedPageContent = (await rawFetchPageContent(pageId)) as Record<string, any> | null;

  let pageContent: PageContent = {
    blocks: [],
    markdown: "",
  };

  if (fetchedPageContent && fetchedPageContent.blocks) {
    pageContent = fetchedPageContent as PageContent;
    pageContent.markdown = "";

    const pageBlocks = pageContent.blocks;
    pageBlocks.forEach(function (block: Record<string, any>) {
      try {
        if (block.type !== "image") {
          let tempText = "";

          if (block[block.type].text[0]) {
            try {
              block[block.type].text.forEach(function (text: Record<string, any>) {
                if (text.plain_text) {
                  tempText += notionTextToMarkdown(text);
                }
              });
            } catch (e) {
              // ignore the error?
            }
          } else {
            if (block[block.type].text.plain_text) {
              tempText += notionTextToMarkdown(block[block.type].text);
            }
          }

          pageContent.markdown += notionBlockToMarkdown(tempText, block) + "\n";
        } else {
          pageContent.markdown += "![image](" + block.image.file.url + ")" + "\n";
        }
      } catch (e) {
        // ignore the error?
      }
    });

    if (!pageBlocks[0]) {
      pageContent.markdown += "*Page is empty*";
    }
  }

  return pageContent;
}

// Raw function for fetching page content
async function rawFetchPageContent(pageId: string): Promise<PageContent | undefined> {
  try {
    const response = await fetch(apiURL + `v1/blocks/${pageId}/children`, {
      method: "get",
      headers: headers,
    });
    const json = await response.json();

    if (json.object === "error") {
      showToast(ToastStyle.Failure, json.message);
      return;
    }

    const blocks = json.results as Record<string, any>[];

    return { blocks } as PageContent;
  } catch (err) {
    console.error(err);
    showToast(ToastStyle.Failure, "Failed to fetch page content");
    // throw new Error('Failed to fetch page content')
  }
}

// Fetch users
export async function fetchUsers(): Promise<User[] | undefined> {
  const users = await rawListUsers();
  return users;
}

// Raw function for fetching users
async function rawListUsers(): Promise<User[] | undefined> {
  try {
    const response = await fetch(apiURL + `v1/users`, {
      method: "get",
      headers: headers,
    });
    const json = await response.json();

    if (json.object === "error") {
      showToast(ToastStyle.Failure, json.message);
      return [];
    }

    const users = recordsMapper({
      sourceRecords: json.results as any[],
      models: [
        { targetKey: "id", sourceKeys: ["id"] },
        { targetKey: "name", sourceKeys: ["name"] },
        { targetKey: "type", sourceKeys: ["type"] },
        { targetKey: "avatar_url", sourceKeys: ["avatar_url"] },
      ] as any,
    }) as User[];

    return users.filter(function (user) {
      return user.type === "person";
    });
  } catch (err) {
    console.error(err);
    showToast(ToastStyle.Failure, "Failed to fetch users");
    // throw new Error('Failed to fetch users')
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
    showToast(ToastStyle.Failure, "Failed to load Extension README");
    // throw new Error('Failed to load Extension README')
  }
}

function pageListMapper(jsonPageList: Record<string, any>[]): Page[] {
  const pages: Page[] = [];

  jsonPageList.forEach(function (jsonPage) {
    const page = pageMapper(jsonPage);
    pages.push(page);
  });

  return pages;
}

function pageMapper(jsonPage: Record<string, any>): Page {
  const page = recordMapper({
    sourceRecord: jsonPage,
    models: [
      { targetKey: "object", sourceKeys: ["object"] },
      { targetKey: "id", sourceKeys: ["id"] },
      { targetKey: "parent_page_id", sourceKeys: ["parent", "page_id"] },
      { targetKey: "parent_database_id", sourceKeys: ["parent", "database_id"] },
      { targetKey: "last_edited_time", sourceKeys: ["last_edited_time"] },
      { targetKey: "icon_emoji", sourceKeys: ["icon", "emoji"] },
      { targetKey: "icon_file", sourceKeys: ["icon", "file", "url"] },
      { targetKey: "icon_external", sourceKeys: ["icon", "external", "url"] },
      { targetKey: "url", sourceKeys: ["url"] },
    ] as any,
  }) as Page;

  if (page.object === "page") {
    const pageProperties = jsonPage.properties;
    const propertyKeys = Object.keys(pageProperties);
    page.title = "Untitled";
    page.properties = {};

    propertyKeys.forEach(function (pk) {
      const pageProperty = pageProperties[pk];

      // Save page title
      if (pageProperty.type === "title") {
        if (pageProperty.title[0] && pageProperty.title[0].plain_text) {
          page.title = pageProperty.title[0].plain_text;
        }
      }

      // Save page property
      propertyKeys.forEach(function (name) {
        const property = pageProperties[name];
        property.name = name;
        page.properties[property.id] = property;
      });
    });
  } else if (jsonPage.title && jsonPage.title[0] && jsonPage.title[0].plain_text) {
    page.title = jsonPage.title[0].plain_text;
  }
  return page;
}

function recordsMapper(mapper: {
  sourceRecords: any[];
  models: [{ targetKey: string; sourceKeys: string[] }];
}): Record<string, any>[] {
  const sourceRecords = mapper.sourceRecords;
  const models = mapper.models;

  const mappedRecords = [] as any[];

  sourceRecords.forEach(function (sourceRecord) {
    mappedRecords.push(recordMapper({ sourceRecord, models }));
  });

  return mappedRecords;
}

function recordMapper(mapper: {
  sourceRecord: any;
  models: [{ targetKey: string; sourceKeys: string[] }];
}): Record<string, any> {
  const sourceRecord = mapper.sourceRecord;
  const models = mapper.models;

  const mappedRecord = {} as any;
  models.forEach(function (model) {
    const sourceKeys = model.sourceKeys;
    const targetKey = model.targetKey;
    let tempRecord = JSON.parse(JSON.stringify(sourceRecord));
    sourceKeys.forEach(function (sourceKey) {
      if (!tempRecord) {
        return;
      }
      if (sourceKey in tempRecord) {
        tempRecord = tempRecord[sourceKey];
      } else {
        tempRecord = null;
        return;
      }
    });
    mappedRecord[targetKey] = tempRecord;
  });
  return mappedRecord;
}

function notionBlockToMarkdown(text: string, block: Record<string, any>): string {
  const blockValue: Record<string, any> = block[block.type as string];
  switch (block.type as string) {
    case "heading_1": {
      return "# " + text;
    }
    case "heading_2": {
      return "## " + text;
    }
    case "heading_3": {
      return "### " + text;
    }
    case "bulleted_list_item": {
      return "- " + text;
    }
    case "numbered_list_item": {
      return "1. " + text;
    }
    case "to_do": {
      return "\n " + (blockValue.checked ? "☑ " : "☐ ") + text;
    }

    default: {
      return text;
    }
  }
}

function notionTextToMarkdown(text: Record<string, any>): string {
  let plainText = text.plain_text;
  if (text.annotations.bold as boolean) {
    plainText = "**" + plainText + "**";
  } else if (text.annotations.italic as boolean) {
    plainText = "*" + plainText + "*";
  } else if (text.annotations.code as boolean) {
    plainText = "`" + plainText + "`";
  }

  if (text.href) {
    if (text.href.startsWith("/")) {
      plainText = "[" + plainText + "](https://notion.so" + text.href + ")";
    } else {
      plainText = "[" + plainText + "](" + text.href + ")";
    }
  }

  return plainText;
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

export function extractPropertyValue(page: Page, propId: string): string | null {
  const pageProperty = page.properties[propId];
  if (pageProperty) {
    let type = pageProperty.type;
    let propertyValue = pageProperty[type];

    if (propertyValue) {
      let stringPropertyValue = "";

      if (type === "formula") {
        type = propertyValue.type;
        propertyValue = propertyValue[type];
      }

      switch (type) {
        case "title":
          stringPropertyValue = propertyValue[0] ? propertyValue[0].plain_text : "Untitled";
          break;
        case "number":
          stringPropertyValue = propertyValue?.toString();
          break;
        case "rich_text":
          stringPropertyValue = propertyValue[0] ? propertyValue[0].plain_text : null;
          break;
        case "url":
          stringPropertyValue = propertyValue[0] ? propertyValue[0].plain_text : null;
          break;
        case "email":
          stringPropertyValue = propertyValue[0] ? propertyValue[0].plain_text : null;
          break;
        case "phone_number":
          stringPropertyValue = propertyValue[0] ? propertyValue[0].plain_text : null;
          break;
        case "date":
          stringPropertyValue = moment(propertyValue.start).fromNow();
          break;
        case "checkbox":
          stringPropertyValue = propertyValue ? "☑" : "☐";
          break;
        case "select":
          stringPropertyValue = propertyValue.name;
          break;
        case "multi_select":
          stringPropertyValue = propertyValue
            .map(function (selection: Record<string, any>) {
              return selection.name as string;
            })
            .join(", ");
          break;
        case "string":
          stringPropertyValue = propertyValue;
          break;
      }

      if (stringPropertyValue) {
        return stringPropertyValue;
      }
    }
  }

  return null;
}
