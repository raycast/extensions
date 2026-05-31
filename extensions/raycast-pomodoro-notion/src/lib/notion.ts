import {
  APIErrorCode,
  APIResponseError,
  Client,
  ClientErrorCode,
  isNotionClientError,
} from "@notionhq/client";

import { getWorkSessionTypes, type FocusLevel } from "./preferences";
import type { PomodoroSession } from "./pomodoro-state";

export const REQUIRED_FOCUS_OPTIONS = ["高", "中", "低"] as const;

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

function extractPlainTextFromTitle(property: unknown): string {
  if (!Array.isArray(property)) {
    return "";
  }

  return property
    .map((item) => {
      if (
        item &&
        typeof item === "object" &&
        "plain_text" in item &&
        typeof item.plain_text === "string"
      ) {
        return item.plain_text;
      }
      return "";
    })
    .join("")
    .trim();
}

export async function validatePomodoroDatabase(
  token: string,
  databaseId: string,
): Promise<ValidationResult> {
  const notion = createNotionClient(token);
  const response = await notion.databases.retrieve({ database_id: databaseId });
  const database = response as unknown as {
    title?: unknown;
    data_sources?: Array<{ id: string }>;
  };

  const firstDataSourceId = database.data_sources?.[0]?.id;
  if (!firstDataSourceId) {
    throw new Error(
      "Notion データベースに data source が見つかりませんでした。",
    );
  }

  const dataSourceResponse = await notion.dataSources.retrieve({
    data_source_id: firstDataSourceId,
  });
  const dataSource = dataSourceResponse as unknown as {
    title?: unknown;
    properties?: Record<
      string,
      {
        type?: string;
        select?: { options?: Array<{ name: string }> };
      }
    >;
  };

  const properties = dataSource.properties ?? {};
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
      (name === "Work Note" &&
        expectedType === "rich_text" &&
        property.type === "text");

    if (!typeMatches) {
      invalidProperties.push({
        name,
        expected: expectedType,
        actual: property.type,
      });
    }
  }

  const focusOptions =
    properties.Focus?.select?.options?.map((option) => option.name) ?? [];
  const missingFocusOptions = REQUIRED_FOCUS_OPTIONS.filter(
    (option) => !focusOptions.includes(option),
  );
  const configuredWorkSessionTypes = getWorkSessionTypes();
  const sessionTypeOptions =
    properties["Session Type"]?.select?.options?.map((option) => option.name) ??
    [];
  const missingSessionTypeOptions = configuredWorkSessionTypes.filter(
    (option) => !sessionTypeOptions.includes(option),
  );

  return {
    ok: missingProperties.length === 0 && invalidProperties.length === 0,
    databaseTitle:
      extractPlainTextFromTitle(dataSource.title) ||
      extractPlainTextFromTitle(database.title),
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
    return error instanceof Error ? error.message : "不明なエラー";
  }

  if (APIResponseError.isAPIResponseError(error)) {
    switch (error.code) {
      case APIErrorCode.Unauthorized:
        return "Notion Token が無効か、権限が不足しています。";
      case APIErrorCode.RestrictedResource:
      case APIErrorCode.ObjectNotFound:
        return "Database ID が誤っているか、コネクトがデータベースに接続されていません。";
      case APIErrorCode.ValidationError:
        return `Notion データベースの構成が要件と一致していません。${error.message}`;
      case APIErrorCode.RateLimited:
        return "Notion API の利用制限に達しました。少し待ってから再試行してください。";
      case APIErrorCode.InternalServerError:
      case APIErrorCode.ServiceUnavailable:
      case APIErrorCode.GatewayTimeout:
        return "Notion 側で一時的な障害が発生しています。少し待ってから再試行してください。";
      default:
        return error.message;
    }
  }

  if (error.code === ClientErrorCode.RequestTimeout) {
    return "Notion API への接続がタイムアウトしました。ネットワーク状態を確認して再試行してください。";
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

  return (
    error.code === ClientErrorCode.RequestTimeout ||
    error.code === ClientErrorCode.ResponseError
  );
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
  const title = `Pomodoro ${new Date(session.startedAt).toLocaleString("ja-JP", { hour12: false })}`;
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
