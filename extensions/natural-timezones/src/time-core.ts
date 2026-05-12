import { TIMEZONE_DATA, TIMEZONE_TOPONYMS } from "./generated/timezone-data";

export type HourFormat = "12" | "24";

type City = {
  name: string;
  country: string;
  iso2?: string;
  admin?: string;
  zone: string;
  pop?: number;
  aliases?: string[];
};

type Location = {
  label: string;
  country: string;
  admin?: string;
  zone: string;
  type: "city" | "toponym" | "timezone" | "country" | "zone" | "local";
  pop?: number;
  iso2?: string;
  zones?: string[];
};

type ParsedTime = {
  date?: Date;
  hour?: number;
  minute?: number;
  dayShift?: number;
  original?: string;
  hasTime: boolean;
  absolute?: boolean;
};

export type ParsedQuery = {
  mode:
    | "empty"
    | "unknown"
    | "meeting"
    | "now"
    | "offset"
    | "convert"
    | "convert-to-local";
  source?: Location;
  targets?: Location[];
  time?: ParsedTime | null;
  raw?: string;
  highlights?: string[];
};

export type TimeResult = {
  target: Location;
  instant: Date;
  time: string;
  date: string;
  day: string;
  offset: string;
  relativeOffset: string;
  zoneOffset: string;
  zoneName: string;
  phase: { label: string; className: string; icon: string };
  copy: string;
  sourceDetail?: {
    title: string;
    time: string;
    offset: string;
    phase: string;
  };
};

const TZ_ABBR: Record<string, string> = {
  pst: "America/Los_Angeles",
  pdt: "America/Los_Angeles",
  pt: "America/Los_Angeles",
  mst: "America/Denver",
  mt: "America/Denver",
  cst: "America/Chicago",
  ct: "America/Chicago",
  est: "America/New_York",
  edt: "America/New_York",
  et: "America/New_York",
  gmt: "Etc/GMT",
  utc: "Etc/UTC",
  cet: "Europe/Paris",
  cest: "Europe/Paris",
  wet: "Europe/Lisbon",
  west: "Europe/Lisbon",
  bst: "Europe/London",
  ist: "Asia/Kolkata",
  jst: "Asia/Tokyo",
  aest: "Australia/Sydney",
};

export const EXAMPLES = [
  "time in sfo",
  "now in tokyo",
  "6pm in new york",
  "14:30 in paris",
  "20h in berlin",
  "9am tokyo in london",
  "tomorrow 9am paris",
  "in 3 hours in berlin",
  "2pm west in paris, los angeles, tokyo",
  "time difference between nyc and london",
  "is it work hours in singapore",
  "what day is it in tokyo",
  "good time to call sydney from nyc",
  "how far ahead is auckland",
  "time in usa",
];

const EXTRA_CITY_ALIASES: Record<string, string[]> = {
  "san francisco|america/los_angeles": [
    "sf",
    "sfo",
    "san fran",
    "sanfran",
    "san frar",
    "bay area",
    "the bay",
    "silicon valley",
  ],
  "los angeles|america/los_angeles": ["la", "lax"],
  "new york|america/new_york": ["nyc", "jfk", "ewr", "lga"],
  "kuala lumpur|asia/kuala_lumpur": ["kl"],
  "london|europe/london": ["lhr", "lgw", "stn", "lcy"],
  "paris|europe/paris": ["cdg", "ory"],
  "tokyo|asia/tokyo": ["nrt", "hnd"],
  "singapore|asia/singapore": ["sin"],
  "dubai|asia/dubai": ["dxb"],
  "hong kong|asia/hong_kong": ["hkg"],
  "sydney|australia/sydney": ["syd"],
  "berlin|europe/berlin": ["ber"],
  "mumbai|asia/kolkata": ["bom", "bombay"],
  "new delhi|asia/kolkata": ["del"],
  "bangkok|asia/bangkok": ["bkk"],
  "seoul|asia/seoul": ["icn"],
  "amsterdam|europe/amsterdam": ["ams"],
  "frankfurt|europe/berlin": ["fra"],
  "zurich|europe/zurich": ["zrh"],
};

const normalize = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[?!.]/g, "")
    .replace(/\s+/g, " ")
    .trim();

