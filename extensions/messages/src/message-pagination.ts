import { createHash } from "crypto";

const CURSOR_VERSION = 1;
const CURSOR_TYPE = "message-page";

export type MessageCursorKey = {
  dateNanoseconds: string;
  rowID: number;
  chatRowID: number;
};

export type MessageCursor = {
  version: number;
  type: string;
  key: MessageCursorKey;
  snapshotRowID: number;
  fingerprint: string;
};

export type MessageQueryScope = {
  chatGuid?: string;
  chatIdentifier?: string;
  from?: string;
  to?: string;
  unreadOnly: boolean;
  searchText?: string;
};

export function fingerprintMessageQuery(scope: MessageQueryScope): string {
  return createHash("sha256")
    .update(
      JSON.stringify({
        chatGuid: scope.chatGuid || null,
        chatIdentifier: scope.chatIdentifier || null,
        from: scope.from || null,
        to: scope.to || null,
        unreadOnly: scope.unreadOnly,
        searchText: scope.searchText?.trim().toLowerCase() || null,
      }),
    )
    .digest("base64url");
}

export function encodeMessageCursor(cursor: Omit<MessageCursor, "version" | "type">): string {
  return Buffer.from(JSON.stringify({ ...cursor, version: CURSOR_VERSION, type: CURSOR_TYPE })).toString("base64url");
}

export function decodeMessageCursor(value: string, expectedFingerprint: string): MessageCursor {
  try {
    const parsed: unknown = JSON.parse(Buffer.from(value, "base64url").toString("utf8"));
    if (!parsed || typeof parsed !== "object") throw new Error();

    const cursor = parsed as Partial<MessageCursor>;
    const key = cursor.key;
    if (
      cursor.version !== CURSOR_VERSION ||
      cursor.type !== CURSOR_TYPE ||
      cursor.fingerprint !== expectedFingerprint ||
      !Number.isInteger(cursor.snapshotRowID) ||
      Number(cursor.snapshotRowID) < 0 ||
      !key ||
      !/^-?\d+$/.test(key.dateNanoseconds) ||
      !Number.isInteger(key.rowID) ||
      key.rowID < 0 ||
      !Number.isInteger(key.chatRowID) ||
      key.chatRowID < 0
    ) {
      throw new Error();
    }
    return cursor as MessageCursor;
  } catch {
    throw new Error("The pagination cursor is invalid or belongs to a different message search.");
  }
}

export function dateToAppleNanoseconds(value: string, fieldName: string): string {
  const milliseconds = Date.parse(value);
  if (!Number.isFinite(milliseconds)) {
    throw new Error(`${fieldName} must be an ISO 8601 date-time.`);
  }

  return ((BigInt(milliseconds) - 978_307_200_000n) * 1_000_000n).toString();
}
