import {
  dateKey,
  shiftDay,
  weekStart,
  isValidCard,
  isValidEntry,
  saveActivity,
  type Card,
  type Entry,
} from "daily-karte";
import { requestJSON, ServiceError } from "./http";
import type { Session } from "../types";

interface Document {
  name: string;
  fields: Record<string, Record<string, unknown>>;
  updateTime?: string;
}

interface Snapshot {
  record: Card | Entry;
  updateTime?: string;
}

export interface Versioned<T> {
  record: T;
  updateTime: string;
}

export interface RecordResult {
  entry: Entry;
  merged: boolean;
}

export interface RecordAttempt {
  result?: RecordResult;
}

function sameRecord(first: Card | Entry, second: Card | Entry) {
  return Object.keys(first).every((key) => first[key as keyof typeof first] === second[key as keyof typeof second]);
}

export function encodeFields(data: Card | Entry): Document["fields"] {
  return Object.fromEntries(
    Object.entries(data).map(([key, value]) => [
      key,
      value === null
        ? { nullValue: null }
        : typeof value === "string"
          ? { stringValue: value }
          : typeof value === "boolean"
            ? { booleanValue: value }
            : { integerValue: String(value) },
    ]),
  );
}

export function decodeDocument(document: Document, prefix: string, collection: "cards" | "entries"): Card | Entry {
  if (
    !document ||
    typeof document.name !== "string" ||
    !document.name.startsWith(`${prefix}/${collection}/`) ||
    !document.fields ||
    typeof document.fields !== "object" ||
    Array.isArray(document.fields)
  ) {
    throw new Error("A cloud record has an invalid path or format.");
  }
  const id = document.name.slice(`${prefix}/${collection}/`.length);
  const data = Object.fromEntries(
    Object.entries(document.fields).map(([key, field]) => {
      if (!field || typeof field !== "object" || Object.keys(field).length !== 1)
        throw new Error("A cloud field has an invalid format.");
      if (typeof field.stringValue === "string") return [key, field.stringValue];
      if (typeof field.booleanValue === "boolean") return [key, field.booleanValue];
      if (Object.hasOwn(field, "nullValue") && field.nullValue === null) return [key, null];
      if (
        typeof field.integerValue === "string" &&
        /^-?\d+$/.test(field.integerValue) &&
        Number.isSafeInteger(Number(field.integerValue))
      )
        return [key, Number(field.integerValue)];
      throw new Error("A cloud field has an unsupported value.");
    }),
  );
  if (data.id !== id || !(collection === "cards" ? isValidCard(data) : isValidEntry(data))) {
    throw new Error("A cloud record failed Daily Karte validation.");
  }
  return data as unknown as Card | Entry;
}

export class FirestoreClient {
  private readonly database: string;
  private readonly documents: string;
  private readonly user: string;

  constructor(
    private readonly session: Session,
    private readonly request = requestJSON,
  ) {
    if (!/^[a-z][a-z0-9-]{4,28}[a-z0-9]$/.test(session.config.projectId) || !session.uid || /[/.]/.test(session.uid)) {
      throw new Error("The account path is invalid.");
    }
    this.database = `https://firestore.googleapis.com/v1/projects/${session.config.projectId}/databases/(default)`;
    this.documents = `${this.database}/documents`;
    this.user = `projects/${session.config.projectId}/databases/(default)/documents/users/${session.uid}`;
  }