const displayZone = (zone: string) =>
  zone.replace(/_/g, " ").replace(/\//g, " / ");
const COUNTRY_INDEX = TIMEZONE_DATA.countries as Record<
  string,
  { name: string; zones: string[] }
>;
const COUNTRY_ENTRIES = buildCountryEntries(COUNTRY_INDEX);
const TOPONYM_ENTRIES = buildToponymEntries(
  TIMEZONE_TOPONYMS as Array<{
    label: string;
    country?: string;
    zone: string;
    aliases?: string[];
  }>,
);
const LOCATION_ENTRIES = buildLocationEntries(TIMEZONE_DATA.cities as City[]);

export function defaultTimeFormat(
  locale = Intl.DateTimeFormat().resolvedOptions().locale || "",
): HourFormat {
  let region = "";
  try {
    region =
      typeof Intl.Locale === "function" && locale
        ? new Intl.Locale(locale).region || ""
        : "";
  } catch {
    region = "";
  }
  if (!region && locale.includes("-")) region = locale.split("-").pop() || "";
  return ["US", "CA"].includes(region.toUpperCase()) ? "12" : "24";
}

export function isValidTimeZone(zone: unknown): zone is string {
  if (!zone || typeof zone !== "string") return false;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: zone }).format(new Date());
    return true;
  } catch {
    return false;
  }
}

export function resolveZoneInput(
  text: string,
): { zone: string; label: string } | null {
  const raw = text.trim();
  if (!raw) return null;
  const directZone = raw.includes("/")
    ? raw
        .split("/")
        .map((part) =>
          part
            .split(/[_\s]+/)
            .filter(Boolean)
            .map(
              (word) =>
                word.charAt(0).toUpperCase() + word.slice(1).toLowerCase(),
            )
            .join("_"),
        )
        .join("/")
    : raw;
  if (isValidTimeZone(raw)) return { zone: raw, label: zoneShortName(raw) };
  if (isValidTimeZone(directZone))
    return { zone: directZone, label: zoneShortName(directZone) };
  const location = findLocation(raw);
  const zone = location?.zone || location?.zones?.[0];
  if (!zone || !isValidTimeZone(zone)) return null;
  return { zone, label: location.label };
}

export function parseAndResolve(
  raw: string,
  options: { localZone?: string; hourFormat?: HourFormat } = {},
) {
  const localZone = isValidTimeZone(options.localZone)
    ? options.localZone
    : Intl.DateTimeFormat().resolvedOptions().timeZone;
  const hourFormat = options.hourFormat || defaultTimeFormat();
  const parsed = parseQuery(raw, localZone);
  const results = resolve(parsed, localZone, hourFormat);
  return { parsed, results, localZone, hourFormat };
}

function buildToponymEntries(
  toponyms: Array<{
    label: string;
    country?: string;
    zone: string;
    aliases?: string[];
  }>,
) {
  const seen = new Set<string>();
  const entries: Array<{ key: string; kind: string; location: Location }> = [];
  for (const toponym of toponyms) {
    if (!toponym?.label || !toponym?.zone || !isValidTimeZone(toponym.zone))
      continue;
    const location: Location = {
      label: toponym.label,
      country: toponym.country || "Place",
      zone: toponym.zone,
      type: "toponym",
    };
    for (const item of [
      { value: toponym.label, kind: "name" },
      ...(toponym.aliases || []).map((value) => ({ value, kind: "alias" })),
    ]) {
      const normalizedKey = normalize(item.value);
      const dedupeKey = `${normalizedKey}|${location.label}|${location.zone}`;
      if (!normalizedKey || seen.has(dedupeKey)) continue;
      seen.add(dedupeKey);
      entries.push({ key: normalizedKey, kind: item.kind, location });
    }
  }
  return entries.sort(
    (a, b) =>
      a.key.length - b.key.length ||
      a.location.label.localeCompare(b.location.label),
  );
}

