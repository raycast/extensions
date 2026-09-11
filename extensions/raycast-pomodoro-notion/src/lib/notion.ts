import {
  APIErrorCode,
  APIResponseError,
  Client,
  ClientErrorCode,
  isFullDataSource,
  isFullDatabase,
  isNotionClientError,
} from "@notionhq/client";

import { getWorkSessionTypes, type FocusLevel } from "./preferences";
import type { PomodoroSession } from "./pomodoro-state";

export const REQUIRED_FOCUS_OPTIONS = ["High", "Medium", "Low"] as const;

export const REQUIRED_DATABASE_SCHEMA = {
  Name: "title",
  Start: "date",
  End: "date",
  "Work Note": "rich_text",
  Focus: "select",
  "Session Type": "select",
  Time: "number",
} as const;

export type ValidationResult = {
  ok: boolean;
  databaseTitle?: string;
  missingProperties: string[];
  invalidProperties: Array<{ name: string; expected: string; actual: string }>;
  focusOptions: string[];
  missingFocusOptions: string[];
  sessionTypeOptions: string[];
  missingSessionTypeOptions: string[];
};

export function createNotionClient(token: string): Client {
  return new Client({ auth: token });
}

export type NotionDatabaseSummary = {
  id: string;
  title: string;
};

export function extractPlainTextFromTitle(property: unknown): string {
  if (!Array.isArray(property)) {
    return "";
  }

  return property
    .map((item) => {
      if (item && typeof item === "object" && "plain_text" in item && typeof item.plain_text === "string") {
        return item.plain_text;
      }
      return "";
    })
    .join("")
    .trim();
}

type DatabasePropertySchema = Record<
  string,
  {
    type?: string;
    select?: { options?: Array<{ name: string }> };
  }
>;

type DatabaseSchemaInfo = {
  databaseTitle: string;
  properties: DatabasePropertySchema;
};

async function loadDatabaseSchemaInfo(notion: Client, databaseId: string): Promise<DatabaseSchemaInfo> {
  const response = await notion.databases.retrieve({ database_id: databaseId });

  if (isFullDatabase(response)) {
    const firstDataSourceId = response.data_sources[0]?.id;
    if (firstDataSourceId) {
      const dataSourceResponse = await notion.dataSources.retrieve({
        data_source_id: firstDataSourceId,
      });

      if (!isFullDataSource(dataSourceResponse)) {
        throw new Error("Could not load the Notion database schema. Check the Database ID and Connect permissions.");
      }

      return {
        databaseTitle: extractPlainTextFromTitle(dataSourceResponse.title) || extractPlainTextFromTitle(response.title),
        properties: dataSourceResponse.properties,
      };
    }
  }

  const legacyResponse = response as {
    properties?: DatabasePropertySchema;
    title?: unknown;
  };
  if (legacyResponse.properties) {
    return {
      databaseTitle: extractPlainTextFromTitle(legacyResponse.title),
      properties: legacyResponse.properties,
    };
  }

  throw new Error("Could not load the Notion database schema. Check the Database ID and Connect permissions.");
}

async function resolveDatabaseIdFromDataSource(
  notion: Client,
  result: {
    id?: string;
    parent?: { type?: string; database_id?: string };
    database_parent?: { type?: string; database_id?: string };
  },
): Promise<string | null> {
  if (result.parent?.type === "database_id" && result.parent.database_id) {
    return result.parent.database_id;
  }

  if (result.database_parent?.type === "database_id" && result.database_parent.database_id) {
    return result.database_parent.database_id;
  }

  if (!result.id) {
    return null;
  }

  try {
    const full = await notion.dataSources.retrieve({ data_source_id: result.id });
    if (isFullDataSource(full)) {
      if (full.parent?.type === "database_id" && full.parent.database_id) {
        return full.parent.database_id;
      }
      if (full.database_parent?.type === "database_id" && full.database_parent.database_id) {
        return full.database_parent.database_id;
      }
    }
  } catch {
    return null;
  }

  return null;
}

export async function searchNotionDatabases(token: string): Promise<NotionDatabaseSummary[]> {
  const notion = createNotionClient(token);
  const summaries = new Map<string, string>();
  let cursor: string | undefined;

  do {
    const response = await notion.search({
      filter: {
        property: "object",
        value: "data_source",
      },
      page_size: 100,
      start_cursor: cursor,
    });

    for (const result of response.results) {
      if (!("object" in result) || result.object !== "data_source") {
        continue;
      }

      const databaseId = await resolveDatabaseIdFromDataSource(notion, result);
      if (!databaseId) {
        continue;
      }

      const title = extractPlainTextFromTitle("title" in result ? result.title : undefined) || "Untitled database";
      summaries.set(databaseId, title);
    }

    cursor = response.has_more ? (response.next_cursor ?? undefined) : undefined;
  } while (cursor);

  return [...summaries.entries()]
    .map(([id, title]) => ({ id, title }))
    .sort((left, right) => left.title.localeCompare(right.title));
}

