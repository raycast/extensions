import { Client, isNotionClientError } from "@notionhq/client";
import { BlockObjectRequest } from "@notionhq/client/build/src/api-endpoints";
import { showToast, Color, Form, Toast, OAuth, getPreferenceValues, Image, Icon } from "@raycast/api";
import { markdownToBlocks } from "@tryfabric/martian";
import { format, subMinutes } from "date-fns";
import fetch from "node-fetch";
import { NotionToMarkdown } from "notion-to-md";

import {
  Page,
  Database,
  DatabaseProperty,
  DatabasePropertyOption,
  User,
  supportedPropTypes,
  UnwrapRecord,
  NotionObject,
  PagePropertyType,
} from "./types";

const clientId = "c843219a-d93c-403c-8e4d-e8aa9a987494";
const client = new OAuth.PKCEClient({
  redirectMethod: OAuth.RedirectMethod.Web,
  providerName: "Notion",
  providerIcon: "notion-logo.png",
  providerId: "notion",
  description: "Connect your Notion account",
});

const preferenceToken = getPreferenceValues().notion_token;
let notion = new Client({
  auth: preferenceToken,
});

// Authorization

let alreadyAuthorizing: Promise<void> | false = false;

export async function authorize() {
  // we are authorized with a token in the preference
  if (preferenceToken) {
    return;
  }

  const tokenSet = await client.getTokens();
  // we are already authorized with oauth
  if (tokenSet?.accessToken) {
    notion = new Client({
      auth: tokenSet.accessToken,
    });
    return;
  }

  if (alreadyAuthorizing) {
    await alreadyAuthorizing;
    return;
  }

  // we aren't yet authorized so let's do so now
  alreadyAuthorizing = new Promise((resolve, reject) => {
    async function run() {
      const authRequest = await client.authorizationRequest({
        endpoint: "https://notion.oauth-proxy.raycast.com/authorize",
        clientId,
        scope: "",
        extraParameters: { owner: "user" },
      });
      const { authorizationCode } = await client.authorize(authRequest);
      const tokens = await fetchTokens(authRequest, authorizationCode);

      await client.setTokens(tokens);

      notion = new Client({
        auth: (await client.getTokens())?.accessToken,
      });
    }

    run().then(resolve, reject);
  });

  await alreadyAuthorizing;
}

export async function fetchTokens(authRequest: OAuth.AuthorizationRequest, code: string) {
  const response = await fetch("https://notion.oauth-proxy.raycast.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: clientId,
      code,
      code_verifier: authRequest.codeVerifier,
      grant_type: "authorization_code",
      redirect_uri: authRequest.redirectURI,
    }),
  });
  if (!response.ok) {
    console.error("fetch tokens error:", await response.text());
    throw new Error(response.statusText);
  }
  return (await response.json()) as OAuth.TokenResponse;
}

function isNotNullOrUndefined<T>(input: null | undefined | T): input is T {
  return input != null;
}

function handleError<T>(err: unknown, title: string, returnValue: T): T {
  console.error(err);
  if (isNotionClientError(err)) {
    showToast({
      style: Toast.Style.Failure,
      title: err.message,
    });
  } else {
    showToast({
      style: Toast.Style.Failure,
      title,
    });
  }
  return returnValue;
}

export async function fetchDatabases() {
  try {
    await authorize();
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
            last_edited_time: new Date(x.last_edited_time).getTime(),
            title: x.title[0]?.plain_text,
            icon_emoji: x.icon?.type === "emoji" ? x.icon.emoji : null,
            icon_file: x.icon?.type === "file" ? x.icon.file.url : null,
            icon_external: x.icon?.type === "external" ? x.icon.external.url : null,
          }) as Database,
      );
  } catch (err) {
    return handleError(err, "Failed to fetch databases", []);
  }
}

