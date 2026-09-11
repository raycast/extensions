import { createHash } from "crypto";
import { homedir } from "os";
import { resolve } from "path";

import { executeSQL } from "@raycast/utils";

import { dateToAppleNanoseconds } from "../message-pagination";

const DB_PATH = resolve(homedir(), "Library/Messages/chat.db");
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;
const CURSOR_VERSION = 1;
const SORT_DATE = "COALESCE(NULLIF(chat_message_join.message_date, 0), message.date)";

type Interval = "total" | "day" | "week" | "month" | "year";
type Breakdown = "overall" | "chat";
type RankBy = "total" | "sent" | "received";

export type MessageActivityInput = {
  from?: string;
  to?: string;
  interval?: Interval;
  chatGuids?: string[];
  chatType?: "direct" | "group";
  breakdown?: Breakdown;
  rankBy?: RankBy;
  limit?: number;
  cursor?: string;
};

type ActivityRow = {
  bucket: string;
  total: number;
  sent: number;
  received: number;
};

type ChatActivityRow = {
  chat_guid: string;
  chat_identifier: string;
  display_name: string | null;
  service_name: string;
  chat_type: "direct" | "group";
  participants: string | null;
  total: number;
  sent: number;
  received: number;
};

type ChatBucketRow = ActivityRow & {
  chat_guid: string;
};

type ActivityCursor = {
  version: number;
  offset: number;
  to: string;
  fingerprint: string;
};

function quoteSQL(value: string): string {
  return `'${value.replace(/'/g, "''")}'`;
}

function normalizeLimit(value?: number): number {
  if (value === undefined) return DEFAULT_LIMIT;
  if (!Number.isInteger(value) || value < 1 || value > MAX_LIMIT) {
    throw new Error(`limit must be an integer between 1 and ${MAX_LIMIT}.`);
  }
  return value;
}

function bucketExpression(interval: Interval): string {
  const localDate = `datetime(${SORT_DATE} / 1000000000 + strftime('%s', '2001-01-01'), 'unixepoch', 'localtime')`;
  switch (interval) {
    case "day":
      return `strftime('%Y-%m-%d', ${localDate})`;
    case "week":
      return `strftime('%Y-W%W', ${localDate})`;
    case "month":
      return `strftime('%Y-%m', ${localDate})`;
    case "year":
      return `strftime('%Y', ${localDate})`;
    case "total":
      return "'total'";
  }
}

function fingerprint(input: Omit<MessageActivityInput, "cursor" | "limit" | "to">, resolvedTo: string): string {
  return createHash("sha256")
    .update(
      JSON.stringify({
        from: input.from || null,
        to: resolvedTo,
        interval: input.interval ?? "total",
        chatGuids: [...(input.chatGuids ?? [])].sort(),
        chatType: input.chatType || null,
        breakdown: input.breakdown ?? "overall",
        rankBy: input.rankBy ?? "total",
      }),
    )
    .digest("base64url");
}

function decodeCursor(value: string): ActivityCursor {
  try {
    const parsed: unknown = JSON.parse(Buffer.from(value, "base64url").toString("utf8"));
    if (!parsed || typeof parsed !== "object") throw new Error();
    const cursor = parsed as Partial<ActivityCursor>;
    if (
      cursor.version !== CURSOR_VERSION ||
      !Number.isInteger(cursor.offset) ||
      Number(cursor.offset) < 0 ||
      typeof cursor.to !== "string" ||
      typeof cursor.fingerprint !== "string"
    ) {
      throw new Error();
    }
    return cursor as ActivityCursor;
  } catch {
    throw new Error("The activity cursor is invalid.");
  }
}

function encodeCursor(cursor: Omit<ActivityCursor, "version">): string {
  return Buffer.from(JSON.stringify({ ...cursor, version: CURSOR_VERSION })).toString("base64url");
}