  private call<T>(url: string, body: unknown): Promise<T> {
    return this.request<T>(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.session.idToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
  }

  private async query(collection: "cards" | "entries", where?: unknown): Promise<Snapshot[]> {
    const rows = await this.call<{ document?: Document; error?: { status: string } }[]>(
      `${this.documents}/users/${encodeURIComponent(this.session.uid)}:runQuery`,
      {
        structuredQuery: {
          from: [{ collectionId: collection }],
          ...(where ? { where } : {}),
        },
      },
    );
    if (!Array.isArray(rows)) throw new Error("The cloud returned an invalid record list.");
    const records = rows.flatMap((row) => {
      if (row.error) throw new ServiceError(row.error.status);
      return row.document
        ? [
            {
              record: decodeDocument(row.document, this.user, collection),
              updateTime: row.document.updateTime,
            },
          ]
        : [];
    });
    if (new Set(records.map((snapshot) => snapshot.record.id)).size !== records.length)
      throw new Error("The cloud returned duplicate records.");
    return records;
  }

  async cards(): Promise<Card[]> {
    return ((await this.query("cards")).map((snapshot) => snapshot.record) as Card[]).sort((a, b) =>
      a.name.localeCompare(b.name),
    );
  }

  private async snapshot<T extends Card | Entry>(collection: "cards" | "entries", id: string): Promise<Versioned<T>> {
    if (!/^[A-Za-z0-9_-]{1,128}$/.test(id) || /^__.*__$/.test(id)) throw new Error("The record identifier is invalid.");
    const name = `${this.user}/${collection}/${id}`;
    const rows = await this.call<{ found?: Document; missing?: string }[]>(`${this.documents}:batchGet`, {
      documents: [name],
    });
    if (!Array.isArray(rows)) throw new Error("The cloud returned an invalid record response.");
    const document = rows.find((row) => row.found?.name === name)?.found;
    if (!document) throw new Error("This record was removed. Refresh the list before editing.");
    if (typeof document.updateTime !== "string" || !document.updateTime)
      throw new Error("This record is missing its version. Please refresh.");
    return {
      record: decodeDocument(document, this.user, collection) as T,
      updateTime: document.updateTime,
    };
  }

  cardSnapshot(id: string) {
    return this.snapshot<Card>("cards", id);
  }
  entrySnapshot(id: string) {
    return this.snapshot<Entry>("entries", id);
  }

  async saveCard(card: Card, previous?: Versioned<Card>): Promise<void> {
    if (
      !isValidCard(card) ||
      (previous && (!isValidCard(previous.record) || previous.record.id !== card.id || !previous.updateTime))
    )
      throw new Error("The activity card is invalid.");
    try {
      await this.call(`${this.documents}:commit`, {
        writes: [
          {
            update: {
              name: `${this.user}/cards/${card.id}`,
              fields: encodeFields(card),
            },
            currentDocument: previous ? { updateTime: previous.updateTime } : { exists: false },
          },
        ],
      });
    } catch (error) {
      if (error instanceof ServiceError && ["ALREADY_EXISTS", "FAILED_PRECONDITION"].includes(error.code)) {
        const latest = await this.cardSnapshot(card.id);
        if (sameRecord(latest.record, card)) return;
        throw new Error("This activity card changed on another device. Reopen its editor before saving.");
      }
      throw error;
    }
  }

  async day(day: string): Promise<Entry[]> {
    return (await this.daySnapshots(day)).map((snapshot) => snapshot.record as Entry);
  }

  private async daySnapshots(day: string): Promise<Snapshot[]> {
    const start = new Date(`${shiftDay(day, 0)}T00:00:00`).getTime();
    const end = new Date(`${shiftDay(day, 1)}T00:00:00`).getTime();
    return this.rangeSnapshots(start, end);
  }

  async week(day: string): Promise<Entry[]> {
    const first = weekStart(day);
    const start = new Date(`${first}T00:00:00`).getTime();
    const end = new Date(`${shiftDay(first, 7)}T00:00:00`).getTime();
    // A record can end up to 24 hours after its last visible block in the week.
    return (await this.rangeSnapshots(start, end + 1440 * 60000)).map((snapshot) => snapshot.record as Entry);
  }

  private async rangeSnapshots(start: number, end: number): Promise<Snapshot[]> {
    return await this.query("entries", {
      compositeFilter: {
        op: "AND",
        filters: [
          {
            fieldFilter: {
              field: { fieldPath: "end" },
              op: "GREATER_THAN_OR_EQUAL",
              value: { integerValue: String(start) },
            },
          },
          {
            fieldFilter: {
              field: { fieldPath: "end" },
              op: "LESS_THAN",
              value: { integerValue: String(end) },
            },
          },
        ],
      },
    });
  }

  private async confirmEdit(previous: Versioned<Entry>, attempt: RecordAttempt): Promise<RecordResult | undefined> {
    const latest = await this.entrySnapshot(previous.record.id);
    if (attempt.result && sameRecord(latest.record, attempt.result.entry))
      return { entry: latest.record, merged: attempt.result.merged };
    if (latest.updateTime !== previous.updateTime)
      throw new Error("This activity changed on another device. Reopen its editor before saving.");
  }

  async record(incoming: Entry, previous?: Versioned<Entry>, attempt: RecordAttempt = {}): Promise<RecordResult> {
    if (!isValidEntry(incoming)) throw new Error("The activity is invalid and was not saved.");
    if (previous && (previous.record.id !== incoming.id || !isValidEntry(previous.record) || !previous.updateTime))
      throw new Error("The original activity is invalid. Reopen its editor.");
    if (previous && attempt.result) {
      const confirmed = await this.confirmEdit(previous, attempt);
      if (confirmed) return confirmed;
    }
    for (let retry = 0; retry < 3; retry++) {
      try {
        const snapshots = await this.daySnapshots(dateKey(incoming.end));
        const entries = snapshots
          .map((snapshot) => snapshot.record as Entry)
          .filter((entry) => !previous || entry.id !== incoming.id);
        if (previous) entries.push(previous.record);
        const existing = entries.find((entry) => entry.id === incoming.id);
        if (existing && !previous) {
          if (existing.createdAt !== incoming.createdAt || existing.cardId !== incoming.cardId) {
            throw new Error("This activity identifier is already in use.");
          }
          return {
            entry: existing,
            merged: attempt.result && sameRecord(existing, attempt.result.entry) ? attempt.result.merged : false,
          };
        }
        const change = saveActivity(entries, incoming);
        if (change.before.length >= 400)
          throw new Error("This save would merge too many records. Please review them in the Web app.");
        const versions = new Map(snapshots.map((snapshot) => [snapshot.record.id, snapshot.updateTime]));
        const writes = [
          {
            update: {
              name: `${this.user}/entries/${incoming.id}`,
              fields: encodeFields(change.entry),
            },
            currentDocument: previous ? { updateTime: previous.updateTime } : { exists: false },
          },
          ...change.before
            .filter((entry) => entry.id !== incoming.id)
            .map((entry) => {
              const updateTime = versions.get(entry.id);
              if (typeof updateTime !== "string" || !updateTime)
                throw new Error("A cloud record is missing its version. Please refresh and try again.");
              return {
                delete: `${this.user}/entries/${entry.id}`,
                currentDocument: { updateTime },
              };
            }),
        ];
        attempt.result = { entry: change.entry, merged: change.merged };
        // Firebase user tokens support conditional commits, but not REST read-write transactions.
        await this.call(`${this.documents}:commit`, { writes });
        return attempt.result;
      } catch (error) {
        if (
          previous &&
          error instanceof ServiceError &&
          ["ABORTED", "FAILED_PRECONDITION", "ALREADY_EXISTS"].includes(error.code)
        ) {
          const confirmed = await this.confirmEdit(previous, attempt);
          if (confirmed) return confirmed;
          attempt.result = undefined;
        }
        if (
          !(error instanceof ServiceError) ||
          !["ABORTED", "FAILED_PRECONDITION", "ALREADY_EXISTS"].includes(error.code) ||
          retry === 2
        )
          throw error;
      }
    }
    throw new Error("The activity could not be saved. Please try again.");
  }
}
