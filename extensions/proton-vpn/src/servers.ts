import { execFile } from "node:child_process";
import { homedir } from "node:os";
import { promisify } from "node:util";
import { exportPrefsXml, getIdentity, getUserLocation } from "./prefs";

const exec = promisify(execFile);

const SQLITE = "/usr/bin/sqlite3";
const DB_PATH = `${homedir()}/Library/Containers/ch.protonvpn.mac/Data/Library/Application Support/database.sqlite`;

export interface CountryInfo {
  code: string;
  name: string;
  flag: string;
  serverCount: number;
  cityCount: number;
  avgLoad: number;
  latitude: number;
  longitude: number;
  distanceKm?: number;
}

async function query<T>(sql: string): Promise<T[]> {
  const { stdout } = await exec(SQLITE, ["-readonly", "-json", DB_PATH, sql], {
    maxBuffer: 32 * 1024 * 1024,
  });
  const text = stdout.trim();
  return text ? (JSON.parse(text) as T[]) : [];
}

export function flagEmoji(code: string): string {
  if (!/^[A-Za-z]{2}$/.test(code)) return "🏳️";
  return String.fromCodePoint(
    ...[...code.toUpperCase()].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65),
  );
}

export function countryName(code: string): string {
  try {
    return (
      new Intl.DisplayNames(["en"], { type: "region" }).of(
        code.toUpperCase(),
      ) ?? code
    );
  } catch {
    return code;
  }
}

function haversineKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const rad = Math.PI / 180;
  const dLat = (lat2 - lat1) * rad;
  const dLon = (lon2 - lon1) * rad;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(dLon / 2) ** 2;
  return Math.round(6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

/**
 * List countries with standard servers available to the user's tier,
 * sorted by distance from the user's current location when known.
 */
export async function listCountries(): Promise<CountryInfo[]> {
  const prefs = await exportPrefsXml();
  const tier = (await getIdentity(prefs)).tier;
  const homeCountry = getUserLocation(prefs)?.country;

  interface Row {
    code: string;
    serverCount: number;
    cityCount: number;
    avgLoad: number;
    latitude: number;
    longitude: number;
  }

  // feature bit 1 = Secure Core; gateway servers are dedicated-IP gateways
  const rows = await query<Row>(`
    SELECT l.exitCountryCode AS code,
           COUNT(*) AS serverCount,
           COUNT(DISTINCT l.city) AS cityCount,
           CAST(ROUND(AVG(COALESCE(s.load, 0))) AS INTEGER) AS avgLoad,
           AVG(l.latitude) AS latitude,
           AVG(l.longitude) AS longitude
    FROM logical l
    LEFT JOIN logicalStatus s ON s.logicalId = l.id
    WHERE l.tier <= ${Number(tier)}
      AND (l.feature & 1) = 0
      AND l.gatewayName IS NULL
      AND COALESCE(s.status, 1) = 1
    GROUP BY l.exitCountryCode
    ORDER BY l.exitCountryCode;
  `);

  const home = homeCountry
    ? rows.find((r) => r.code === homeCountry)
    : undefined;

  const countries = rows.map((r) => ({
    code: r.code,
    name: countryName(r.code),
    flag: flagEmoji(r.code),
    serverCount: r.serverCount,
    cityCount: r.cityCount,
    avgLoad: r.avgLoad,
    latitude: r.latitude,
    longitude: r.longitude,
    distanceKm: home
      ? haversineKm(home.latitude, home.longitude, r.latitude, r.longitude)
      : undefined,
  }));

  countries.sort((a, b) =>
    a.distanceKm !== undefined && b.distanceKm !== undefined
      ? a.distanceKm - b.distanceKm
      : a.name.localeCompare(b.name),
  );
  return countries;
}
