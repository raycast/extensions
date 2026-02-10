import { EeaModelledInfo } from "../types";
import { fetchJson } from "./http";

type EeaEntry = {
  aqi?: number;
  aqi_NO2?: number;
  aqi_PM10?: number;
  aqi_PM25?: number;
  aqi_O3?: number;
  culprit?: string;
  val_NO2?: number;
  val_PM10?: number;
  val_PM25?: number;
  val_O3?: number;
};

type EeaResponse = Record<string, EeaEntry>;

const EEA_URL = "https://discomap.eea.europa.eu/AQITest/modelledInfo";

const EEA_BANDS = [
  {
    label: "Good",
    emoji: "🟢",
    general: "The air quality is good. Enjoy your usual outdoor activities.",
    sensitive: "The air quality is good. Enjoy your usual outdoor activities.",
  },
  {
    label: "Fair",
    emoji: "🟡",
    general: "Enjoy your usual outdoor activities.",
    sensitive: "Enjoy your usual outdoor activities.",
  },
  {
    label: "Moderate",
    emoji: "🟠",
    general: "Enjoy your usual outdoor activities.",
    sensitive: "Consider reducing intense outdoor activities if you experience symptoms.",
  },
  {
    label: "Poor",
    emoji: "🔴",
    general: "Consider reducing intense outdoor activities if you experience symptoms.",
    sensitive: "Consider reducing physical activities outdoors, especially if you experience symptoms.",
  },
  {
    label: "Very Poor",
    emoji: "🟣",
    general: "Consider reducing intense outdoor activities if you experience symptoms.",
    sensitive: "Reduce physical activities outdoors, especially if you experience symptoms.",
  },
  {
    label: "Extremely Poor",
    emoji: "☠️",
    general: "Reduce physical activities outdoors.",
    sensitive: "Avoid physical activities outdoors.",
  },
];

const THRESHOLDS = {
  pm25: [5, 15, 50, 90, 140],
  pm10: [15, 45, 120, 195, 270],
  o3: [60, 100, 120, 160, 180],
  no2: [10, 25, 60, 100, 150],
  so2: [20, 40, 125, 190, 275],
};

function toNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function bandIndexFromValue(value: number | null, thresholds: number[]): number | null {
  if (value === null) return null;
  for (let i = 0; i < thresholds.length; i += 1) {
    if (value <= thresholds[i]) return i + 1;
  }
  return thresholds.length + 1;
}

function pickClosestEntry(entries: Array<[string, EeaEntry]>): [string, EeaEntry] {
  const now = Date.now();
  let best = entries[0];
  let bestDiff = Number.POSITIVE_INFINITY;
  for (const entry of entries) {
    const timeMs = Date.parse(entry[0]);
    if (!Number.isFinite(timeMs)) continue;
    const diff = Math.abs(timeMs - now);
    if (diff < bestDiff) {
      bestDiff = diff;
      best = entry;
    }
  }
  return best;
}

export async function fetchEeaModelledInfo(latitude: number, longitude: number): Promise<EeaModelledInfo> {
  const url = new URL(EEA_URL);
  url.searchParams.set("lat", latitude.toString());
  url.searchParams.set("lon", longitude.toString());

  const result = await fetchJson<EeaResponse>(url.toString());
  const entries = Object.entries(result);
  if (entries.length === 0) {
    throw new Error("EEA data unavailable.");
  }

  const [timeIso, entry] = pickClosestEntry(entries);
  const aqi = toNumber(entry.aqi);
  if (aqi === null) {
    throw new Error("EEA data unavailable.");
  }

  const valNo2 = toNumber(entry.val_NO2);
  const valPm10 = toNumber(entry.val_PM10);
  const valPm25 = toNumber(entry.val_PM25);
  const valO3 = toNumber(entry.val_O3);

  const bandCandidates = [
    bandIndexFromValue(valPm25, THRESHOLDS.pm25),
    bandIndexFromValue(valPm10, THRESHOLDS.pm10),
    bandIndexFromValue(valO3, THRESHOLDS.o3),
    bandIndexFromValue(valNo2, THRESHOLDS.no2),
  ];
  const computedBand = Math.max(1, ...bandCandidates.filter((value): value is number => value !== null));
  const bandIndex = Number.isFinite(computedBand) ? computedBand : Math.min(6, Math.max(1, Math.round(aqi)));
  const band = EEA_BANDS[Math.min(EEA_BANDS.length - 1, Math.max(0, bandIndex - 1))];

  return {
    timeIso,
    aqi,
    aqiNo2: toNumber(entry.aqi_NO2),
    aqiPm10: toNumber(entry.aqi_PM10),
    aqiPm25: toNumber(entry.aqi_PM25),
    aqiO3: toNumber(entry.aqi_O3),
    culprit: entry.culprit ?? null,
    valNo2,
    valPm10,
    valPm25,
    valO3,
    bandIndex,
    bandLabel: band.label,
    bandEmoji: band.emoji,
    generalMessage: band.general,
    sensitiveMessage: band.sensitive,
  };
}
