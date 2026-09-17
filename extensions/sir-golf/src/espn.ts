/**
 * ESPN unofficial golf API — shared data layer.
 *
 * Grounded in the Phase 0 spike (see VALIDATION.md). Two hosts are used:
 *  - site.api.espn.com  → cheap scoreboard (leaderboard + season calendar).
 *  - sports.core.api.espn.com (CORE) → event detail (venue/course/purse/etc.),
 *    season leaders (scoring average, FedEx Cup, …) and athlete bios. The core
 *    API is HATEOAS: many fields are `{ $ref }` links we resolve on demand.
 *
 * Everything is keyless and backend-free, NO AI calls. The API is UNOFFICIAL —
 * every field is treated as optional and the UI fails soft.
 *
 * Known gaps (confirmed in the spike): no per-tournament logos (we use the
 * league/tour logo), and no tee/qualifying times (the golf `summary` endpoint
 * 502s). Player country flags + headshots exist.
 */

export const ESPN_BASE = "https://site.api.espn.com/apis/site/v2/sports/golf";
export const CORE_BASE =
  "https://sports.core.api.espn.com/v2/sports/golf/leagues";

export type TourId = "pga" | "lpga" | "eur";

export const TOURS: { id: TourId; title: string }[] = [
  { id: "pga", title: "PGA Tour" },
  { id: "lpga", title: "LPGA" },
  { id: "eur", title: "DP World Tour" },
];

export function tourTitle(id: string): string {
  return TOURS.find((t) => t.id === id)?.title ?? id.toUpperCase();
}

export function nextTour(current: TourId): TourId {
  const i = TOURS.findIndex((t) => t.id === current);
  return TOURS[(i + 1) % TOURS.length].id;
}

/** Tour selection that also allows a combined "all tours" view. */
export type TourSel = TourId | "all";
const TOUR_CYCLE: TourSel[] = ["all", "pga", "lpga", "eur"];
export function nextTourSel(current: TourSel): TourSel {
  const i = TOUR_CYCLE.indexOf(current);
  return TOUR_CYCLE[(i + 1) % TOUR_CYCLE.length];
}
export function tourSelTitle(sel: TourSel): string {
  return sel === "all" ? "All Tours" : tourTitle(sel);
}

export function scoreboardUrl(tour: TourId): string {
  return `${ESPN_BASE}/${tour}/scoreboard`;
}

/** Years available for the season browser (current down to 8 back). */
export function seasonYears(now: Date = new Date()): number[] {
  const y = now.getFullYear();
  return Array.from({ length: 9 }, (_, i) => y - i);
}

/**
 * The authoritative *current* season year, read from ESPN's scoreboard
 * (`leagues[0].season.year`) rather than the system clock — this is correct
 * even early in / before a season and for any wraparound seasons. Cached per
 * tour for the life of the command process. Falls back to the clock on error.
 */
const _seasonYearCache: Partial<Record<TourId, number>> = {};
export async function currentSeasonYear(tour: TourId): Promise<number> {
  const cached = _seasonYearCache[tour];
  if (cached) return cached;
  try {
    const sb = await fetchJson<RawScoreboard>(scoreboardUrl(tour));
    const y = sb.leagues?.[0]?.season?.year;
    const year = typeof y === "number" ? y : new Date().getFullYear();
    _seasonYearCache[tour] = year;
    return year;
  } catch {
    return new Date().getFullYear();
  }
}

// ---- Generic fetch ---------------------------------------------------------

