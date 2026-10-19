import { LocalStorage } from "@raycast/api";
import { differenceInMilliseconds, format, isBefore, isSameDay, parse } from "date-fns";
import humanizeDuration from "humanize-duration";
import { DEFAULT_ZONE_ID, fetchResource, loadCached } from "./loaders";

const humanizer = humanizeDuration.humanizer({
  language: "shortEn",
  languages: {
    shortEn: {
      y: () => "y",
      mo: () => "mo",
      w: () => "w",
      d: () => "d",
      h: () => "hour",
      m: () => "min",
      s: () => "sec",
      ms: () => "ms",
    },
  },
});

export interface PrayerTimeItem {
  label: string;
  time: Date;
  value: string;
  different: string;
  isCurrent: boolean;
  isNext: boolean;
}

type PrayerName = "imsak" | "fajr" | "syuruk" | "dhuhr" | "asr" | "maghrib" | "isha";

export interface PrayerTime {
  hijri: string;
  date: string;
  day: string;
  imsak: string;
  fajr: string;
  syuruk: string;
  dhuhr: string;
  asr: string;
  maghrib: string;
  isha: string;
  // Epoch milliseconds of each prayer, used for countdowns.
  timestamps: Record<PrayerName, number>;
  items?: PrayerTimeItem[];
}

type PrayerKey = keyof PrayerTime;

// Malaysia is UTC+8 year-round, so the zone is fixed and needs no tz database.
const MALAYSIA_OFFSET_MS = 8 * 60 * 60 * 1000;

// Local Date whose wall-clock fields equal Malaysia time at `ms`, so date-fns formatting shows Malaysia time on any computer.
function malaysiaWallClock(ms: number): Date {
  const shifted = new Date(ms + MALAYSIA_OFFSET_MS);
  return new Date(
    shifted.getUTCFullYear(),
    shifted.getUTCMonth(),
    shifted.getUTCDate(),
    shifted.getUTCHours(),
    shifted.getUTCMinutes(),
    shifted.getUTCSeconds(),
  );
}

const prayerNameMap: Map<PrayerKey, string> = new Map<PrayerKey, string>([
  ["imsak", "Imsak"],
  ["fajr", "Subuh"],
  ["syuruk", "Syuruk"],
  ["dhuhr", "Zohor"],
  ["asr", "Asar"],
  ["maghrib", "Maghrib"],
  ["isha", `Isya`],
]);

interface SolatApiData {
  prayerTime: PrayerTime[];
}

interface ApiPrayerDay {
  day: number;
  hijri: string;
  imsak: number;
  fajr: number;
  syuruk: number;
  dhuhr: number;
  asr: number;
  maghrib: number;
  isha: number;
}

interface ApiMonth {
  year: number;
  month_number: number;
  prayers: ApiPrayerDay[];
}

const toTime = (ts: number) => format(malaysiaWallClock(ts * 1000), "HH:mm:ss");

async function fetchSolatData(zoneId = DEFAULT_ZONE_ID, now = new Date()): Promise<SolatApiData | undefined> {
  console.log("Fetching prayer times for", zoneId);
  const url = `https://api.waktusolat.app/v2/solat/${encodeURIComponent(zoneId)}?year=${now.getFullYear()}&month=${now.getMonth() + 1}`;
  return fetchResource({
    url,
    errorTitle: "Unable to load prayer times",
    parseResponse: async (response) => {
      const data = (await response.json()) as ApiMonth;

      return {
        prayerTime: data.prayers.map((p) => ({
          hijri: p.hijri,
          date: format(new Date(data.year, data.month_number - 1, p.day), "dd-MMM-yyyy"),
          day: format(new Date(data.year, data.month_number - 1, p.day), "EEEE"),
          imsak: toTime(p.imsak),
          fajr: toTime(p.fajr),
          syuruk: toTime(p.syuruk),
          dhuhr: toTime(p.dhuhr),
          asr: toTime(p.asr),
          maghrib: toTime(p.maghrib),
          isha: toTime(p.isha),
          timestamps: {
            imsak: p.imsak * 1000,
            fajr: p.fajr * 1000,
            syuruk: p.syuruk * 1000,
            dhuhr: p.dhuhr * 1000,
            asr: p.asr * 1000,
            maghrib: p.maghrib * 1000,
            isha: p.isha * 1000,
          },
        })),
      };
    },
  });
}

async function loadSolatData(zoneId = DEFAULT_ZONE_ID, shouldRefresh = false) {
  const now = malaysiaWallClock(Date.now());
  const cacheKey = `prayer-time-v3-${zoneId}-${format(now, "yyyy-MM")}`;
  return loadCached({
    key: cacheKey,
    load: () => fetchSolatData(zoneId, now),
    shouldRefresh,
    isValid: (data) => data.prayerTime.length > 0,
  });
}

function getHumanDifferent(time: Date) {
  return `in ${humanizer(differenceInMilliseconds(time, new Date()), {
    round: true,
    conjunction: " and ",
    serialComma: false,
    largest: 2,
  })}`;
}

export async function loadTodaySolat(zoneId: string, shouldRefresh = false): Promise<PrayerTime | undefined> {
  const data = await loadSolatData(zoneId, shouldRefresh);

  const today = malaysiaWallClock(Date.now());

  return data?.prayerTime
    ?.filter((t) => {
      const input = parse(t.date, "dd-MMM-yyyy", new Date());
      return isSameDay(today, input);
    })
    .map((t) => {
      const keys: PrayerName[] = ["imsak", "fajr", "syuruk", "dhuhr", "asr", "maghrib", "isha"];

      t.items = keys.map((key) => {
        const ms = t.timestamps[key];
        const time = new Date(ms);

        return {
          value: format(malaysiaWallClock(ms), "hh:mm a"),
          label: prayerNameMap.get(key)!,
          different: `${getHumanDifferent(time)}`,
          time,
        } as PrayerTimeItem;
      });

      const current = t.items.findLast((item) => !isBefore(new Date(), item.time)) ?? t.items[0];

      if (current) {
        current.isCurrent = true;
        const currentIndex = t.items.indexOf(current);

        if (t.items.length > 1) {
          t.items[currentIndex + 1 < t.items.length ? currentIndex + 1 : 0].isNext = true;
        }
      }

      return t;
    })
    .find(Boolean);
}

export async function loadStoredPrayerTime(): Promise<{ zoneId: string; prayerTime: PrayerTime | undefined }> {
  const zoneId = (await LocalStorage.getItem<string>("zone")) || DEFAULT_ZONE_ID;
  return { zoneId, prayerTime: await loadTodaySolat(zoneId) };
}
