import { promises as fs } from "fs";
import path from "path";
import JSZip from "jszip";
import protobuf from "protobufjs";

export const EventType = {
  DATE: 1,
  PLACEVISIT: 2,
  MOVEMENT: 3,
  SLEEP: 6,
} as const;

export interface GlanceEvent {
  id: string;
  type: number;
  start?: number;
  end?: number;
  date?: string;
  placeName?: string;
  asleepSecs?: number;
  distanceMeters?: number;
}

export interface GlanceNote {
  id: string;
  eventId: string;
  text: string;
  createdAt?: number;
}

interface GlanceState {
  events: Record<string, GlanceEvent>;
  notes: Record<string, GlanceNote>;
}

export interface DaySummary {
  date: string;
  sleep: string | null;
  first_place: string | null;
  last_place: string | null;
  distance: string | null;
  /** Day notes: timeline journal entries + pending note_*.json files. */
  notes: string[];
}

export interface GlancePaths {
  protoPath: string;
}

type Type = protobuf.Type;

const rootPromises = new Map<string, Promise<{ FullDirectory: Type }>>();

async function getTypes(protoPath: string): Promise<{ FullDirectory: Type }> {
  let promise = rootPromises.get(protoPath);
  if (!promise) {
    promise = (async () => {
      const root = await protobuf.load(protoPath);
      return { FullDirectory: root.lookupType("FullDirectory") };
    })();
    rootPromises.set(protoPath, promise);
  }
  return promise;
}

function tsoToUnix(
  tso:
    | {
        UTCTimestamp?: { seconds?: number | string; nanos?: number };
      }
    | null
    | undefined,
): number | undefined {
  if (!tso?.UTCTimestamp) return undefined;
  const seconds = Number(tso.UTCTimestamp.seconds ?? 0);
  const nanos = Number(tso.UTCTimestamp.nanos ?? 0);
  if (seconds === 0 && nanos === 0) return undefined;
  return seconds + nanos / 1e9;
}

function isDeleted(meta: {
  deletedAt?: { UTCTimestamp?: { seconds?: number | string; nanos?: number } };
}): boolean {
  const ts = meta.deletedAt?.UTCTimestamp;
  if (!ts) return false;
  return Number(ts.seconds ?? 0) !== 0 || Number(ts.nanos ?? 0) !== 0;
}

function placeName(pv: { name?: string; secondaryName?: string }): string {
  return pv.name || pv.secondaryName || "(unnamed)";
}

function movementDistance(movement: {
  moveActivities?: Array<{ distanceMeters?: number }>;
}): number {
  let total = 0;
  for (const a of movement.moveActivities ?? []) {
    if (a.distanceMeters) total += a.distanceMeters;
  }
  return total;
}

type MetaObj = {
  ID?: string;
  createdAt?: {
    UTCTimestamp?: { seconds?: number | string; nanos?: number };
  };
  deletedAt?: {
    UTCTimestamp?: { seconds?: number | string; nanos?: number };
  };
};

function toGlanceEvent(raw: Record<string, unknown>): GlanceEvent | null {
  const meta = raw.meta as MetaObj | undefined;
  const id = meta?.ID;
  if (!id) return null;

  if (isDeleted(meta)) {
    return { id, type: -1 };
  }

  const type = Number(raw.type ?? 0);
  const start = tsoToUnix(raw.startAt as never);
  const end = tsoToUnix(raw.endAt as never);
  const event: GlanceEvent = { id, type, start, end };

  if (type === EventType.DATE) {
    const dateEvent = raw.dateEvent as { date?: string } | undefined;
    event.date = dateEvent?.date;
  } else if (type === EventType.PLACEVISIT) {
    event.placeName = placeName((raw.placeVisit as never) ?? {});
  } else if (type === EventType.MOVEMENT) {
    const meters = movementDistance((raw.movement as never) ?? {});
    if (meters) event.distanceMeters = meters;
  } else if (type === EventType.SLEEP) {
    const sleep = raw.sleep as { asleepSecs?: number } | undefined;
    if (sleep?.asleepSecs) event.asleepSecs = sleep.asleepSecs;
  }

  return event;
}

