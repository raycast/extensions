import { getPreferenceValues } from "@raycast/api";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const pExecFile = promisify(execFile);

export type Coords = {
  lat: number;
  lon: number;
  source: "preference" | "corelocation";
};

export class LocationUnavailableError extends Error {
  reason: "not_installed" | "gps_failed";
  constructor(reason: "not_installed" | "gps_failed", detail?: string) {
    super(
      reason === "not_installed"
        ? "CoreLocationCLI is not installed"
        : (detail ?? "GPS unavailable"),
    );
    this.name = "LocationUnavailableError";
    this.reason = reason;
  }
}

const CORELOCATION_PATHS = [
  "/opt/homebrew/bin/CoreLocationCLI",
  "/usr/local/bin/CoreLocationCLI",
];

type CliResult = { coords?: Coords; error?: string; installed: boolean };

async function tryCoreLocation(): Promise<CliResult> {
  let installed = false;
  let lastError: string | undefined;
  for (const bin of CORELOCATION_PATHS) {
    try {
      const { stdout, stderr } = await pExecFile(
        bin,
        ["-once", "true", "-format", "%latitude %longitude"],
        {
          timeout: 8000,
        },
      );
      installed = true;
      const out = (stdout || stderr || "").trim();
      const [latStr, lonStr] = out.split(/\s+/);
      const lat = parseFloat(latStr);
      const lon = parseFloat(lonStr);
      if (Number.isFinite(lat) && Number.isFinite(lon)) {
        return {
          coords: { lat, lon, source: "corelocation" },
          installed: true,
        };
      }
      lastError = out || "CoreLocationCLI returned no coordinates";
    } catch (e) {
      const err = e as NodeJS.ErrnoException & {
        stderr?: string;
        stdout?: string;
      };
      if (err.code === "ENOENT") continue;
      installed = true;
      lastError = (err.stderr || err.stdout || err.message || "")
        .toString()
        .trim();
    }
  }
  return { installed, error: lastError };
}

export async function getCoords(): Promise<Coords> {
  const prefs = getPreferenceValues<Preferences>();
  const lat = prefs.lat ? parseFloat(prefs.lat) : NaN;
  const lon = prefs.lon ? parseFloat(prefs.lon) : NaN;
  if (Number.isFinite(lat) && Number.isFinite(lon)) {
    return { lat, lon, source: "preference" };
  }

  const gps = await tryCoreLocation();
  if (gps.coords) return gps.coords;

  throw new LocationUnavailableError(
    gps.installed ? "gps_failed" : "not_installed",
    gps.error,
  );
}
