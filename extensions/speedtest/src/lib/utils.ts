import sha256 from "sha256-file";
import { ResultViewIconsListKeys, icons, speedTestResultPrettyNames } from "./speedtest-pretty-names";
import { SpeedtestResultKeys, SpeedtestResultValueType } from "./speedtest.types";

export function pingToString(ping: number): string {
  return ping === 0 ? "?" : ping.toFixed(1) + " ms";
}

export function speedToString(speed: number | undefined): string {
  if (speed === undefined || speed === 0) {
    return "?";
  }
  let bits = speed * 8;
  const units = ["", "K", "M", "G", "T"];
  const places = [0, 1, 2, 3, 3];
  let unit = 0;
  while (bits >= 2000 && unit < 4) {
    unit++;
    bits /= 1000;
  }
  return `${bits.toFixed(places[unit])} ${units[unit]}bps`;
}

export async function sha256FileHash(filename: string): Promise<string | null> {
  return new Promise((resolve, reject) => {
    sha256(filename, (error: Error | null, sum: string | null) => {
      if (error) {
        reject(error);
      } else {
        resolve(sum);
      }
    });
  });
}

export function percentageToString(val: number | undefined): string | undefined {
  if (val === undefined) {
    return undefined;
  }
  const v = Math.round(val * 100);
  if (v === 100) {
    return undefined;
  }
  return `${v}%`;
}

export const isObject = (value: unknown): value is object => {
  const type = typeof value;
  return value != null && (type == "object" || type == "function");
};

export const getPrettyName = (key: SpeedtestResultKeys) => {
  return speedTestResultPrettyNames[key];
};

export const getPrettyValue = (value: SpeedtestResultValueType): string => {
  if (value === undefined) {
    return "";
  }

  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
  }
  return value.toString();
};

export const isResultViewIconsListKey = (k: string): k is ResultViewIconsListKeys => {
  return k in icons;
};