function buildCountryEntries(
  countries: Record<string, { name: string; zones: string[] }>,
) {
  const seen = new Set<string>();
  const entries: Array<{ key: string; country: Location }> = [];
  for (const [key, country] of Object.entries(countries)) {
    if (!country?.name || !country?.zones?.length) continue;
    const normalizedKey = normalize(key);
    const dedupeKey = `${normalizedKey}|${country.name}|${country.zones.join(",")}`;
    if (!normalizedKey || normalizedKey.length <= 2 || seen.has(dedupeKey))
      continue;
    seen.add(dedupeKey);
    entries.push({
      key: normalizedKey,
      country: {
        label: country.name,
        country: "Country",
        type: "country",
        zones: country.zones,
        zone: country.zones[0],
      },
    });
  }
  return entries.sort(
    (a, b) =>
      a.key.length - b.key.length ||
      a.country.label.localeCompare(b.country.label),
  );
}

function buildLocationEntries(cities: City[]) {
  const seen = new Set<string>();
  const entries: Array<{ key: string; kind: string; location: Location }> = [];
  for (const city of cities) {
    const location: Location = {
      label: city.name,
      country: city.country,
      admin: city.admin,
      zone: city.zone,
      type: "city",
      pop: city.pop || 0,
      iso2: city.iso2 || "",
    };
    const keys = [
      { value: city.name, kind: "name" },
      { value: `${city.name} ${city.country}`, kind: "qualified" },
      { value: `${city.name}, ${city.country}`, kind: "qualified" },
      {
        value: city.admin ? `${city.name} ${city.admin}` : "",
        kind: "qualified",
      },
      ...(city.aliases || []).map((value) => ({ value, kind: "alias" })),
      ...(
        EXTRA_CITY_ALIASES[`${normalize(city.name)}|${normalize(city.zone)}`] ||
        []
      ).map((value) => ({ value, kind: "alias" })),
    ].filter((item) => item.value);
    for (const item of keys) {
      const normalizedKey = normalize(item.value);
      const dedupeKey = `${normalizedKey}|${location.label}|${location.zone}`;
      if (!normalizedKey || seen.has(dedupeKey)) continue;
      seen.add(dedupeKey);
      entries.push({ key: normalizedKey, kind: item.kind, location });
    }
  }
  return entries.sort((a, b) => (b.location.pop || 0) - (a.location.pop || 0));
}

function findLocation(text: string): Location | null {
  const normalized = normalize(text);
  if (!normalized) return null;
  if (TZ_ABBR[normalized])
    return {
      label: normalized.toUpperCase(),
      country: "Timezone",
      zone: TZ_ABBR[normalized],
      type: "timezone",
    };
  const exact = LOCATION_ENTRIES.find((entry) => entry.key === normalized);
  if (exact && !isAmbiguousShortName(exact, normalized)) return exact.location;
  const exactToponym = TOPONYM_ENTRIES.find(
    (entry) => entry.key === normalized,
  );
  if (exactToponym) return exactToponym.location;
  if (COUNTRY_INDEX[normalized]) {
    const country = COUNTRY_INDEX[normalized];
    return {
      label: country.name,
      country: "Country",
      type: "country",
      zones: country.zones,
      zone: country.zones[0],
    };
  }
  if (normalized.length < 3) return null;
  return (
    bestPrefixCountry(normalized) ||
    bestPrefixToponym(normalized) ||
    bestPrefixLocation(normalized) ||
    (normalized.length >= 5 ? fuzzyUniqueLocation(normalized) : null)
  );
}

function bestPrefixCountry(normalized: string) {
  const unique = new Map<string, Location>();
  for (const entry of COUNTRY_ENTRIES) {
    if (!entry.key.startsWith(normalized)) continue;
    unique.set(
      `${entry.country.label}|${entry.country.zones?.join(",")}`,
      entry.country,
    );
    if (unique.size > 1) return null;
  }
  return unique.size === 1 ? [...unique.values()][0] : null;
}

function bestPrefixToponym(normalized: string) {
  const unique = new Map<string, Location>();
  for (const entry of TOPONYM_ENTRIES) {
    if (!entry.key.startsWith(normalized)) continue;
    unique.set(
      `${entry.location.label}|${entry.location.zone}`,
      entry.location,
    );
    if (unique.size > 1) return null;
  }
  return unique.size === 1 ? [...unique.values()][0] : null;
}

