import * as fs from "fs/promises";
import * as fsSync from "fs";
import { constants } from "fs";

export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    const msg = error.message;
    if (msg.startsWith("Error: ")) {
      const [_, m] = msg.split("Error: ");
      return m;
    }
    return msg;
  }
  return "Unknown Error";
}

export function capitalizeFirstLetter(name: string): string {
  return name.replace(/^./, name[0].toUpperCase());
}

export function capitalizeFirstLetterAndRest(name: string | undefined | null): string | null | undefined {
  if (name) {
    return capitalizeFirstLetter(name.toLowerCase());
  }
  return name;
}

export function currentSeconds(): number {
  return Date.now() / 1000;
}

export function daysInSeconds(days: number): number {
  return days * 24 * 60 * 60;
}

export async function fileExists(filename: string): Promise<boolean> {
  return fs
    .access(filename, constants.F_OK | constants.W_OK | constants.R_OK)
    .then(() => true)
    .catch(() => false);
}

export function fileExistsSync(filename: string): boolean {
  try {
    fsSync.accessSync(filename, constants.F_OK);
    return true;
  } catch (e) {
    return false;
  }
}
