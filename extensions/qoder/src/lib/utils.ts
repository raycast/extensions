import * as afs from "fs/promises";

export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

export async function fileExists(filename: string): Promise<boolean> {
  try {
    await afs.access(filename);
    return true;
  } catch {
    return false;
  }
}

export function compactNumberFormat(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + "M";
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + "K";
  }
  return num.toString();
}
