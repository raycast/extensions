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
  items?: PrayerTimeItem[];
}

type PrayerKey = keyof PrayerTime;

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
  status: string;
  serverTime: string;
  periodType: string;
  lang: string;
  zone: string;
  bearing: string;
}

async function fetchSolatData(zoneId = DEFAULT_ZONE_ID): Promise<SolatApiData | undefined> {
  console.log("Fetching prayer times for", zoneId);
  const url = `https://www.e-solat.gov.my/index.php?r=esolatApi/takwimsolat&period=year&zone=${zoneId}`;
  return fetchResource(url, "Unable to load prayer times", async (response) => (await response.json()) as SolatApiData);
}

async function loadSolatData(zoneId = DEFAULT_ZONE_ID, shouldRefresh = false) {
  const cacheKey = `prayer-time-${zoneId}-${new Date().getFullYear()}`;
  return loadCached(cacheKey, () => fetchSolatData(zoneId), shouldRefresh);
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

  return data?.prayerTime
    ?.filter((t) => {
      const input = parse(t.date, "dd-MMM-yyyy", new Date());
      return isSameDay(new Date(), input);
    })
    .map((t) => {
      const keys: PrayerKey[] = ["imsak", "fajr", "syuruk", "dhuhr", "asr", "maghrib", "isha"];

      t.items = keys.map((key) => {
        const value: string = t[key as PrayerKey] as string;
        const time = parse(value, "HH:mm:ss", new Date());

        return {
          value: format(time, "hh:mm a"),
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
