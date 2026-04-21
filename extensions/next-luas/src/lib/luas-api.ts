import { LocalStorage } from "@raycast/api";
import { XMLParser } from "fast-xml-parser";
import fallbackStops from "./stops-fallback.json";
import type { Forecast, LuasLine, Stop, Tram } from "../types";

const STOPS_URL = "https://luasforecasts.rpa.ie/xml/get.ashx?action=stops&encrypt=false";
const FORECAST_URL = (abv: string) =>
  `https://luasforecasts.rpa.ie/xml/get.ashx?action=forecast&stop=${encodeURIComponent(abv)}&encrypt=false`;

const STOPS_CACHE_KEY = "stops-cache-v1";
const STOPS_TTL_MS = 7 * 24 * 60 * 60 * 1000;

interface StopsCache {
  fetchedAt: number;
  stops: Stop[];
}

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "",
  parseAttributeValue: false,
  textNodeName: "#text",
});

export async function loadStops(): Promise<{ stops: Stop[]; source: "network" | "cache" | "fallback" }> {
  const cached = await LocalStorage.getItem<string>(STOPS_CACHE_KEY);
  if (cached) {
    try {
      const parsed = JSON.parse(cached) as StopsCache;
      if (Date.now() - parsed.fetchedAt < STOPS_TTL_MS && parsed.stops?.length > 0) {
        return { stops: parsed.stops, source: "cache" };
      }
    } catch {
      // ignore
    }
  }

  try {
    const fresh = await fetchStops();
    const payload: StopsCache = { fetchedAt: Date.now(), stops: fresh };
    await LocalStorage.setItem(STOPS_CACHE_KEY, JSON.stringify(payload));
    return { stops: fresh, source: "network" };
  } catch {
    if (cached) {
      try {
        const parsed = JSON.parse(cached) as StopsCache;
        if (parsed.stops?.length > 0) return { stops: parsed.stops, source: "cache" };
      } catch {
        // ignore
      }
    }
    return { stops: fallbackStops as Stop[], source: "fallback" };
  }
}

async function fetchStops(): Promise<Stop[]> {
  const res = await fetch(STOPS_URL, { headers: { Accept: "application/xml,text/xml,*/*" } });
  if (!res.ok) throw new Error(`stops ${res.status}`);
  const xml = await res.text();
  return parseStopsXml(xml);
}

function parseStopsXml(xml: string): Stop[] {
  const doc = parser.parse(xml);
  const lines = doc?.stops?.line;
  const linesArr = Array.isArray(lines) ? lines : lines ? [lines] : [];
  const out: Stop[] = [];
  for (const ln of linesArr) {
    const name: string = ln?.name ?? "";
    const line: LuasLine = name.includes("Red") ? "Red" : "Green";
    const stops = ln?.stop;
    const stopsArr = Array.isArray(stops) ? stops : stops ? [stops] : [];
    for (const s of stopsArr) {
      const lat = Number(s?.lat);
      const lng = Number(s?.long);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
      out.push({
        abv: String(s?.abrev ?? "").toUpperCase(),
        name: String(s?.["#text"] ?? s?.pronunciation ?? "").trim(),
        lat,
        lng,
        line,
        parkRide: s?.isParkRide === "1",
        cycleRide: s?.isCycleRide === "1",
      });
    }
  }
  return out;
}

export async function fetchForecast(stopAbv: string): Promise<Forecast> {
  const res = await fetch(FORECAST_URL(stopAbv), { headers: { Accept: "application/xml,text/xml,*/*" } });
  if (!res.ok) throw new Error(`forecast ${res.status}`);
  const xml = await res.text();
  return parseForecastXml(xml);
}

function parseForecastXml(xml: string): Forecast {
  const doc = parser.parse(xml);
  const info = doc?.stopInfo ?? {};
  const message = typeof info?.message === "string" ? info.message : (info?.message?.["#text"] ?? "");
  const directions = info?.direction;
  const dirs = Array.isArray(directions) ? directions : directions ? [directions] : [];

  let inbound: Tram[] = [];
  let outbound: Tram[] = [];

  for (const d of dirs) {
    const dirName: string = d?.name ?? "";
    const trams = parseTrams(d);
    if (dirName.toLowerCase() === "inbound") inbound = trams;
    else if (dirName.toLowerCase() === "outbound") outbound = trams;
  }

  return {
    stopName: String(info?.stop ?? ""),
    stopAbv: String(info?.stopAbv ?? ""),
    created: String(info?.created ?? ""),
    message: String(message ?? ""),
    inbound,
    outbound,
  };
}

function parseTrams(direction: unknown): Tram[] {
  const d = direction as { tram?: unknown } | undefined;
  const t = d?.tram;
  const arr = Array.isArray(t) ? t : t ? [t] : [];
  const out: Tram[] = [];
  for (const raw of arr) {
    const tram = raw as { dueMins?: string; destination?: string };
    const destination = String(tram?.destination ?? "").trim();
    const dueMins = String(tram?.dueMins ?? "").trim();
    if (!destination && !dueMins) continue;
    out.push({ dueMins, destination });
  }
  return out;
}

export function isNormalServiceMessage(msg: string): boolean {
  if (!msg) return true;
  const m = msg.toLowerCase();
  return m.includes("operating normally");
}
