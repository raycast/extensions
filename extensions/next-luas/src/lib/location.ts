import { getPreferenceValues } from "@raycast/api";
import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { promisify } from "node:util";
import type { Coords, ResolvedLocation } from "../types";

const execFileP = promisify(execFile);

const CORE_LOCATION_PATHS = ["/opt/homebrew/bin/CoreLocationCLI", "/usr/local/bin/CoreLocationCLI"];

interface Prefs {
  manualLat?: string;
  manualLng?: string;
}

interface CacheEntry {
  at: number;
  resolved: ResolvedLocation;
}

const CACHE_TTL_MS = 60_000;
let cache: CacheEntry | null = null;

export function clearLocationCache(): void {
  cache = null;
}

export async function resolveLocation(options?: { force?: boolean }): Promise<ResolvedLocation> {
  if (!options?.force && cache && Date.now() - cache.at < CACHE_TTL_MS) {
    return cache.resolved;
  }

  const manual = readManualCoords();
  if (manual) {
    const resolved: ResolvedLocation = { coords: manual, source: "manual" };
    cache = { at: Date.now(), resolved };
    return resolved;
  }

  const coreLocationBinary = findCoreLocationBinary();
  if (coreLocationBinary) {
    try {
      const coords = await runCoreLocation(coreLocationBinary);
      const resolved: ResolvedLocation = { coords, source: "corelocation" };
      cache = { at: Date.now(), resolved };
      return resolved;
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err);
      const ipCoords = await fetchIpCoords();
      const resolved: ResolvedLocation = {
        coords: ipCoords,
        source: "ip",
        warning: permissionWarning(reason),
      };
      cache = { at: Date.now(), resolved };
      return resolved;
    }
  }

  const ipCoords = await fetchIpCoords();
  const resolved: ResolvedLocation = {
    coords: ipCoords,
    source: "ip",
    warning:
      "CoreLocationCLI not found. Run `brew install corelocationcli` for precise location. Using IP-based fallback.",
  };
  cache = { at: Date.now(), resolved };
  return resolved;
}

function readManualCoords(): Coords | null {
  const prefs = getPreferenceValues<Prefs>();
  const lat = parseFloat((prefs.manualLat ?? "").trim());
  const lng = parseFloat((prefs.manualLng ?? "").trim());
  if (Number.isFinite(lat) && Number.isFinite(lng)) return { lat, lng };
  return null;
}

function findCoreLocationBinary(): string | null {
  for (const p of CORE_LOCATION_PATHS) {
    if (existsSync(p)) return p;
  }
  return null;
}

async function runCoreLocation(binary: string): Promise<Coords> {
  const { stdout } = await execFileP(binary, ["-once", "-format", "%latitude %longitude"], {
    timeout: 3000,
  });
  const [latStr, lngStr] = stdout.trim().split(/\s+/);
  const lat = Number(latStr);
  const lng = Number(lngStr);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    throw new Error(`CoreLocationCLI returned bad coords: "${stdout.trim()}"`);
  }
  return { lat, lng };
}

function permissionWarning(reason: string): string {
  const lc = reason.toLowerCase();
  if (lc.includes("denied") || lc.includes("not authorized") || lc.includes("kclerror")) {
    return "Location permission denied. Enable in System Settings › Privacy & Security › Location Services, or set manual coords in extension preferences.";
  }
  if (lc.includes("timeout") || lc.includes("timed out")) {
    return "CoreLocationCLI timed out. Using IP-based fallback. Try again, or set manual coords.";
  }
  return `CoreLocationCLI failed (${reason}). Using IP-based fallback.`;
}

async function fetchIpCoords(): Promise<Coords> {
  const res = await fetch("https://ipapi.co/json/", { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`ipapi ${res.status}`);
  const body = (await res.json()) as { latitude?: number; longitude?: number };
  const lat = Number(body.latitude);
  const lng = Number(body.longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) throw new Error("ipapi returned no coords");
  return { lat, lng };
}