async function fetchJson<T>(url: string): Promise<T> {
  // Core API refs come back as http://; normalise to https.
  const res = await fetch(url.replace(/^http:\/\//, "https://"));
  if (!res.ok) throw new Error(`ESPN responded ${res.status}`);
  return (await res.json()) as T;
}

// ---- Raw ESPN shapes (only the parts we read; all optional) ----------------

interface RawFlag {
  href?: string;
  alt?: string;
}
interface RawAthlete {
  id?: string;
  fullName?: string;
  displayName?: string;
  shortName?: string;
  flag?: RawFlag;
}
interface RawLinescore {
  displayValue?: string;
  value?: number;
  period?: number;
}
interface RawCompetitor {
  id?: string; // athlete id
  order?: number;
  winner?: boolean;
  athlete?: RawAthlete;
  score?: string;
  linescores?: RawLinescore[];
  status?: {
    thru?: number | string;
    displayValue?: string;
    position?: { displayName?: string };
  };
}
interface RawStatusType {
  state?: "pre" | "in" | "post";
  detail?: string;
  shortDetail?: string;
  description?: string;
  completed?: boolean;
}
interface RawLink {
  text?: string;
  href?: string;
}
interface RawEvent {
  id?: string;
  name?: string;
  shortName?: string;
  date?: string;
  endDate?: string;
  links?: RawLink[];
  status?: { type?: RawStatusType };
  competitions?: {
    status?: { type?: RawStatusType };
    competitors?: RawCompetitor[];
    broadcasts?: { names?: string[]; market?: string }[];
  }[];
}
interface RawCalendarEntry {
  id?: string;
  label?: string;
  startDate?: string;
  endDate?: string;
}
interface RawLogo {
  href?: string;
}
interface RawLeague {
  name?: string;
  logos?: RawLogo[];
  season?: { year?: number };
  calendar?: RawCalendarEntry[];
}
export interface RawScoreboard {
  leagues?: RawLeague[];
  events?: RawEvent[];
}

// ---- Normalised shapes the UI renders -------------------------------------

export type EventState = "pre" | "in" | "post" | "unknown";

export interface PlayerRow {
  athleteId?: string;
  position: string;
  player: string;
  flag?: string;
  total: string;
  thru: string;
  rounds: string[];
}

export interface Leaderboard {
  hasEvent: boolean;
  eventId?: string;
  eventName?: string;
  state: EventState;
  statusDetail?: string;
  startDate?: string;
  isMostRecent?: boolean; // true when we fell back to the last completed event
  isLive?: boolean;
  isMajor?: boolean;
  majorLabel?: string;
  espnUrl?: string;
  leagueLogo?: string;
  players: PlayerRow[];
}

export interface ScheduleEntry {
  id?: string;
  name: string;
  startDate?: string;
  endDate?: string;
  state: "current" | "upcoming" | "past";
  winner?: string;
  winnerScore?: string;
  tour?: TourId;
  isMajor?: boolean;
  majorLabel?: string;
}

export interface Season {
  entries: ScheduleEntry[];
  leagueLogo?: string;
  logos: Partial<Record<TourId, string>>;
}

export interface EventDetail {
  name: string;
  startDate?: string;
  endDate?: string;
  venue?: string;
  location?: string;
  purse?: string;
  isSignature?: boolean;
  isMajor?: boolean;
  majorLabel?: string;
  defendingChampion?: string;
  weather?: string;
  broadcast?: string;
  winner?: string;
  winnerScore?: string;
  espnUrl?: string;
}

export interface LeaderRow {
  rank: number;
  name: string;
  value: string;
  athleteId?: string;
}
export interface SeasonLeaders {
  title: string;
  rows: LeaderRow[];
}

export interface AthleteDetail {
  name: string;
  headshot?: string;
  flag?: string;
  age?: number;
  birthPlace?: string;
  turnedPro?: number;
  height?: string;
  weight?: string;
  hand?: string;
  college?: string;
  stats: { label: string; value: string }[];
}

/** The unified "view" dropdown in the Leaderboard command. */
export const LEADERBOARD_VIEWS: { id: string; title: string }[] = [
  { id: "tournament", title: "This Tournament" },
  { id: "scoringAverage", title: "Scoring Average" },
  { id: "cupPoints", title: "FedEx Cup Points" },
  { id: "officialAmount", title: "Money List" },
  { id: "wins", title: "Wins" },
  { id: "topTenFinishes", title: "Top 10 Finishes" },
  { id: "yardsPerDrive", title: "Driving Distance" },
  { id: "driveAccuracyPct", title: "Driving Accuracy" },
  { id: "greensInRegPct", title: "Greens in Regulation" },
  { id: "birdiesPerRound", title: "Birdies per Round" },
  { id: "cutsMade", title: "Cuts Made" },
];

/**
 * "Where to watch" guide per tour — a LOCAL, hand-maintained reference, NOT from
 * the API (ESPN only carries US broadcast data). Rights change by season and
 * region, so treat this as a general guide and edit it here as needed.
 */
export interface WatchOption {
  region: string;
  networks: string;
}
export const WATCH_GUIDE: Record<TourId, WatchOption[]> = {
  pga: [
    { region: "US", networks: "CBS · NBC · Golf Channel · ESPN+ · Peacock" },
    { region: "UK & Ireland", networks: "Sky Sports Golf" },
    { region: "Germany", networks: "Sky Deutschland · WOW" },
    {
      region: "Austria",
      networks: "Sky Sport Austria · ServusTV (select events)",
    },
    { region: "France", networks: "Canal+" },
    {
      region: "International",
      networks: "PGA Tour app / local rights holders",
    },
  ],
  eur: [
    { region: "UK & Ireland", networks: "Sky Sports Golf" },
    { region: "Germany", networks: "Sky Deutschland · WOW" },
    {
      region: "Austria",
      networks: "Sky Sport Austria · ServusTV · ORF Sport+ (select events)",
    },
    { region: "France", networks: "Canal+" },
    { region: "US", networks: "Golf Channel" },
    {
      region: "International",
      networks: "DP World Tour app / local rights holders",
    },
  ],
  lpga: [
    { region: "US", networks: "Golf Channel · NBC" },
    { region: "UK & Ireland", networks: "Sky Sports Golf" },
    { region: "Austria", networks: "Sky Sport Austria (select events)" },
    { region: "International", networks: "LPGA app / local rights holders" },
  ],
};

/**
 * Major championships, detected by name (ESPN's golf feed carries no "major"
 * flag). Scoped by tour so flagship-but-not-major events don't false-positive
 * (e.g. DP World Tour's "BMW PGA Championship" is NOT a major). Returns a short
 * display label, or undefined.
 */
export function majorLabelOf(
  name: string | undefined,
  tour: TourId,
): string | undefined {
  if (!name) return undefined;
  const n = name.trim().toLowerCase();
  if (tour === "pga") {
    if (/\bmasters\b/.test(n)) return "The Masters";
    if (/^pga championship$/.test(n)) return "PGA Championship";
    if (/u\.?s\.?\s*open/.test(n) && !/women/.test(n)) return "U.S. Open";
    if (/^the open( championship)?$/.test(n)) return "The Open";
  }
  if (tour === "lpga") {
    if (/chevron championship/.test(n)) return "Chevron Championship";
    if (/u\.?s\.?\s*women'?s open/.test(n)) return "U.S. Women's Open";
    if (/women'?s pga championship/.test(n)) return "Women's PGA Championship";
    if (/evian championship/.test(n)) return "Evian Championship";
    if (/aig women'?s open|women'?s british open/.test(n))
      return "AIG Women's Open";
  }
  return undefined;
}

/**
 * Build a minimal, RFC-5545 all-day VEVENT for a tournament so the UI can write
 * a `.ics` and hand it to the OS calendar — no backend, no account. `endDate` is
 * the last day; DTEND is exclusive so we emit last-day + 1.
 */
export function buildEventIcs(opts: {
  uid: string;
  name: string;
  startDate?: string;
  endDate?: string;
  location?: string;
  url?: string;
  description?: string;
}): string {
  const ymd = (iso: string) => iso.slice(0, 10).replace(/-/g, "");
  const dayAfter = (iso: string) => {
    const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
    const dt = new Date(Date.UTC(y, m - 1, d + 1));
    const p = (x: number) => String(x).padStart(2, "0");
    return `${dt.getUTCFullYear()}${p(dt.getUTCMonth() + 1)}${p(dt.getUTCDate())}`;
  };
  const esc = (s: string) =>
    s.replace(/([,;\\])/g, "\\$1").replace(/\r?\n/g, "\\n");
  const start = opts.startDate ? ymd(opts.startDate) : undefined;
  const endSrc = opts.endDate ?? opts.startDate;
  const end = endSrc ? dayAfter(endSrc) : undefined;
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//sir.golf//Raycast Golf//EN",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:${opts.uid}@sir.golf`,
    // RFC 5545: DTSTAMP is the moment this calendar object was created.
    // A fixed constant breaks calendar apps that dedupe re-imports by DTSTAMP.
    `DTSTAMP:${new Date()
      .toISOString()
      .replace(/[-:]/g, "")
      .replace(/\.\d{3}/, "")}`,
    start ? `DTSTART;VALUE=DATE:${start}` : "",
    end ? `DTEND;VALUE=DATE:${end}` : "",
    `SUMMARY:${esc(opts.name)}`,
    opts.location ? `LOCATION:${esc(opts.location)}` : "",
    opts.url ? `URL:${opts.url}` : "",
    opts.description ? `DESCRIPTION:${esc(opts.description)}` : "",
    "TRANSP:TRANSPARENT",
    "END:VEVENT",
    "END:VCALENDAR",
  ].filter(Boolean);
  return lines.join("\r\n") + "\r\n";
}

/** Deduped, ordered list of regions in WATCH_GUIDE, minus the "International"
 * catch-all (it matches every tour, so it filters nothing). */
export function watchRegions(): string[] {
  const seen: string[] = [];
  for (const tour of Object.keys(WATCH_GUIDE) as TourId[]) {
    for (const w of WATCH_GUIDE[tour]) {
      if (w.region !== "International" && !seen.includes(w.region))
        seen.push(w.region);
    }
  }
  return seen;
}

/** Does this tour have a (non-International) broadcast listing for the region? */
export function watchableIn(tour: TourId, region: string): boolean {
  return (WATCH_GUIDE[tour] ?? []).some((w) => w.region === region);
}

// ---- Parsers ---------------------------------------------------------------

function normalizeState(s?: string): EventState {
  return s === "pre" || s === "in" || s === "post" ? s : "unknown";
}

function thruDisplay(c: RawCompetitor, eventState: EventState): string {
  if (eventState === "post") return "F";
  if (eventState === "pre") return "—";
  const s = c.status;
  if (s?.displayValue) return String(s.displayValue);
  if (s?.thru !== undefined && s.thru !== null && s.thru !== "")
    return `thru ${s.thru}`;
  return "—";
}

function positionDisplay(c: RawCompetitor): string {
  if (c.status?.position?.displayName) return c.status.position.displayName;
  return c.order !== undefined ? String(c.order) : "—";
}

function pickEspnUrl(ev?: RawEvent): string | undefined {
  const links = ev?.links ?? [];
  const named = links.find((l) =>
    /leaderboard|event|gamecast/i.test(l.text ?? ""),
  );
  return (named ?? links[0])?.href;
}

function leagueLogoOf(data: RawScoreboard | undefined): string | undefined {
  return data?.leagues?.[0]?.logos?.find((l) => l.href)?.href;
}

export function parseLeaderboard(data: RawScoreboard | undefined): Leaderboard {
  const event = data?.events?.[0];
  if (!event)
    return {
      hasEvent: false,
      state: "unknown",
      players: [],
      leagueLogo: leagueLogoOf(data),
    };

  const comp = event.competitions?.[0];
  const state = normalizeState(event.status?.type?.state);
  const competitors = comp?.competitors ?? [];

  const players: PlayerRow[] = competitors.map((c) => ({
    athleteId: c.id ?? c.athlete?.id,
    position: positionDisplay(c),
    player: c.athlete?.displayName ?? "Unknown",
    flag: c.athlete?.flag?.href,
    total: c.score && c.score.length > 0 ? c.score : "E",
    thru: thruDisplay(c, state),
    rounds: (c.linescores ?? [])
      .map(
        (l) => l.displayValue ?? (l.value !== undefined ? String(l.value) : ""),
      )
      .filter((v) => v.length > 0),
  }));

  return {
    hasEvent: true,
    eventId: event.id,
    eventName: event.name ?? event.shortName,
    state,
    isLive: state === "in",
    statusDetail:
      comp?.status?.type?.detail ??
      event.status?.type?.detail ??
      event.status?.type?.shortDetail,
    startDate: event.date,
    espnUrl: pickEspnUrl(event),
    leagueLogo: leagueLogoOf(data),
    players,
  };
}

function winnerOf(event: RawEvent): { name?: string; score?: string } {
  const competitors = event.competitions?.[0]?.competitors ?? [];
  const w =
    competitors.find((c) => c.winner) ?? competitors.find((c) => c.order === 1);
  return { name: w?.athlete?.displayName, score: w?.score };
}

// ---- High-level fetchers (used by the commands) ----------------------------

function toYmd(iso: string): string {
  const d = new Date(iso);
  return `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, "0")}${String(d.getUTCDate()).padStart(2, "0")}`;
}

/**
 * Leaderboard with graceful fallback: live/just-finished event if there is one,
 * otherwise the MOST RECENT COMPLETED event. Auto-refresh (live) is handled in
 * the UI. This is where live tournament results flow in (state === "in").
 */
export async function getLeaderboard(tour: TourId): Promise<Leaderboard> {
  const data = await fetchJson<RawScoreboard>(scoreboardUrl(tour));
  const board = parseLeaderboard(data);
  const tagMajor = (b: Leaderboard) => {
    const major = majorLabelOf(b.eventName, tour);
    b.isMajor = !!major;
    b.majorLabel = major;
    return b;
  };

  if (board.hasEvent && (board.state === "in" || board.state === "post"))
    return tagMajor(board);

  const cal = data?.leagues?.[0]?.calendar ?? [];
  const nowMs = Date.now();
  const lastCompleted = [...cal]
    .reverse()
    .find((c) => c.endDate && Date.parse(c.endDate) < nowMs);
  if (lastCompleted?.endDate) {
    const past = await fetchJson<RawScoreboard>(
      `${scoreboardUrl(tour)}?dates=${toYmd(lastCompleted.endDate)}`,
    );
    const pastBoard = parseLeaderboard(past);
    if (pastBoard.hasEvent && pastBoard.players.length > 0) {
      pastBoard.isMostRecent = true;
      pastBoard.leagueLogo = board.leagueLogo;
      return tagMajor(pastBoard);
    }
  }
  return tagMajor(board);
}

/**
 * Season schedule. `sel === "all"` merges PGA + LPGA + DP World into one
 * chronological list (each entry tagged with its tour). Current year → cheap
 * calendar (this week / upcoming / recent), winners surfaced lazily in the
 * detail pane. Past year → that season's full events list with winners inline.
 */
export async function getSeason(
  sel: TourSel,
  year: number,
  now: Date = new Date(),
): Promise<Season> {
  if (sel === "all") {
    const all = await Promise.all(TOURS.map((t) => getSeason(t.id, year, now)));
    const entries = all
      .flatMap((s) => s.entries)
      .sort(
        (a, b) =>
          (Date.parse(a.startDate ?? "") || 0) -
          (Date.parse(b.startDate ?? "") || 0),
      );
    const logos: Partial<Record<TourId, string>> = {};
    TOURS.forEach((t, i) => {
      const lg = all[i].leagueLogo;
      if (lg) logos[t.id] = lg;
    });
    return { entries, logos };
  }

  if (year === now.getFullYear()) {
    const data = await fetchJson<RawScoreboard>(scoreboardUrl(sel));
    const logo = leagueLogoOf(data);
    return {
      entries: parseSchedule(data, now).map((e) => {
        const major = majorLabelOf(e.name, sel);
        return { ...e, tour: sel, isMajor: !!major, majorLabel: major };
      }),
      leagueLogo: logo,
      logos: logo ? { [sel]: logo } : {},
    };
  }

  const data = await fetchJson<RawScoreboard>(
    `${scoreboardUrl(sel)}?dates=${year}`,
  );
  const logo = leagueLogoOf(data);
  const entries: ScheduleEntry[] = (data.events ?? [])
    .filter((e) => e.name)
    .map((e) => {
      const w = winnerOf(e);
      const major = majorLabelOf(e.name, sel);
      return {
        id: e.id,
        name: e.name as string,
        startDate: e.date,
        endDate: e.endDate,
        state: "past",
        winner: w.name,
        winnerScore: w.score,
        tour: sel,
        isMajor: !!major,
        majorLabel: major,
      };
    });
  return { entries, leagueLogo: logo, logos: logo ? { [sel]: logo } : {} };
}

export function parseSchedule(
  data: RawScoreboard | undefined,
  now: Date = new Date(),
): ScheduleEntry[] {
  const cal = data?.leagues?.[0]?.calendar ?? [];
  const nowMs = now.getTime();
  return cal
    .filter((c) => c.label)
    .map((c) => {
      const start = c.startDate ? Date.parse(c.startDate) : NaN;
      const end = c.endDate ? Date.parse(c.endDate) : NaN;
      let state: ScheduleEntry["state"] = "upcoming";
      if (
        !Number.isNaN(start) &&
        !Number.isNaN(end) &&
        start <= nowMs &&
        nowMs <= end
      )
        state = "current";
      else if (!Number.isNaN(end) && end < nowMs) state = "past";
      return {
        id: c.id,
        name: c.label as string,
        startDate: c.startDate,
        endDate: c.endDate,
        state,
      };
    });
}

interface RawCoreEvent {
  name?: string;
  date?: string;
  endDate?: string;
  displayPurse?: string;
  isSignature?: boolean;
  links?: RawLink[];
  defendingChampion?: { athlete?: { fullName?: string; displayName?: string } };
  courses?: {
    name?: string;
    address?: { city?: string; state?: string; country?: string };
    weather?: { displayValue?: string };
  }[];
}

export async function getEventDetail(
  tour: TourId,
  eventId: string,
  now: Date = new Date(),
): Promise<EventDetail> {
  const ev = await fetchJson<RawCoreEvent>(
    `${CORE_BASE}/${tour}/events/${eventId}`,
  );
  const course = ev.courses?.[0];
  const addr = course?.address;
  const location =
    [addr?.city, addr?.state, addr?.country].filter(Boolean).join(", ") ||
    undefined;
  const champ = ev.defendingChampion?.athlete;
  const espn = (ev.links ?? []).find((l) =>
    /leaderboard|event/i.test(l.text ?? ""),
  )?.href;

  // Fetch the event's day board for broadcast networks, plus the winner if it's
  // already over. Completed → use the final day; otherwise the start date.
  let winner: string | undefined;
  let winnerScore: string | undefined;
  let broadcast: string | undefined;
  const completed = !!ev.endDate && Date.parse(ev.endDate) < now.getTime();
  const dayIso = completed ? ev.endDate : ev.date;
  if (dayIso) {
    try {
      const board = await fetchJson<RawScoreboard>(
        `${scoreboardUrl(tour)}?dates=${toYmd(dayIso)}`,
      );
      const e0 = board.events?.[0];
      if (completed) {
        const w = winnerOf(e0 ?? {});
        winner = w.name;
        winnerScore = w.score;
      }
      const names = (e0?.competitions?.[0]?.broadcasts ?? []).flatMap(
        (b) => b.names ?? [],
      );
      const unique = [...new Set(names.filter(Boolean))];
      if (unique.length) broadcast = unique.join(", ");
    } catch {
      /* fail soft */
    }
  }

  const major = majorLabelOf(ev.name, tour);

  return {
    name: ev.name ?? "Tournament",
    startDate: ev.date,
    endDate: ev.endDate,
    venue: course?.name,
    location,
    purse: ev.displayPurse,
    isSignature: ev.isSignature,
    isMajor: !!major,
    majorLabel: major,
    defendingChampion: champ?.fullName ?? champ?.displayName,
    weather: course?.weather?.displayValue,
    broadcast,
    winner,
    winnerScore,
    espnUrl: espn,
  };
}

interface RawLeaders {
  categories?: {
    name?: string;
    displayName?: string;
    leaders?: { displayValue?: string; athlete?: { $ref?: string } }[];
  }[];
}

// Resolved athlete names, cached for the life of the command process so that
// switching ranking categories doesn't re-fetch the same players repeatedly.
const _athleteNameCache: Record<string, string> = {};

async function fetchCategory(tour: TourId, categoryName: string, year: number) {
  try {
    const data = await fetchJson<RawLeaders>(
      `${CORE_BASE}/${tour}/seasons/${year}/types/2/leaders`,
    );
    return data.categories?.find((c) => c.name === categoryName);
  } catch {
    return undefined;
  }
}

export async function getSeasonLeaders(
  tour: TourId,
  categoryName: string,
  topN = 25,
): Promise<SeasonLeaders> {
  // Track the live, in-progress season (from the API, not the clock). If the
  // current season hasn't accrued this stat yet (very early season), fall back
  // to the prior season so the view is never blank — and label which year.
  const year = await currentSeasonYear(tour);
  const baseTitle =
    LEADERBOARD_VIEWS.find((c) => c.id === categoryName)?.title ?? categoryName;

  let cat = await fetchCategory(tour, categoryName, year);
  let usedYear = year;
  if (!cat?.leaders?.length) {
    const prev = await fetchCategory(tour, categoryName, year - 1);
    if (prev?.leaders?.length) {
      cat = prev;
      usedYear = year - 1;
    }
  }

  const title = `${cat?.displayName ?? baseTitle} · ${usedYear}`;
  if (!cat?.leaders?.length) return { title, rows: [] };

  const top = cat.leaders.slice(0, topN);
  const rows = await Promise.all(
    top.map(async (l, i): Promise<LeaderRow> => {
      const athleteId = l.athlete?.$ref?.match(/athletes\/(\d+)/)?.[1];
      let name = athleteId ? _athleteNameCache[athleteId] : undefined;
      // Resolve the name only if we haven't already (top players recur across
      // categories — caching avoids re-fetching and hammering the API, which is
      // what made rapid category-switching flake out).
      if (!name && l.athlete?.$ref) {
        try {
          const a = await fetchJson<RawAthlete>(l.athlete.$ref);
          name = a.displayName ?? a.fullName;
          if (athleteId && name) _athleteNameCache[athleteId] = name;
        } catch {
          /* fail soft */
        }
      }
      return {
        rank: i + 1,
        name: name ?? "Unknown",
        value: l.displayValue ?? "—",
        athleteId,
      };
    }),
  );
  return { title, rows };
}

interface RawAthleteFull {
  displayName?: string;
  fullName?: string;
  headshot?: { href?: string };
  flag?: { href?: string };
  age?: number;
  turnedPro?: number;
  displayHeight?: string;
  displayWeight?: string;
  hand?: { displayValue?: string } | string;
  college?: { name?: string };
  birthPlace?: { city?: string; state?: string; country?: string };
}
interface RawAthleteStats {
  splits?: {
    categories?: {
      name?: string;
      stats?: { displayName?: string; displayValue?: string }[];
    }[];
  };
}

const NOTABLE_STATS = [
  "Tournaments played",
  "Scoring Average",
  "Birdies",
  "Eagles",
  "Driving Distance",
  "Greens in Regulation Pct",
  "Sand Save Pct",
  "Cuts Made",
];

export async function getAthleteDetail(
  tour: TourId,
  athleteId: string,
): Promise<AthleteDetail> {
  const year = await currentSeasonYear(tour);
  const [aRes, sRes] = await Promise.allSettled([
    fetchJson<RawAthleteFull>(`${CORE_BASE}/${tour}/athletes/${athleteId}`),
    fetchJson<RawAthleteStats>(
      `${CORE_BASE}/${tour}/seasons/${year}/types/2/athletes/${athleteId}/statistics/0`,
    ),
  ]);

  const a = aRes.status === "fulfilled" ? aRes.value : undefined;
  const s = sRes.status === "fulfilled" ? sRes.value : undefined;

  const bp = a?.birthPlace;
  const birthPlace =
    [bp?.city?.trim(), bp?.state?.trim(), bp?.country?.trim()]
      .filter(Boolean)
      .join(", ") || undefined;
  const hand = typeof a?.hand === "string" ? a.hand : a?.hand?.displayValue;

  const flat: { label: string; value: string }[] = [];
  for (const c of s?.splits?.categories ?? []) {
    for (const st of c.stats ?? []) {
      if (st.displayName && st.displayValue)
        flat.push({ label: st.displayName, value: st.displayValue });
    }
  }
  const picked = NOTABLE_STATS.map((n) =>
    flat.find((f) => f.label === n),
  ).filter((x): x is { label: string; value: string } => !!x);
  const stats = picked.length > 0 ? picked : flat.slice(0, 8);

  return {
    name: a?.displayName ?? a?.fullName ?? "Player",
    headshot: a?.headshot?.href,
    flag: a?.flag?.href,
    age: a?.age,
    birthPlace,
    turnedPro: a?.turnedPro,
    height: a?.displayHeight,
    weight: a?.displayWeight,
    hand,
    college: a?.college?.name,
    stats,
  };
}

// ---- Formatting helpers ----------------------------------------------------

export function formatDateRange(start?: string, end?: string): string {
  if (!start) return "";
  const fmt = (iso: string) =>
    new Date(iso).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    });
  if (!end) return fmt(start);
  const s = fmt(start);
  const e = fmt(end);
  return s === e ? s : `${s} – ${e}`;
}

export function totalColorTag(total: string): "red" | "green" | "secondary" {
  // Raycast convention: green = good, red = bad. Under par is good in golf,
  // so under par → green and over par → red (inverting the golf-TV palette
  // to match Raycast's UI semantics).
  if (total.startsWith("-")) return "green";
  if (total === "E") return "secondary";
  return "red";
}
