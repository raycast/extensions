import { homedir } from "os";
import { resolve } from "path";

import { executeSQL } from "@raycast/utils";

import { buildMessagesQuery } from "../helpers";
import {
  dateToAppleNanoseconds,
  decodeMessageCursor,
  encodeMessageCursor,
  fingerprintMessageQuery,
  type MessageCursorKey,
  type MessageQueryScope,
} from "../message-pagination";
import type { Message, SQLMessage } from "../types";

import { deduplicateReplyContext, hydrateMessages, messageMatchesSearch } from "./get-messages";

const DB_PATH = resolve(homedir(), "Library/Messages/chat.db");
const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;
const SEARCH_SCAN_SIZE = 250;
const MAX_SEARCH_SCAN = 5_000;
const SORT_DATE = "COALESCE(NULLIF(chat_message_join.message_date, 0), message.date)";

type MaxRow = { max_row_id: number | string | null };

export type MessagePageInput = {
  searchText?: string;
  chatGuid?: string;
  chatIdentifier?: string;
  cursor?: string;
  from?: string;
  to?: string;
  unreadOnly?: boolean;
  limit?: number;
};

export type MessagePage = {
  messages: Message[];
  nextCursor?: string;
  scannedMessageCount: number;
};

function quoteSQL(value: string): string {
  return `'${value.replace(/'/g, "''")}'`;
}

function normalizedOptional(value?: string): string | undefined {
  const trimmed = value?.trim();
  return trimmed || undefined;
}

function normalizeLimit(value?: number): number {
  if (value === undefined) return DEFAULT_LIMIT;
  if (!Number.isInteger(value) || value < 1 || value > MAX_LIMIT) {
    throw new Error(`limit must be an integer between 1 and ${MAX_LIMIT}.`);
  }
  return value;
}

function cursorClause(key?: MessageCursorKey): string {
  if (!key) return "";
  return `AND (
    ${SORT_DATE} < ${key.dateNanoseconds}
    OR (
      ${SORT_DATE} = ${key.dateNanoseconds}
      AND (
        message.ROWID < ${key.rowID}
        OR (message.ROWID = ${key.rowID} AND chat.ROWID < ${key.chatRowID})
      )
    )
  )`;
}

function keyFor(row: SQLMessage): MessageCursorKey {
  return {
    dateNanoseconds: row.date_nanoseconds,
    rowID: Number(row.row_id),
    chatRowID: Number(row.chat_row_id),
  };
}

async function currentMaxRowID(): Promise<number> {
  const rows = await executeSQL<MaxRow>(DB_PATH, "SELECT COALESCE(MAX(ROWID), 0) AS max_row_id FROM message");
  const value = Number(rows?.[0]?.max_row_id ?? 0);
  if (!Number.isSafeInteger(value) || value < 0) throw new Error("Could not establish a message snapshot.");
  return value;
}

export async function getMessagePage(input: MessagePageInput): Promise<MessagePage> {
  const limit = normalizeLimit(input.limit);
  const chatGuid = normalizedOptional(input.chatGuid);
  const chatIdentifier = normalizedOptional(input.chatIdentifier);
  const searchText = normalizedOptional(input.searchText);
  const from = normalizedOptional(input.from);
  const to = normalizedOptional(input.to);
  const unreadOnly = input.unreadOnly ?? false;

  if (chatGuid && chatIdentifier) throw new Error("Provide chatGuid or chatIdentifier, not both.");

  const fromNanoseconds = from ? dateToAppleNanoseconds(from, "from") : undefined;
  const toNanoseconds = to ? dateToAppleNanoseconds(to, "to") : undefined;
  if (fromNanoseconds && toNanoseconds && BigInt(fromNanoseconds) > BigInt(toNanoseconds)) {
    throw new Error("from must not be later than to.");
  }

  const scope: MessageQueryScope = { chatGuid, chatIdentifier, from, to, unreadOnly, searchText };
  const fingerprint = fingerprintMessageQuery(scope);
  const decodedCursor = input.cursor ? decodeMessageCursor(input.cursor, fingerprint) : undefined;
  const snapshotRowID = decodedCursor?.snapshotRowID ?? (await currentMaxRowID());
  let position = decodedCursor?.key;
  let scannedMessageCount = 0;
  const matches: Message[] = [];
  let nextKey: MessageCursorKey | undefined;
  let hasMore = false;

  while (scannedMessageCount < MAX_SEARCH_SCAN) {
    const queryLimit = searchText ? Math.min(SEARCH_SCAN_SIZE, MAX_SEARCH_SCAN - scannedMessageCount) : limit + 1;
    const rawRows =
      (await executeSQL<SQLMessage>(
        DB_PATH,
        buildMessagesQuery({
          chatGuidClause: chatGuid ? `AND chat.guid = ${quoteSQL(chatGuid)}` : "",
          chatIdentifierClause: chatIdentifier ? `AND chat.chat_identifier = ${quoteSQL(chatIdentifier)}` : "",
          filterClause: unreadOnly ? "AND message.is_read = 0 AND message.is_from_me = 0" : "",
          fromClause: fromNanoseconds ? `AND ${SORT_DATE} >= ${fromNanoseconds}` : "",
          toClause: toNanoseconds ? `AND ${SORT_DATE} < ${toNanoseconds}` : "",
          cursorClause: cursorClause(position),
          snapshotClause: `AND message.ROWID <= ${snapshotRowID}`,
          limit: String(queryLimit),
        }),
      )) ?? [];

    if (!searchText) {
      const selectedRows = rawRows.slice(0, limit);
      const selectedMessages = await hydrateMessages(selectedRows);
      matches.push(...selectedMessages);
      scannedMessageCount += selectedRows.length;
      hasMore = rawRows.length > limit;
      nextKey = hasMore && selectedRows.length ? keyFor(selectedRows[selectedRows.length - 1]) : undefined;
      break;
    }

    if (!rawRows.length) break;
    const hydrated = await hydrateMessages(rawRows);

    for (let index = 0; index < hydrated.length; index++) {
      scannedMessageCount += 1;
      position = keyFor(rawRows[index]);
      if (messageMatchesSearch(hydrated[index], searchText)) matches.push(hydrated[index]);

      if (matches.length === limit) {
        nextKey = position;
        hasMore = index < hydrated.length - 1 || rawRows.length === queryLimit;
        break;
      }
    }

    if (matches.length === limit) break;
    // A full batch advances the internal scan position, but it does not prove that another page exists.
    // Only expose that position when the result limit or bounded scan cap requires a continuation cursor.
    if (rawRows.length < queryLimit) break;
  }

  if (searchText && scannedMessageCount >= MAX_SEARCH_SCAN && position) {
    nextKey = position;
    hasMore = true;
  }

  const messages = deduplicateReplyContext([...matches].reverse());
  return {
    messages,
    scannedMessageCount,
    ...(hasMore && nextKey
      ? {
          nextCursor: encodeMessageCursor({ key: nextKey, snapshotRowID, fingerprint }),
        }
      : {}),
  };
}
