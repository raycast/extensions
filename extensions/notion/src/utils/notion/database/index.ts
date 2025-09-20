import { Client } from "@notionhq/client";
import type { BlockObjectRequest } from "@notionhq/client/build/src/api-endpoints";
import { type Form, showToast, Toast } from "@raycast/api";
import { markdownToBlocks } from "@tryfabric/martian";

import { isMarkdownPageContent, isReadableProperty } from "..";
import { handleError, isNotNullOrUndefined, pageMapper } from "../global";
import { getNotionClient } from "../oauth";
import { formValueToPropertyValue } from "../page/property";
import { standardize } from "../standardize";

import { DatabaseProperty } from "./property";

export type { PropertyConfig } from "./property";
export type { DatabaseProperty };

export async function fetchDatabase(pageId: string, silent: boolean = true) {
  try {
    const notion = getNotionClient();
    const page = await notion.databases.retrieve({
      database_id: pageId,
    });

    return pageMapper(page);
  } catch (err) {
    if (!silent) return handleError(err, "Failed to fetch database", undefined);
  }
}

export async function fetchDatabases() {
  try {
    const notion = getNotionClient();
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
    const notion = getNotionClient();
    const database = await notion.databases.retrieve({ database_id: databaseId });
    const propertyNames = Object.keys(database.properties).reverse();

    const databaseProperties: DatabaseProperty[] = [];

    propertyNames.forEach((name) => {
      const property = database.properties[name];
      if (isReadableProperty(property)) {
        if (property.type == "select")
          property.select.options.unshift({
            id: "_select_null_",
            name: "No Selection",
            color: "default",
            description: "No selection",
          });

        databaseProperties.push(standardize(property, "config"));
      }
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
    const notion = getNotionClient();
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

type CreateRequest = Parameters<Client["pages"]["create"]>[0];

export async function createDatabasePage(values: Form.Values) {
  try {
    const notion = getNotionClient();
    const { database, content, ...props } = values;

    const arg: CreateRequest = {
      parent: { database_id: database },
      properties: {},
    };

    if (content) {
      arg.children = isMarkdownPageContent(content)
        ? // casting because converting from the `Block` type in martian to the `BlockObjectRequest` type in notion
          (markdownToBlocks(content) as BlockObjectRequest[])
        : content;
    }

    Object.keys(props).forEach((formId) => {
      const type = formId.match(/(?<=property::).*(?=::)/g)?.[0] as DatabaseProperty["type"] | null;
      if (!type) return;
      const propId = formId.match(new RegExp("(?<=property::" + type + "::).*", "g"))?.[0];
      const value = values[formId];
      if (value == "_select_null_") return;
      if (!propId || !value) return;

      const formatted = formValueToPropertyValue(type, value);
      if (formatted) arg.properties[propId] = formatted;
    });

    const page = await notion.pages.create(arg);

    return pageMapper(page);
  } catch (err) {
    throw new Error("Failed to create page", { cause: err });
  }
}

export async function deleteDatabase(databaseId: string) {
  try {
    const notion = getNotionClient();

    await showToast({
      style: Toast.Style.Animated,
      title: "Deleting database",
    });

    await notion.databases.update({
      database_id: databaseId,
      archived: true,
    });

    await showToast({
      style: Toast.Style.Success,
      title: "Database deleted",
    });
  } catch (err) {
    return handleError(err, "Failed to delete database", undefined);
  }
}

export interface Database {
  id: string;
  last_edited_time: number;
  title: string | null;
  icon_emoji: string | null;
  icon_file: string | null;
  icon_external: string | null;
}