function bestPrefixLocation(normalized: string) {
  const matches: Location[] = [];
  const unique = new Set<string>();
  for (const entry of LOCATION_ENTRIES) {
    if (!entry.key.startsWith(normalized)) continue;
    const key = `${entry.location.label}|${entry.location.zone}`;
    if (unique.has(key)) continue;
    unique.add(key);
    matches.push(entry.location);
    if (matches.length > 8) break;
  }
  if (!matches.length) return null;
  if (matches.length === 1) return matches[0];
  return normalized.length >= 5 ? matches[0] : null;
}

function isAmbiguousShortName(exact: { kind: string }, normalized: string) {
  if (exact.kind === "alias" || normalized.length >= 4) return false;
  const unique = new Set<string>();
  for (const entry of LOCATION_ENTRIES) {
    if (!entry.key.startsWith(normalized)) continue;
    unique.add(`${entry.location.label}|${entry.location.zone}`);
    if (unique.size > 1) return true;
  }
  return false;
}

function fuzzyUniqueLocation(normalized: string) {
  const unique = new Map<string, Location>();
  for (const entry of LOCATION_ENTRIES) {
    const candidate = entry.key.slice(0, normalized.length);
    if (
      candidate.length < normalized.length ||
      !isWithinOneEdit(normalized, candidate)
    )
      continue;
    unique.set(
      `${entry.location.label}|${entry.location.zone}`,
      entry.location,
    );
    if (unique.size > 1) return null;
  }
  return unique.size === 1 ? [...unique.values()][0] : null;
}

function isWithinOneEdit(a: string, b: string) {
  if (Math.abs(a.length - b.length) > 1) return false;
  let edits = 0;
  let i = 0;
  let j = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      i++;
      j++;
      continue;
    }
    edits++;
    if (edits > 1) return false;
    if (a.length > b.length) i++;
    else if (b.length > a.length) j++;
    else {
      i++;
      j++;
    }
  }
  return edits + (a.length - i) + (b.length - j) <= 1;
}

function parseTime(text: string): ParsedTime | null {
  const normalized = normalize(text);
  if (/\bnow\b/.test(normalized))
    return { date: new Date(), original: "now", hasTime: false };
  let dayShift = 0;
  if (/\btomorrow\b/.test(normalized)) dayShift = 1;
  if (/\byesterday\b/.test(normalized)) dayShift = -1;
  const relative = normalized.match(
    /\bin\s+(\d+)\s*(hour|hours|hr|hrs|minute|minutes|min|mins)\b/,
  );
  if (relative) {
    const amount = Number(relative[1]);
    const minutes =
      relative[2].startsWith("hour") || relative[2].startsWith("hr")
        ? amount * 60
        : amount;
    return {
      date: new Date(Date.now() + minutes * 60000),
      original: relative[0],
      hasTime: true,
      absolute: true,
    };
  }
  if (/\bnoon\b/.test(normalized))
    return { hour: 12, minute: 0, dayShift, original: "noon", hasTime: true };
  if (/\bmidnight\b/.test(normalized))
    return {
      hour: 0,
      minute: 0,
      dayShift,
      original: "midnight",
      hasTime: true,
    };
  const hourNotation = normalized.match(/\b(\d{1,2})\s*h(?:(\d{2}))?\b/);
  if (hourNotation) {
    const hour = Number(hourNotation[1]);
    const minute = Number(hourNotation[2] || 0);
    if (hour > 23 || minute > 59) return null;
    return { hour, minute, dayShift, original: hourNotation[0], hasTime: true };
  }
  const match = normalized.match(/\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\b/);
  if (!match) return null;
  let hour = Number(match[1]);
  const minute = Number(match[2] || 0);
  const meridiem = match[3];
  if (meridiem === "pm" && hour < 12) hour += 12;
  if (meridiem === "am" && hour === 12) hour = 0;
  if (hour > 23 || minute > 59) return null;
  return { hour, minute, dayShift, original: match[0].trim(), hasTime: true };
}

