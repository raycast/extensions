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

/** Matches timeatlas.proto SleepType / glance.proto SleepType. */
export const SleepType = {
  ST_NOT_SPECIFIED: 0,
  IN_BED: 1,
  ASLEEP: 2,
  AWAKE: 3,
  CORE: 4,
  DEEP: 5,
  REM: 6,
} as const;

const SLEEP_TYPE_NAMES: Record<number, string> = {
  [SleepType.ST_NOT_SPECIFIED]: "Unknown",
  [SleepType.IN_BED]: "In bed",
  [SleepType.ASLEEP]: "Asleep",
  [SleepType.AWAKE]: "Awake",
  [SleepType.CORE]: "Core",
  [SleepType.DEEP]: "Deep",
  [SleepType.REM]: "REM",
};

/** Stages used for the overview sleep total (avoids double-counting IN_BED). */
const SLEEP_STAGE_TYPES = new Set<number>([
  SleepType.CORE,
  SleepType.DEEP,
  SleepType.REM,
]);

const ACTIVITY_NAMES: Record<string, string> = {
  wlk: "Walk",
  run: "Run",
  cyc: "Bicycle",
  stu: "Stairs Up",
  std: "Stairs Down",
  sta: "Stationary",
  bus: "Bus",
  car: "Car",
  mtc: "Motorcycle",
  ski: "Cross-country Ski",
  mtr: "Metro",
  sub: "Subway",
  trm: "Tram",
  trn: "Train",
  boa: "Boating",
  sct: "Scooting",
  trp: "Transport",
  non: "None",
  mcy: "Maybe Cycling",
  ndt: "Undetermined",
  air: "Airplane",
  dhs: "Downhill Skiing",
  sbd: "Snowboarding",
  rol: "Rollerskating",
  hoo: "Hoops",
  row: "Rowing",
  slb: "Sailing",
  pdl: "Paddling",
  aeb: "Assisted E-Bike",
  swm: "Swimming",
  pub: "Public Transport",
  hke: "Hike",
};

/** Modes counted toward the overview “active distance” figure. */
const ACTIVE_ACTIVITY_CODES = new Set([
  "wlk",
  "run",
  "cyc",
  "mcy",
  "aeb",
  "sct",
  "stu",
  "std",
  "ski",
  "dhs",
  "sbd",
  "rol",
  "hoo",
  "row",
  "slb",
  "pdl",
  "boa",
  "swm",
  "hke",
]);

export interface MoveActivityDetail {
  activity: string;
  activityName: string;
  distanceMeters: number;
  start?: number;
  durationSecs?: number;
  steps?: number;
  isActive: boolean;
}

export interface GlanceEvent {
  id: string;
  type: number;
  start?: number;
  end?: number;
  date?: string;
  placeName?: string;
  placeSecondaryName?: string;
  asleepSecs?: number;
  sleepType?: number;
  activities?: MoveActivityDetail[];
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

export interface PlaceVisitSummary {
  name: string;
  secondaryName?: string;
  start?: number;
  end?: number;
}

export interface SleepSegmentSummary {
  type: number;
  typeName: string;
  asleepSecs: number;
  start?: number;
  end?: number;
  /** Included in the overview sleep total (Core / Deep / REM). */
  countsTowardTotal: boolean;
}

export interface DistanceByActivity {
  activity: string;
  activityName: string;
  distanceMeters: number;
  steps: number;
  durationSecs: number;
  isActive: boolean;
  segments: MoveActivityDetail[];
}

export interface DaySummary {
  date: string;
  /** Overview: stage sleep only (Core+Deep+REM), formatted. */
  sleep: string | null;
  /** Overview: active-mode distance only, formatted. */
  distance: string | null;
  /** Overview / one-liner: visit path with consecutive dupes collapsed. */
  placesSummary: string | null;
  /** Day notes: timeline journal entries + pending note_*.json files. */
  notes: string[];