export async function fetchDatabaseProperties(databaseId: string) {
  try {
    await authorize();
    const database = await notion.databases.retrieve({ database_id: databaseId });
    const propertyNames = Object.keys(database.properties).reverse();

    const databaseProperties: DatabaseProperty[] = [];

    propertyNames.forEach((name) => {
      const property = database.properties[name];

      if (supportedPropTypes.indexOf(property.type) === -1) {
        return;
      }

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
            property.select.options,
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
    return handleError(err, "Failed to fetch database properties", []);
  }
}

export async function queryDatabase(
  databaseId: string,
  query: string | undefined,
  sort: "last_edited_time" | "created_time" = "last_edited_time",
) {
  try {
    await authorize();
    const database = await notion.databases.query({
      database_id: databaseId,
      page_size: 20,
      sorts: [
        {
          direction: "descending",
          timestamp: sort,
        },
      ],
      filter: query
        ? {
            and: [
              {
                property: "title",
                title: {
                  contains: query,
                },
              },
            ],
          }
        : undefined,
    });

    return database.results.map(pageMapper);
  } catch (err) {
    return handleError(err, "Failed to query database", []);
  }
}

type CreateRequest = Parameters<typeof notion.pages.create>[0];
type DatabaseCreateProperties<T> = T extends { parent: { type?: "database_id" }; properties: infer U } ? U : never;
type DatabaseCreateProperty = UnwrapRecord<DatabaseCreateProperties<CreateRequest>>;

// Create database page
export async function createDatabasePage(values: Form.Values) {
  try {
    await authorize();
    const { database, content, ...props } = values;

    const arg: CreateRequest = {
      parent: { database_id: database },
      properties: {},
    };

    if (content) {
      // TODO: why do I need to cast this?
      arg.children = markdownToBlocks(content) as BlockObjectRequest[];
    }

    Object.keys(props).forEach((formId) => {
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
          case "date": {
            type DateProperty = Exclude<Extract<DatabaseCreateProperty, { type?: "date" }>["date"], null>;
            type DatePropertyTimeZone = Required<DateProperty["time_zone"]>;
            arg.properties[propId] = {
              date: {
                start: format(
                  subMinutes(new Date(value), new Date().getTimezoneOffset()),
                  "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'",
                ),
                time_zone: Intl.DateTimeFormat().resolvedOptions().timeZone as DatePropertyTimeZone,
              },
            };
            break;
          }

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
              multi_select: value.map((multi_select_id: string) => ({ id: multi_select_id })),
            };
            break;
          case "relation":
            arg.properties[propId] = {
              relation: value.map((relation_page_id: string) => ({ id: relation_page_id })),
            };
            break;
          case "people":
            arg.properties[propId] = {
              people: value.map((user_id: string) => ({ id: user_id })),
            };
            break;
        }
      }
    });

    const page = await notion.pages.create(arg);

    return pageMapper(page);
  } catch (err) {
    return handleError(err, "Failed to create page", undefined);
  }
}

export async function deletePage(pageId: string) {
  try {
    await authorize();

    await showToast({
      style: Toast.Style.Animated,
      title: "Deleting page",
    });

    await notion.pages.update({
      page_id: pageId,
      archived: true,
    });

    await showToast({
      style: Toast.Style.Success,
      title: "Page deleted",
    });
  } catch (err) {
    return handleError(err, "Failed to delete page", undefined);
  }
}

export async function patchPage(pageId: string, properties: Parameters<typeof notion.pages.update>[0]["properties"]) {
  try {
    await authorize();
    const page = await notion.pages.update({
      page_id: pageId,
      properties,
    });

    return pageMapper(page);
  } catch (err) {
    return handleError(err, "Failed to update page", undefined);
  }
}

export async function search(query: string | undefined) {
  try {
    await authorize();
    const database = await notion.search({
      sort: {
        direction: "descending",
        timestamp: "last_edited_time",
      },
      page_size: 20,
      query,
    });

    return database.results.map(pageMapper);
  } catch (err) {
    return handleError(err, "Failed to search pages", []);
  }
}

export async function fetchPageContent(pageId: string) {
  try {
    await authorize();
    const { results } = await notion.blocks.children.list({
      block_id: pageId,
    });

    const n2m = new NotionToMarkdown({ notionClient: notion });

    return {
      markdown:
        results.length === 0 ? "*Page is empty*" : n2m.toMarkdownString(await n2m.blocksToMarkdown(results)).parent,
    };
  } catch (err) {
    return handleError(err, "Failed to fetch page content", undefined);
  }
}

export async function fetchUsers() {
  try {
    await authorize();
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
          }) as User,
      );
  } catch (err) {
    return handleError(err, "Failed to fetch users", []);
  }
}