function stripTime(text: string, time: ParsedTime | null) {
  if (!time) return text;
  return text
    .replace(/\b(tomorrow|today|yesterday)\b/gi, "")
    .replace(/\bin\s+\d+\s*(hour|hours|hr|hrs|minute|minutes|min|mins)\b/gi, "")
    .replace(/\b(noon|midnight|now)\b/gi, "")
    .replace(/\b\d{1,2}\s*h(?:\d{2})?\b/gi, "")
    .replace(/\b\d{1,2}(?::\d{2})?\s*(am|pm)?\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

function splitTargets(text: string) {
  return text
    .split(/\s*,\s*|\s+and\s+/i)
    .map((part) => part.replace(/^(in|to|at)\s+/i, "").trim())
    .filter(Boolean);
}

function withHighlights(
  parsed: ParsedQuery,
  highlights: string[],
): ParsedQuery {
  return {
    ...parsed,
    highlights: highlights
      .flat()
      .map((term) => String(term || "").trim())
      .filter(Boolean),
  };
}

function timeHighlightTerms(time: ParsedTime | null, query: string) {
  if (!time) return [];
  const terms: string[] = [];
  const normalized = normalize(query);
  if (/\btomorrow\b/.test(normalized)) terms.push("tomorrow");
  if (/\byesterday\b/.test(normalized)) terms.push("yesterday");
  if (time.original) terms.push(time.original);
  return terms;
}

function parseQuery(raw: string, localZone: string): ParsedQuery {
  const query = raw.trim();
  if (!query) return { mode: "empty" };
  const normalized = normalize(query);
  const local: Location = {
    label: "You",
    zone: localZone,
    country: "Local",
    type: "local",
  };
  const meeting = normalized.match(/^good time to call (.+?) from (.+)$/);
  if (meeting) {
    const target = findLocation(meeting[1]);
    const source = findLocation(meeting[2]);
    return target && source
      ? withHighlights(
          { mode: "meeting", source, targets: [target], raw: query },
          [meeting[1], meeting[2]],
        )
      : { mode: "unknown", raw: query };
  }
  const dayCheck = normalized.match(/^what day is it (?:in )?(.+)$/);
  if (dayCheck) {
    const target = findLocation(dayCheck[1]);
    return target
      ? withHighlights(
          {
            mode: "now",
            source: local,
            targets: expandLocation(target),
            raw: query,
          },
          [dayCheck[1]],
        )
      : { mode: "unknown", raw: query };
  }
  const workCheck = normalized.match(
    /^(?:is it work hours|is it working hours|work hours|working hours)(?: in)? (.+)$/,
  );
  if (workCheck) {
    const target = findLocation(workCheck[1]);
    return target
      ? withHighlights(
          {
            mode: "now",
            source: local,
            targets: expandLocation(target),
            raw: query,
          },
          [workCheck[1]],
        )
      : { mode: "unknown", raw: query };
  }
  const difference = normalized.match(
    /^(?:time difference|difference|offset)(?: between)? (.+?) (?:and|to|from) (.+)$/,
  );
  if (difference) {
    const source = findLocation(difference[1]);
    const targets = splitTargets(difference[2])
      .flatMap((part) => expandLocation(findLocation(part)))
      .filter(Boolean);
    return source && targets.length
      ? withHighlights({ mode: "offset", source, targets, raw: query }, [
          difference[1],
          ...splitTargets(difference[2]),
        ])
      : { mode: "unknown", raw: query };
  }
  const distanceFrom = normalized.match(
    /^how far (?:ahead|behind) is (.+?) from (.+)$/,
  );
  if (distanceFrom) {
    const target = findLocation(distanceFrom[1]);
    const source = findLocation(distanceFrom[2]);
    return target && source
      ? withHighlights(
          {
            mode: "offset",
            source,
            targets: expandLocation(target),
            raw: query,
          },
          [distanceFrom[1], distanceFrom[2]],
        )
      : { mode: "unknown", raw: query };
  }
  const distance = normalized.match(
    /(?:how far (?:ahead|behind) is|offset for)(.+)$/,
  );
  if (distance) {
    const target = findLocation(distance[1]);
    return target
      ? withHighlights(
          {
            mode: "offset",
            source: local,
            targets: expandLocation(target),
            raw: query,
          },
          [distance[1]],
        )
      : { mode: "unknown", raw: query };
  }
  const time = parseTime(query);
  const withoutTime = stripTime(query, time)
    .replace(/^(what'?s|what is|time|the time|local time)\s+/i, "")
    .replace(/^in\s+/i, "")
    .trim();
  const cross = withoutTime.match(/^(.+?)\s+(?:in|to)\s+(.+)$/i);
  if (time && cross) {
    const source = findLocation(cross[1]);
    const targets = splitTargets(cross[2])
      .flatMap((part) => expandLocation(findLocation(part)))
      .filter(Boolean);
    if (source && targets.length)
      return withHighlights(
        { mode: "convert", source, targets, time, raw: query },
        [
          ...timeHighlightTerms(time, query),
          cross[1],
          ...splitTargets(cross[2]),
        ],
      );
  }
  const inMatch = withoutTime.match(/^(?:in\s+)?(.+)$/i);
  if (inMatch) {
    const targets = splitTargets(inMatch[1])
      .flatMap((part) => expandLocation(findLocation(part)))
      .filter(Boolean);
    if (targets.length) {
      const convertToLocal = Boolean(time?.hasTime && !time.absolute);
      return withHighlights(
        {
          mode: convertToLocal ? "convert-to-local" : "now",
          source: convertToLocal ? targets[0] : local,
          targets: convertToLocal ? [local] : targets,
          time,
          raw: query,
        },
        [...timeHighlightTerms(time, query), ...splitTargets(inMatch[1])],
      );
    }
  }
  const direct = findLocation(withoutTime);
  if (direct)
    return withHighlights(
      {
        mode: "now",
        source: local,
        targets: expandLocation(direct),
        raw: query,
      },
      [...timeHighlightTerms(time, query), withoutTime],
    );
  return { mode: "unknown", raw: query };
}

function expandLocation(location: Location | null): Location[] {
  if (!location) return [];
  if (location.type !== "country") return [location];
  return (location.zones || []).map((zone) => ({
    label: `${location.label} · ${displayZone(zone).split(" / ").pop()}`,
    country: location.label,
    zone,
    type: "zone",
  }));
}

function resolve(
  parsed: ParsedQuery,
  localZone: string,
  hourFormat: HourFormat,
) {
  if (
    parsed.mode === "empty" ||
    parsed.mode === "unknown" ||
    !parsed.targets?.length ||
    !parsed.source
  )
    return [];
  if (parsed.mode === "meeting")
    return resolveMeeting(parsed, localZone, hourFormat);
  const instant = parsed.time?.hasTime
    ? parsed.time.date || zonedTimeToDate(parsed.time, parsed.source.zone)
    : new Date();
  const results = parsed.targets.map((target) =>
    buildResult(target, instant, parsed, localZone, hourFormat),
  );
  return shouldSortCountryResults(parsed, results)
    ? sortResultsByLocalTime(results)
    : results;
}

function shouldSortCountryResults(parsed: ParsedQuery, results: TimeResult[]) {
  return (
    results.length > 1 &&
    parsed.targets?.every((target) => target.type === "zone" && target.country)
  );
}

function sortResultsByLocalTime(results: TimeResult[]) {
  return [...results].sort(
    (a, b) =>
      localWallTimeSortValue(a.instant, a.target.zone) -
        localWallTimeSortValue(b.instant, b.target.zone) ||
      resultTitle(a.target).localeCompare(resultTitle(b.target)),
  );
}

function resolveMeeting(
  parsed: ParsedQuery,
  localZone: string,
  hourFormat: HourFormat,
) {
  const source = parsed.source!;
  const target = parsed.targets![0];
  const windows: Date[] = [];
  for (let hour = 7; hour <= 22; hour++) {
    const instant = zonedTimeToDate(
      { hour, minute: 0, dayShift: 0, hasTime: true },
      source.zone,
    );
    const targetHour = hourInZone(instant, target.zone);
    if (targetHour >= 8 && targetHour <= 18 && hour >= 8 && hour <= 18)
      windows.push(instant);
  }
  const chosen =
    windows[0] ||
    zonedTimeToDate(
      { hour: 9, minute: 0, dayShift: 1, hasTime: true },
      source.zone,
    );
  return [
    buildResult(source, chosen, parsed, localZone, hourFormat),
    buildResult(target, chosen, parsed, localZone, hourFormat),
  ];
}

function buildResult(
  target: Location,
  instant: Date,
  parsed: ParsedQuery,
  localZone: string,
  hourFormat: HourFormat,
): TimeResult {
  const hour = hourInZone(instant, target.zone);
  const offsetMs =
    getOffsetMs(instant, target.zone) - getOffsetMs(instant, localZone);
  const offset =
    offsetMs === 0
      ? "same as you"
      : `${offsetMs > 0 ? "+" : ""}${offsetDuration(offsetMs)} from you`;
  const phase = phaseForHour(hour);
  const sourceDetail =
    shouldShowSourceDetail(parsed, target) && parsed.source
      ? {
          title: sourceTitle(parsed.source),
          time: formatTimePlain(instant, parsed.source.zone, hourFormat),
          offset: zoneOffsetAndName(instant, parsed.source.zone),
          phase: phaseForHour(hourInZone(instant, parsed.source.zone)).label,
        }
      : undefined;
  return {
    target,
    instant,
    time: formatTimePlain(instant, target.zone, hourFormat),
    date: datePhrase(instant, target.zone),
    day: dayPhrase(instant, target.zone),
    offset,
    relativeOffset: relativeOffset(instant, parsed.source, target, offset),
    zoneOffset: zoneOffsetLabel(instant, target.zone),
    zoneName: zoneOffsetAndName(instant, target.zone),
    phase,
    copy: copyText(parsed, target, instant, hourFormat),
    sourceDetail,
  };
}

function shouldShowSourceDetail(parsed: ParsedQuery, target: Location) {
  return (
    ["convert", "convert-to-local", "meeting"].includes(parsed.mode) &&
    parsed.source?.zone &&
    parsed.source.zone !== target.zone
  );
}

function getOffsetMs(date: Date, timeZone: string) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    hourCycle: "h23",
  });
  const parts = Object.fromEntries(
    formatter
      .formatToParts(date)
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  );
  const asUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour),
    Number(parts.minute),
    Number(parts.second),
  );
  return asUtc - date.getTime();
}