  places: PlaceVisitSummary[];
  sleepSegments: SleepSegmentSummary[];
  /** Stage totals for detail (Core / Deep / REM / …). */
  sleepByType: Array<{ typeName: string; asleepSecs: number }>;
  /** Per-mode rollup + individual segments for the Distance detail. */
  distanceByActivity: DistanceByActivity[];
  activeDistanceMeters: number;
  totalDistanceMeters: number;
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

function activityName(code: string): string {
  return ACTIVITY_NAMES[code] || code;
}

function isActiveActivity(code: string): boolean {
  return ACTIVE_ACTIVITY_CODES.has(code);
}

function parseActivities(movement: {
  moveActivities?: Array<{
    activity?: string;
    startAt?: {
      UTCTimestamp?: { seconds?: number | string; nanos?: number };
    };
    durationSecs?: number;
    distanceMeters?: number;
    steps?: number;
  }>;
}): MoveActivityDetail[] {
  const out: MoveActivityDetail[] = [];
  for (const a of movement.moveActivities ?? []) {
    const code = (a.activity ?? "").trim();
    if (!code) continue;
    const meters = Number(a.distanceMeters ?? 0);
    const steps = Number(a.steps ?? 0);
    const durationSecs = Number(a.durationSecs ?? 0);
    if (!meters && !steps && !durationSecs) continue;
    out.push({
      activity: code,
      activityName: activityName(code),
      distanceMeters: meters,
      start: tsoToUnix(a.startAt as never),
      durationSecs: durationSecs || undefined,
      steps: steps || undefined,
      isActive: isActiveActivity(code),
    });
  }
  return out;
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
    const pv =
      (raw.placeVisit as { name?: string; secondaryName?: string }) ?? {};
    event.placeName = placeName(pv);
    if (pv.secondaryName && pv.name) {
      event.placeSecondaryName = pv.secondaryName;
    }
  } else if (type === EventType.MOVEMENT) {
    const activities = parseActivities((raw.movement as never) ?? {});
    if (activities.length) event.activities = activities;
  } else if (type === EventType.SLEEP) {
    const sleep = raw.sleep as
      { asleepSecs?: number; type?: number } | undefined;
    if (sleep?.asleepSecs) event.asleepSecs = sleep.asleepSecs;
    if (sleep?.type != null) event.sleepType = Number(sleep.type);
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

export function fmtHm(totalSecs: number): string {
  const h = Math.floor(totalSecs / 3600);
  const m = Math.floor((totalSecs % 3600) / 60);
  return `${h}h${String(m).padStart(2, "0")}m`;
}

export function fmtDistance(meters: number): string {
  if (meters >= 1000) return `${(meters / 1000).toFixed(2)} km`;
  return `${Math.floor(meters)} m`;
}

export function fmtClock(unix?: number): string {
  if (unix == null) return "—";
  const d = new Date(unix * 1000);
  return d.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });
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

/** Collapse consecutive duplicate place names: Home, Work, Work, Home → Home → Work → Home */
export function placesPath(places: PlaceVisitSummary[]): string | null {
  if (!places.length) return null;
  const names: string[] = [];
  for (const p of places) {
    if (!names.length || names[names.length - 1] !== p.name) {
      names.push(p.name);
    }
  }
  return names.join(" → ");
}

export function summarizeDay(
  state: GlanceState,
  dateStr: string,
  pendingJsonNotes: PendingNoteFile[] = [],
): DaySummary {
  const summary: DaySummary = {
    date: dateStr,
    sleep: null,
    distance: null,
    placesSummary: null,
    notes: [],
    places: [],
    sleepSegments: [],
    sleepByType: [],
    distanceByActivity: [],
    activeDistanceMeters: 0,
    totalDistanceMeters: 0,
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

  const placeEvents = all
    .filter(
      (e) =>
        e.type === EventType.PLACEVISIT && overlaps(e.start, e.end, from, to),
    )
    .sort((a, b) => (a.start ?? 0) - (b.start ?? 0));

  summary.places = placeEvents.map((e) => ({
    name: e.placeName ?? "(unnamed)",
    secondaryName: e.placeSecondaryName,
    start: e.start,
    end: e.end,
  }));
  summary.placesSummary = placesPath(summary.places);

  const activityBuckets = new Map<string, DistanceByActivity>();
  for (const e of all) {
    if (e.type !== EventType.MOVEMENT) continue;
    if (!overlaps(e.start, e.end, from, to)) continue;
    for (const act of e.activities ?? []) {
      // Prefer activity start inside the day; fall back to parent movement overlap.
      if (act.start != null && (act.start < from || act.start > to)) continue;

      summary.totalDistanceMeters += act.distanceMeters;
      if (act.isActive) summary.activeDistanceMeters += act.distanceMeters;

      let bucket = activityBuckets.get(act.activity);
      if (!bucket) {
        bucket = {
          activity: act.activity,
          activityName: act.activityName,
          distanceMeters: 0,
          steps: 0,
          durationSecs: 0,
          isActive: act.isActive,
          segments: [],
        };
        activityBuckets.set(act.activity, bucket);
      }
      bucket.distanceMeters += act.distanceMeters;
      bucket.steps += act.steps ?? 0;
      bucket.durationSecs += act.durationSecs ?? 0;
      bucket.segments.push(act);
    }
  }

  summary.distanceByActivity = [...activityBuckets.values()].sort((a, b) => {
    if (a.isActive !== b.isActive) return a.isActive ? -1 : 1;
    return b.distanceMeters - a.distanceMeters;
  });
  for (const bucket of summary.distanceByActivity) {
    bucket.segments.sort((a, b) => (a.start ?? 0) - (b.start ?? 0));
  }
  if (summary.activeDistanceMeters) {
    summary.distance = fmtDistance(summary.activeDistanceMeters);
  }

  const sleepEvents = all
    .filter(
      (e) => e.type === EventType.SLEEP && overlaps(e.start, e.end, from, to),
    )
    .sort((a, b) => (a.start ?? 0) - (b.start ?? 0));

  const byTypeSecs = new Map<string, number>();
  let stageSecs = 0;
  for (const e of sleepEvents) {
    const type = e.sleepType ?? SleepType.ST_NOT_SPECIFIED;
    const typeName = SLEEP_TYPE_NAMES[type] ?? "Unknown";
    const secs = e.asleepSecs ?? 0;
    const countsTowardTotal = SLEEP_STAGE_TYPES.has(type);
    if (countsTowardTotal) stageSecs += secs;
    byTypeSecs.set(typeName, (byTypeSecs.get(typeName) ?? 0) + secs);
    summary.sleepSegments.push({
      type,
      typeName,
      asleepSecs: secs,
      start: e.start,
      end: e.end,
      countsTowardTotal,
    });
  }

  // If no typed stages exist (legacy / unknown), fall back to summing segments
  // that aren't IN_BED / ASLEEP parents — or all asleepSecs when type is missing.
  if (!stageSecs && sleepEvents.length) {
    const hasTypedStages = sleepEvents.some(
      (e) => e.sleepType != null && SLEEP_STAGE_TYPES.has(e.sleepType),
    );
    if (!hasTypedStages) {
      const hasParent = sleepEvents.some(
        (e) =>
          e.sleepType === SleepType.IN_BED || e.sleepType === SleepType.ASLEEP,
      );
      for (const e of sleepEvents) {
        const type = e.sleepType ?? SleepType.ST_NOT_SPECIFIED;
        if (
          hasParent &&
          (type === SleepType.IN_BED || type === SleepType.ASLEEP)
        ) {
          continue;
        }
        if (type === SleepType.AWAKE) continue;
        stageSecs += e.asleepSecs ?? 0;
      }
    }
  }

  if (stageSecs) summary.sleep = fmtHm(stageSecs);

  summary.sleepByType = [...byTypeSecs.entries()]
    .map(([typeName, asleepSecs]) => ({ typeName, asleepSecs }))
    .sort((a, b) => b.asleepSecs - a.asleepSecs);

  const journalNotes = dateEvent
    ? Object.values(state.notes)
        .filter((n) => n.eventId === dateEvent.id && n.text)
        .sort((a, b) => (a.createdAt ?? 0) - (b.createdAt ?? 0))
        .map((n) => n.text)
    : [];

  // Skip pending files whose text already appears in journal notes (already imported).
  // Do not mark pending texts as seen — identical pending files are distinct records.
  const journalTexts = new Set(journalNotes.map(normalizeNoteText));
  summary.notes = [...journalNotes];
  for (const pending of pendingJsonNotes) {
    const key = normalizeNoteText(pending.text);
    if (!key || journalTexts.has(key)) continue;
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
