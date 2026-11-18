import { access } from "fs/promises";
import { execFile } from "child_process";
import { environment } from "@raycast/api";
import path from "path";

export interface FanReading {
  index: number;
  actualRpm: number;
  minRpm: number;
  maxRpm: number;
}

export type FanStatus = "available" | "unsupported" | "missing_reader" | "reader_error";

export interface FanData {
  available: boolean;
  fans: FanReading[];
  status: FanStatus;
}

export function getFanStatusLabel(status: FanStatus): string {
  switch (status) {
    case "missing_reader":
      return "Fan reader not bundled";
    case "reader_error":
      return "Fan reader failed";
    case "unsupported":
      return "Not available on this Mac";
    default:
      return "Not available on this Mac";
  }
}

function isFanReading(value: unknown): value is FanReading {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const fan = value as Record<string, unknown>;
  return (
    typeof fan.index === "number" &&
    typeof fan.actualRpm === "number" &&
    typeof fan.minRpm === "number" &&
    typeof fan.maxRpm === "number"
  );
}

export function parseFanReaderOutput(stdout: string): FanData {
  try {
    const data = JSON.parse(stdout) as { fans?: unknown };
    const fans = Array.isArray(data.fans) ? data.fans.filter(isFanReading) : [];
    const available = fans.length > 0;
    return { available, fans, status: available ? "available" : "unsupported" };
  } catch {
    return { available: false, fans: [], status: "reader_error" };
  }
}

export const getFanData = async (): Promise<FanData> => {
  const binaryPath = path.join(environment.assetsPath, "smc-fan-reader");

  try {
    await access(binaryPath);
  } catch {
    return { available: false, fans: [], status: "missing_reader" };
  }

  return new Promise((resolve) => {
    execFile(binaryPath, { timeout: 5000 }, (error, stdout) => {
      if (error || !stdout.trim()) {
        resolve({ available: false, fans: [], status: "reader_error" });
        return;
      }

      resolve(parseFanReaderOutput(stdout.trim()));
    });
  });
};