function zonedTimeToDate(time: ParsedTime, zone: string) {
  const base = new Date();
  base.setDate(base.getDate() + (time.dayShift || 0));
  const utcGuess = Date.UTC(
    base.getFullYear(),
    base.getMonth(),
    base.getDate(),
    time.hour || 0,
    time.minute || 0,
    0,
  );
  let result = new Date(utcGuess - getOffsetMs(new Date(utcGuess), zone));
  result = new Date(utcGuess - getOffsetMs(result, zone));
  return result;
}

function localWallTimeSortValue(instant: Date, zone: string) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone: zone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
      hourCycle: "h23",
    })
      .formatToParts(instant)
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  );
  return Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour),
    Number(parts.minute),
    Number(parts.second),
  );
}

function formatInZone(
  date: Date,
  timeZone: string,
  options: Intl.DateTimeFormatOptions,
) {
  return new Intl.DateTimeFormat("en-US", { timeZone, ...options }).format(
    date,
  );
}

function zoneOffsetLabel(date: Date, zone: string) {
  const hours = getOffsetMs(date, zone) / 3600000;
  const sign = hours >= 0 ? "+" : "-";
  const abs = Math.abs(hours);
  const whole = Math.floor(abs);
  const minutes = Math.round((abs - whole) * 60);
  return `UTC${sign}${String(whole).padStart(2, "0")}${minutes ? `:${String(minutes).padStart(2, "0")}` : ""}`;
}