function toGlanceNote(
  raw: Record<string, unknown>,
):
  { kind: "upsert"; note: GlanceNote } | { kind: "delete"; id: string } | null {
  const meta = raw.meta as MetaObj | undefined;
  const id = meta?.ID;
  if (!id) return null;

  if (isDeleted(meta)) {
    return { kind: "delete", id };
  }

  const eventId = String(raw.eventID ?? raw.eventId ?? "");
  const text = String(raw.text ?? "").trim();
  if (!eventId || !text) return null;

  return {
    kind: "upsert",
    note: {
      id,
      eventId,
      text,
      createdAt: tsoToUnix(meta?.createdAt as never),
    },
  };
}

function applyDirectory(
  events: Record<string, GlanceEvent>,
  notes: Record<string, GlanceNote>,
  directory: {
    events?: Array<Record<string, unknown>>;
    journalEntries?: Array<Record<string, unknown>>;
  },
): void {
  for (const raw of directory.events ?? []) {
    const glance = toGlanceEvent(raw);
    if (!glance) continue;
    if (glance.type === -1) {
      delete events[glance.id];
    } else {
      events[glance.id] = glance;
    }
  }

  for (const raw of directory.journalEntries ?? []) {
    const result = toGlanceNote(raw);
    if (!result) continue;
    if (result.kind === "delete") {
      delete notes[result.id];
    } else {
      notes[result.note.id] = result.note;
    }
  }
}

async function listDataFiles(icloudDir: string): Promise<string[]> {
  const entries = await fs.readdir(icloudDir);
  return entries
    .filter(
      (name) =>
        !name.startsWith("ip") &&
        (name.endsWith(".pb") || name.endsWith(".zip")),
    )
    .sort();
}

async function processPbBytes(
  FullDirectory: Type,
  events: Record<string, GlanceEvent>,
  notes: Record<string, GlanceNote>,
  bytes: Buffer,
): Promise<void> {
  const message = FullDirectory.decode(bytes);
  const obj = FullDirectory.toObject(message, {
    longs: Number,
    enums: Number,
    defaults: false,
  }) as {
    events?: Array<Record<string, unknown>>;
    journalEntries?: Array<Record<string, unknown>>;
  };
  applyDirectory(events, notes, obj);
}

async function processFile(
  FullDirectory: Type,
  events: Record<string, GlanceEvent>,
  notes: Record<string, GlanceNote>,
  filepath: string,
): Promise<void> {
  const raw = await fs.readFile(filepath);
  if (filepath.endsWith(".zip")) {
    const zip = await JSZip.loadAsync(raw);
    const names = Object.keys(zip.files)
      .filter((n) => n.endsWith(".pb") && !zip.files[n].dir)
      .sort();
    for (const name of names) {
      const file = zip.file(name);
      if (!file) continue;
      const buf = Buffer.from(await file.async("uint8array"));
      await processPbBytes(FullDirectory, events, notes, buf);
    }
  } else {
    await processPbBytes(FullDirectory, events, notes, raw);
  }
}

/** Fresh in-memory rebuild from all iCloud timeline update files (no disk cache). */
export async function loadGlanceState(
  icloudDir: string,
  paths: GlancePaths,
): Promise<GlanceState> {
  const { FullDirectory } = await getTypes(paths.protoPath);
  const events: Record<string, GlanceEvent> = {};
  const notes: Record<string, GlanceNote> = {};
  const files = await listDataFiles(icloudDir);

  for (const filename of files) {
    await processFile(
      FullDirectory,
      events,
      notes,
      path.join(icloudDir, filename),
    );
  }

  return { events, notes };
}

interface PendingNoteFile {
  text: string;
  timestampMs: number;
}

/** Notes written by Add Note (`note_<millis>.json`) that Time Atlas may not have imported yet. */
async function loadPendingJsonNotes(
  icloudDir: string,
  dateStr: string,
): Promise<PendingNoteFile[]> {
  let entries: string[];
  try {
    entries = await fs.readdir(icloudDir);
  } catch {
    return [];
  }

  const pending: PendingNoteFile[] = [];
  for (const name of entries) {
    if (!name.startsWith("note_") || !name.endsWith(".json")) continue;
    try {
      const raw = await fs.readFile(path.join(icloudDir, name), "utf-8");
      const record = JSON.parse(raw) as {
        text?: string;
        date?: string;
        timestamp?: string;
      };
      if (record.date !== dateStr) continue;
      const text = (record.text ?? "").trim();
      if (!text) continue;
      const fromName = Number(name.slice("note_".length, -".json".length));
      const fromTs = record.timestamp
        ? Date.parse(record.timestamp)
        : Number.NaN;
      pending.push({
        text,
        timestampMs: Number.isFinite(fromName)
          ? fromName
          : Number.isFinite(fromTs)
            ? fromTs
            : 0,
      });
    } catch {
      // skip malformed note files
    }
  }

  return pending.sort((a, b) => a.timestampMs - b.timestampMs);
}