export async function getMessageActivity(input: MessageActivityInput) {
  const interval = input.interval ?? "total";
  const breakdown = input.breakdown ?? "overall";
  const rankBy = input.rankBy ?? "total";
  const limit = normalizeLimit(input.limit);
  const decodedCursor = input.cursor ? decodeCursor(input.cursor) : undefined;

  if (input.cursor && breakdown !== "chat") throw new Error("cursor is only supported for chat breakdowns.");
  if (input.chatGuids && (input.chatGuids.length < 1 || input.chatGuids.length > 20)) {
    throw new Error("chatGuids must contain between 1 and 20 values.");
  }
  if (input.chatGuids?.some((value) => !value.trim())) throw new Error("chatGuids cannot contain empty values.");

  const resolvedTo = decodedCursor?.to ?? input.to ?? new Date().toISOString();
  const fromNanoseconds = input.from ? dateToAppleNanoseconds(input.from, "from") : undefined;
  const toNanoseconds = dateToAppleNanoseconds(resolvedTo, "to");
  if (fromNanoseconds && BigInt(fromNanoseconds) > BigInt(toNanoseconds)) {
    throw new Error("from must not be later than to.");
  }

  const expectedFingerprint = fingerprint(input, resolvedTo);
  if (decodedCursor && decodedCursor.fingerprint !== expectedFingerprint) {
    throw new Error("The activity cursor belongs to a different query.");
  }

  const filters = [
    `${SORT_DATE} < ${toNanoseconds}`,
    fromNanoseconds ? `${SORT_DATE} >= ${fromNanoseconds}` : "",
    input.chatGuids?.length ? `chat.guid IN (${input.chatGuids.map(quoteSQL).join(", ")})` : "",
    input.chatType === "group" ? "chat.style = 43" : input.chatType === "direct" ? "chat.style != 43" : "",
    `(message.associated_message_type IS NULL OR (
      message.associated_message_type != 1000
      AND message.associated_message_type NOT BETWEEN 2000 AND 2007
      AND message.associated_message_type NOT BETWEEN 3000 AND 3007
      AND message.associated_message_type != 4000
    ))`,
  ].filter(Boolean);
  const bucket = bucketExpression(interval);
  const base = `
    FROM message
    JOIN chat_message_join ON message.ROWID = chat_message_join.message_id
    JOIN chat ON chat_message_join.chat_id = chat.ROWID
    WHERE ${filters.join(" AND ")}
  `;

  if (breakdown === "overall") {
    const rows =
      (await executeSQL<ActivityRow>(
        DB_PATH,
        `SELECT
          ${bucket} AS bucket,
          COUNT(*) AS total,
          COALESCE(SUM(CASE WHEN message.is_from_me = 1 THEN 1 ELSE 0 END), 0) AS sent,
          COALESCE(SUM(CASE WHEN message.is_from_me = 0 THEN 1 ELSE 0 END), 0) AS received
        ${base}
        GROUP BY bucket
        ORDER BY bucket`,
      )) ?? [];

    return {
      breakdown,
      range: { from: input.from ?? null, to: resolvedTo },
      interval,
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      buckets: rows,
      totals: rows.reduce(
        (total, row) => ({
          total: total.total + Number(row.total),
          sent: total.sent + Number(row.sent),
          received: total.received + Number(row.received),
        }),
        { total: 0, sent: 0, received: 0 },
      ),
    };
  }

  const offset = decodedCursor?.offset ?? 0;
  const rankColumn = rankBy === "sent" ? "sent" : rankBy === "received" ? "received" : "total";
  const rows =
    (await executeSQL<ChatActivityRow>(
      DB_PATH,
      `SELECT
        chat.guid AS chat_guid,
        chat.chat_identifier,
        NULLIF(TRIM(chat.display_name), '') AS display_name,
        chat.service_name,
        CASE WHEN chat.style = 43 THEN 'group' ELSE 'direct' END AS chat_type,
        (
          SELECT GROUP_CONCAT(handle.id)
          FROM chat_handle_join
          JOIN handle ON chat_handle_join.handle_id = handle.ROWID
          WHERE chat_handle_join.chat_id = chat.ROWID
        ) AS participants,
        COUNT(*) AS total,
        COALESCE(SUM(CASE WHEN message.is_from_me = 1 THEN 1 ELSE 0 END), 0) AS sent,
        COALESCE(SUM(CASE WHEN message.is_from_me = 0 THEN 1 ELSE 0 END), 0) AS received
      ${base}
      GROUP BY chat.ROWID
      ORDER BY ${rankColumn} DESC, chat.ROWID DESC
      LIMIT ${limit + 1} OFFSET ${offset}`,
    )) ?? [];
  const hasMore = rows.length > limit;
  const selectedRows = rows.slice(0, limit);
  const selectedChatGuids = selectedRows.map((row) => row.chat_guid);
  const bucketRows = selectedChatGuids.length
    ? ((await executeSQL<ChatBucketRow>(
        DB_PATH,
        `SELECT
          chat.guid AS chat_guid,
          ${bucket} AS bucket,
          COUNT(*) AS total,
          COALESCE(SUM(CASE WHEN message.is_from_me = 1 THEN 1 ELSE 0 END), 0) AS sent,
          COALESCE(SUM(CASE WHEN message.is_from_me = 0 THEN 1 ELSE 0 END), 0) AS received
        ${base}
          AND chat.guid IN (${selectedChatGuids.map(quoteSQL).join(", ")})
        GROUP BY chat.ROWID, bucket
        ORDER BY chat.ROWID, bucket`,
      )) ?? [])
    : [];

  return {
    breakdown,
    range: { from: input.from ?? null, to: resolvedTo },
    interval,
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    chats: selectedRows.map((row) => ({
      chatGuid: row.chat_guid,
      chatIdentifier: row.chat_identifier,
      displayName: row.display_name || row.chat_identifier,
      service: row.service_name,
      type: row.chat_type,
      participants: row.participants?.split(",") ?? [],
      total: Number(row.total),
      sent: Number(row.sent),
      received: Number(row.received),
      countsByBucket: bucketRows
        .filter((bucketRow) => bucketRow.chat_guid === row.chat_guid)
        .map((bucketRow) => ({
          bucket: bucketRow.bucket,
          total: Number(bucketRow.total),
          sent: Number(bucketRow.sent),
          received: Number(bucketRow.received),
        })),
    })),
    ...(hasMore
      ? {
          nextCursor: encodeCursor({ offset: offset + limit, to: resolvedTo, fingerprint: expectedFingerprint }),
        }
      : {}),
  };
}