export async function validatePomodoroDatabase(token: string, databaseId: string): Promise<ValidationResult> {
  const notion = createNotionClient(token);
  const { databaseTitle, properties } = await loadDatabaseSchemaInfo(notion, databaseId);
  const missingProperties: string[] = [];
  const invalidProperties: Array<{
    name: string;
    expected: string;
    actual: string;
  }> = [];

  for (const [name, expectedType] of Object.entries(REQUIRED_DATABASE_SCHEMA)) {
    const property = properties[name];
    if (!property || !property.type) {
      missingProperties.push(name);
      continue;
    }

    const typeMatches =
      property.type === expectedType ||
      (name === "Work Note" && expectedType === "rich_text" && property.type === "text");

    if (!typeMatches) {
      invalidProperties.push({
        name,
        expected: expectedType,
        actual: property.type,
      });
    }
  }

  const focusOptions = properties.Focus?.select?.options?.map((option) => option.name) ?? [];
  const missingFocusOptions = REQUIRED_FOCUS_OPTIONS.filter((option) => !focusOptions.includes(option));
  const configuredWorkSessionTypes = getWorkSessionTypes();
  const sessionTypeOptions = properties["Session Type"]?.select?.options?.map((option) => option.name) ?? [];
  const missingSessionTypeOptions = configuredWorkSessionTypes.filter((option) => !sessionTypeOptions.includes(option));

  return {
    ok: missingProperties.length === 0 && invalidProperties.length === 0,
    databaseTitle,
    missingProperties,
    invalidProperties,
    focusOptions,
    missingFocusOptions,
    sessionTypeOptions,
    missingSessionTypeOptions,
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function buildFriendlyNotionErrorMessage(error: unknown): string {
  if (!isNotionClientError(error)) {
    return error instanceof Error ? error.message : "Unknown error";
  }

  if (APIResponseError.isAPIResponseError(error)) {
    switch (error.code) {
      case APIErrorCode.Unauthorized:
        return "Notion Token is invalid or lacks permission.";
      case APIErrorCode.RestrictedResource:
      case APIErrorCode.ObjectNotFound:
        return "Database ID is incorrect, or the Connect is not linked to the database.";
      case APIErrorCode.ValidationError:
        return `The Notion database schema does not match the required layout. ${error.message}`;
      case APIErrorCode.RateLimited:
        return "Notion API rate limit reached. Wait a moment and try again.";
      case APIErrorCode.InternalServerError:
      case APIErrorCode.ServiceUnavailable:
      case APIErrorCode.GatewayTimeout:
        return "Notion is temporarily unavailable. Wait a moment and try again.";
      default:
        return error.message;
    }
  }

  if (error.code === ClientErrorCode.RequestTimeout) {
    return "Notion API request timed out. Check your network and try again.";
  }

  return error.message;
}

function isRetryableNotionError(error: unknown): boolean {
  if (!isNotionClientError(error)) {
    return false;
  }

  if (APIResponseError.isAPIResponseError(error)) {
    return [
      APIErrorCode.RateLimited,
      APIErrorCode.InternalServerError,
      APIErrorCode.ServiceUnavailable,
      APIErrorCode.GatewayTimeout,
      APIErrorCode.ConflictError,
    ].includes(error.code);
  }

  return error.code === ClientErrorCode.RequestTimeout || error.code === ClientErrorCode.ResponseError;
}

export async function createWorkLogPage(args: {
  token: string;
  databaseId: string;
  session: PomodoroSession;
  note: string;
  focus: FocusLevel;
  endAt: string;
  timeMinutes: number;
}): Promise<void> {
  const { token, databaseId, session, note, focus, endAt, timeMinutes } = args;
  const notion = createNotionClient(token);
  const title = `Pomodoro ${new Date(session.startedAt).toLocaleString("en-US", { hour12: false })}`;
  const payload = {
    parent: {
      type: "database_id" as const,
      database_id: databaseId,
    },
    properties: {
      Name: {
        title: [
          {
            text: {
              content: title,
            },
          },
        ],
      },
      Start: {
        date: {
          start: session.startedAt,
        },
      },
      End: {
        date: {
          start: endAt,
        },
      },
      "Work Note": {
        rich_text: note
          ? [
              {
                text: {
                  content: note.slice(0, 1900),
                },
              },
            ]
          : [],
      },
      Focus: {
        select: {
          name: focus,
        },
      },
      ...(session.workType
        ? {
            "Session Type": {
              select: {
                name: session.workType,
              },
            },
          }
        : {}),
      Time: {
        number: timeMinutes,
      },
    },
  };

  const maxAttempts = 3;
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      await notion.pages.create(payload);
      return;
    } catch (error) {
      lastError = error;
      if (!isRetryableNotionError(error) || attempt === maxAttempts) {
        break;
      }

      await sleep(500 * 2 ** (attempt - 1));
    }
  }

  throw new Error(buildFriendlyNotionErrorMessage(lastError));
}