function fmtHm(totalSecs: number): string {
  const h = Math.floor(totalSecs / 3600);
  const m = Math.floor((totalSecs % 3600) / 60);
  return `${h}h${String(m).padStart(2, "0")}m`;
}

function fmtDistance(meters: number): string {
  if (meters >= 1000) return `${(meters / 1000).toFixed(2)} km`;
  return `${Math.floor(meters)} m`;
}

function localDayBounds(dateStr: string): { start: number; end: number } {
  const [y, m, d] = dateStr.split("-").map(Number);
  const start = new Date(y, m - 1, d, 0, 0, 0, 0).getTime() / 1000;
  const end = new Date(y, m - 1, d, 23, 59, 59, 999).getTime() / 1000;
  return { start, end };
}

function overlaps(
  evStart: number | undefined,
  evEnd: number | undefined,
  from: number,
  to: number,
): boolean {
  if (evStart == null) return false;
  const end = evEnd ?? evStart;
  return evStart <= to && end >= from;
}

function normalizeNoteText(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

export function summarizeDay(
  state: GlanceState,
  dateStr: string,
  pendingJsonNotes: PendingNoteFile[] = [],
): DaySummary {
  const summary: DaySummary = {
    date: dateStr,
    sleep: null,
    first_place: null,
    last_place: null,
    distance: null,
    notes: [],
  };

  const all = Object.values(state.events);
  const dateEvent = all.find(
    (e) => e.type === EventType.DATE && e.date === dateStr,
  );

  let from: number;
  let to: number;
  if (dateEvent?.start != null) {
    from = dateEvent.start;
    to = dateEvent.end ?? dateEvent.start;
  } else {
    const bounds = localDayBounds(dateStr);
    from = bounds.start;
    to = bounds.end;
  }

  const places = all
    .filter(
      (e) =>
        e.type === EventType.PLACEVISIT && overlaps(e.start, e.end, from, to),
    )
    .sort((a, b) => (a.start ?? 0) - (b.start ?? 0));

  if (places.length) {
    summary.first_place = places[0].placeName ?? "(unnamed)";
    summary.last_place = places[places.length - 1].placeName ?? "(unnamed)";
  }

  let distance = 0;
  for (const e of all) {
    if (e.type !== EventType.MOVEMENT) continue;
    if (!overlaps(e.start, e.end, from, to)) continue;
    distance += e.distanceMeters ?? 0;
  }
  if (distance) summary.distance = fmtDistance(distance);

  let sleepSecs = 0;
  for (const e of all) {
    if (e.type !== EventType.SLEEP) continue;
    if (!overlaps(e.start, e.end, from, to)) continue;
    sleepSecs += e.asleepSecs ?? 0;
  }
  if (sleepSecs) summary.sleep = fmtHm(sleepSecs);

  const journalNotes = dateEvent
    ? Object.values(state.notes)
        .filter((n) => n.eventId === dateEvent.id && n.text)
        .sort((a, b) => (a.createdAt ?? 0) - (b.createdAt ?? 0))
        .map((n) => n.text)
    : [];

  const seen = new Set(journalNotes.map(normalizeNoteText));
  summary.notes = [...journalNotes];
  for (const pending of pendingJsonNotes) {
    const key = normalizeNoteText(pending.text);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    summary.notes.push(pending.text);
  }

  return summary;
}

export async function summarizeTodayFromIcloud(
  icloudDir: string,
  dateStr: string,
  paths: GlancePaths,
): Promise<DaySummary> {
  const [state, pendingJsonNotes] = await Promise.all([
    loadGlanceState(icloudDir, paths),
    loadPendingJsonNotes(icloudDir, dateStr),
  ]);
  return summarizeDay(state, dateStr, pendingJsonNotes);
}
