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

async function resolveDataSourceId(notion: Client, databaseOrDataSourceId: string): Promise<string> {
  try {
    await notion.dataSources.retrieve({
      data_source_id: databaseOrDataSourceId,
    });
    return databaseOrDataSourceId;
  } catch {
    // Fall through and try resolving from database metadata.
  }

  try {
    const database = await notion.databases.retrieve({
      database_id: databaseOrDataSourceId,
    });

    if ("data_sources" in database && database.data_sources[0]?.id) {
      return database.data_sources[0].id;
    }
  } catch {
    // Fall back to the provided id if it cannot be resolved.
  }

  return databaseOrDataSourceId;
}

export async function fetchDatabase(pageId: string, silent: boolean = true) {
  try {
    const notion = getNotionClient();
    const dataSourceId = await resolveDataSourceId(notion, pageId);
    const page = await notion.dataSources.retrieve({
      data_source_id: dataSourceId,
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
      filter: { property: "object", value: "data_source" },
    });
    return databases.results
      .map((x) => (x.object === "data_source" && "last_edited_time" in x ? x : undefined))
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
    const dataSourceId = await resolveDataSourceId(notion, databaseId);
    const dataSource = await notion.dataSources.retrieve({ data_source_id: dataSourceId });

    if (!("properties" in dataSource)) return [];

    const propertyNames = Object.keys(dataSource.properties).reverse();

    const databaseProperties: DatabaseProperty[] = [];

    propertyNames.forEach((name) => {
      const property = dataSource.properties[name];
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
    const dataSourceId = await resolveDataSourceId(notion, databaseId);
    const database = await notion.dataSources.query({
      data_source_id: dataSourceId,
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

async function resolveParentDatabaseId(notion: Client, databaseOrDataSourceId: string): Promise<string> {
  try {
    const dataSource = await notion.dataSources.retrieve({
      data_source_id: databaseOrDataSourceId,
    });

    if ("parent" in dataSource && "database_id" in dataSource.parent) {
      return dataSource.parent.database_id;
    }
  } catch {
    // Not a valid data source id, try resolving from database metadata.
  }

  try {
    const database = await notion.databases.retrieve({
      database_id: databaseOrDataSourceId,
    });

    if ("data_sources" in database && database.data_sources[0]?.id) {
      try {
        const dataSource = await notion.dataSources.retrieve({
          data_source_id: database.data_sources[0].id,
        });
        if ("parent" in dataSource && "database_id" in dataSource.parent) {
          return dataSource.parent.database_id;
        }
      } catch {
        // Fall through and use database id as a safe fallback.
      }
    }

    if ("id" in database && database.id) {
      return database.id;
    }
  } catch {
    // Fall back to the provided id for workspaces still passing database ids.
  }

  return databaseOrDataSourceId;
}

export async function createDatabasePage(values: Form.Values) {
  try {
    const notion = getNotionClient();
    const { database, content, ...props } = values;
    const parentDatabaseId = await resolveParentDatabaseId(notion, database);

    const arg: CreateRequest = {
      parent: { database_id: parentDatabaseId },
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
      if (formatted) arg.properties![propId] = formatted;
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
    const dataSourceId = await resolveDataSourceId(notion, databaseId);

    await showToast({
      style: Toast.Style.Animated,
      title: "Deleting database",
    });

    await notion.dataSources.update({
      data_source_id: dataSourceId,
      in_trash: true,
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