function phaseForHour(hour: number) {
  if (hour < 5) return { label: "sleep", className: "sleep", icon: "○" };
  if (hour < 9) return { label: "early", className: "evening", icon: "◐" };
  if (hour < 18) return { label: "working", className: "work", icon: "●" };
  if (hour < 22) return { label: "evening", className: "evening", icon: "◑" };
  return { label: "late evening", className: "sleep", icon: "○" };
}

function copyText(
  parsed: ParsedQuery,
  target: Location,
  instant: Date,
  hourFormat: HourFormat,
) {
  if (
    (parsed.mode === "convert" ||
      parsed.mode === "convert-to-local" ||
      parsed.mode === "meeting") &&
    parsed.source
  ) {
    const sourceTime = formatTimePlain(instant, parsed.source.zone, hourFormat);
    const targetTime = formatTimePlain(instant, target.zone, hourFormat);
    return `${sourceTime} ${parsed.source.label} = ${targetTime} ${target.label}, ${formatInZone(instant, target.zone, { weekday: "long", month: "short", day: "numeric" })}`;
  }
  return `${target.label}: ${formatTimePlain(instant, target.zone, hourFormat)}, ${formatInZone(instant, target.zone, { weekday: "long", month: "short", day: "numeric" })}`;
}

function resultTitle(target: Location) {
  if (target.label === "You" || target.type === "local")
    return `your time · ${zoneShortName(target.zone)}`;
  return `${target.label.toLowerCase()} · ${target.zone.toLowerCase()}`;
}