export async function appendBlockToPage(pageId: string, children: BlockObjectRequest[]) {
  try {
    await authorize();

    const { results } = await notion.blocks.children.append({
      block_id: pageId,
      children,
    });

    return results;
  } catch (err) {
    return handleError(err, "Failed to add content to the page", undefined);
  }
}

export async function appendToPage(pageId: string, params: { content: string }) {
  try {
    await authorize();

    const arg: Parameters<typeof notion.blocks.children.append>[0] = {
      block_id: pageId,
      children: markdownToBlocks(params.content) as BlockObjectRequest[],
    };

    const { results } = await notion.blocks.children.append(arg);

    const n2m = new NotionToMarkdown({ notionClient: notion });

    return {
      markdown: results.length === 0 ? "" : "\n\n" + n2m.toMarkdownString(await n2m.blocksToMarkdown(results)),
    };
  } catch (err) {
    return handleError(err, "Failed to add content to the page", { markdown: "" });
  }
}

function pageMapper(jsonPage: NotionObject): Page {
  const page: Page = {
    object: jsonPage.object,
    id: jsonPage.id,
    title: "Untitled",
    properties: {},
    created_by: "created_by" in jsonPage && jsonPage.created_by.object === "user" ? jsonPage.created_by.id : undefined,
    parent_page_id: "parent" in jsonPage && "page_id" in jsonPage.parent ? jsonPage.parent.page_id : undefined,
    parent_database_id:
      "parent" in jsonPage && "database_id" in jsonPage.parent ? jsonPage.parent.database_id : undefined,
    last_edited_time: "last_edited_time" in jsonPage ? new Date(jsonPage.last_edited_time).getTime() : undefined,
    last_edited_user:
      "last_edited_by" in jsonPage && jsonPage.last_edited_by.object === "user"
        ? jsonPage.last_edited_by.id
        : undefined,
    icon_emoji: "icon" in jsonPage && jsonPage.icon?.type === "emoji" ? jsonPage.icon.emoji : null,
    icon_file: "icon" in jsonPage && jsonPage.icon?.type === "file" ? jsonPage.icon.file.url : null,
    icon_external: "icon" in jsonPage && jsonPage.icon?.type === "external" ? jsonPage.icon.external.url : null,
    url: "url" in jsonPage ? jsonPage.url : undefined,
  };

  if (jsonPage.object === "page" && "properties" in jsonPage) {
    page.properties = jsonPage.properties;
    Object.keys(jsonPage.properties).forEach((pk) => {
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
    brown: Color.Yellow,
    red: Color.Red,
    blue: Color.Blue,
    green: Color.Green,
    yellow: Color.Yellow,
    orange: Color.Orange,
    purple: Color.Purple,
    pink: Color.Magenta,
  } as Record<string, Color>;

  return notionColor ? colorMapper[notionColor] : colorMapper["default"];
}

export function getPageIcon(page: Page): Image.ImageLike {
  return page.icon_emoji
    ? page.icon_emoji
    : page.icon_file
    ? page.icon_file
    : page.icon_external
    ? page.icon_external
    : page.object === "database"
    ? Icon.List
    : Icon.BlankDocument;
}

export function getPageName(page: Page): string {
  return (page.icon_emoji ? page.icon_emoji + " " : "") + (page.title ? page.title : "Untitled");
}

export function getPropertyIcon(property: DatabaseProperty | PagePropertyType) {
  switch (property.type) {
    case "checkbox":
      return Icon.Circle;
    case "date":
      return Icon.Calendar;
    case "email":
      return Icon.Envelope;
    case "files":
      return Icon.Paperclip;
    case "formula":
      return "./icon/formula.png";
    case "select":
    case "multi_select":
      return Icon.BulletPoints;
    case "number":
      return Icon.Hashtag;
    case "people":
      return Icon.Person;
    case "phone_number":
      return Icon.Phone;
    case "relation":
      return Icon.ArrowNe;
    case "rich_text":
      return Icon.Paragraph;
    case "rollup":
      return Icon.MagnifyingGlass;
    case "title":
      return Icon.Text;
    case "url":
      return Icon.Link;
    case "status":
      return "./icon/kanban_status_backlog.png";
    default:
      return Icon.QuestionMark;
  }
}