export function displayTitle(target: Location) {
  return resultTitle(target);
}

function sourceTitle(source: Location) {
  if (source.label === "You" || source.type === "local")
    return `your time · ${zoneShortName(source.zone)}`;
  return `${source.label.toLowerCase()} · ${source.zone.toLowerCase()}`;
}

function relativeOffset(
  instant: Date,
  source: Location | undefined,
  target: Location,
  fallback: string,
) {
  if (!source?.zone || source.zone === target.zone) return fallback;
  const diffMs =
    getOffsetMs(instant, target.zone) - getOffsetMs(instant, source.zone);
  if (diffMs === 0) return `same as ${shortPlace(source)}`;
  const duration = offsetDuration(diffMs);
  return diffMs > 0
    ? `+${duration} ahead of ${shortPlace(source)}`
    : `${duration} behind ${shortPlace(source)}`;
}

function offsetDuration(offsetMs: number) {
  const totalMinutes = Math.round(Math.abs(offsetMs) / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (!minutes) return `${hours}h`;
  if (!hours) return `${minutes}m`;
  return `${hours}h ${minutes}m`;
}

function shortPlace(location: Location) {
  const aliases: Record<string, string> = {
    "New York": "nyc",
    "San Francisco": "sf",
    "Los Angeles": "la",
    You: "you",
  };
  return aliases[location.label] || location.label.toLowerCase();
}

function timePartMap(
  instant: Date,
  zone: string,
  options: Intl.DateTimeFormatOptions,
) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", { timeZone: zone, ...options })
      .formatToParts(instant)
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  );
  return parts as Record<string, string>;
}

function formatTimePlain(instant: Date, zone: string, hourFormat: HourFormat) {
  if (hourFormat === "12") {
    const parts = timePartMap(instant, zone, {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
    const suffix = (parts.dayPeriod || "").toLowerCase().replace(/\./g, "");
    return `${parts.hour}:${parts.minute}${suffix}`;
  }
  const parts = timePartMap(instant, zone, {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    hourCycle: "h23",
  });
  return `${parts.hour}:${parts.minute}`;
}

function hourInZone(instant: Date, zone: string) {
  return Number(
    formatInZone(instant, zone, {
      hour: "2-digit",
      hour12: false,
      hourCycle: "h23",
    }),
  );
}

function zoneShortName(zone: string) {
  return zone.split("/").pop()!.replace(/_/g, " ").toLowerCase();
}

function datePhrase(instant: Date, zone: string) {
  return formatInZone(instant, zone, {
    weekday: "long",
    month: "short",
    day: "numeric",
  }).toLowerCase();
}

function dayPhrase(instant: Date, zone: string) {
  const hour = hourInZone(instant, zone);
  const today = formatInZone(new Date(), zone, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const target = formatInZone(instant, zone, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  if (today === target) {
    if (hour < 12) return "this morning";
    if (hour < 18) return "today";
    return "tonight";
  }
  return formatInZone(instant, zone, { weekday: "long" }).toLowerCase();
}

function zoneOffsetAndName(instant: Date, zone: string) {
  const offset = zoneOffsetCompact(instant, zone);
  const name = zoneAbbr(instant, zone);
  return name ? `${offset} · ${name}` : offset;
}

function zoneOffsetCompact(instant: Date, zone: string) {
  const hours = getOffsetMs(instant, zone) / 3600000;
  const sign = hours >= 0 ? "+" : "-";
  const abs = Math.abs(hours);
  const whole = Math.floor(abs);
  const minutes = Math.round((abs - whole) * 60);
  return `utc${sign}${whole}${minutes ? `:${String(minutes).padStart(2, "0")}` : ""}`;
}

function zoneAbbr(instant: Date, zone: string) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: zone,
    timeZoneName: "short",
  });
  const part = formatter
    .formatToParts(instant)
    .find((item) => item.type === "timeZoneName");
  return part?.value?.toLowerCase() || "";
}
