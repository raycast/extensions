import { setTimeout } from "timers/promises";

export function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "unknown error";
}

export function getFirstValidLetter(text: string | null | undefined, fallback?: string) {
  if (!text) {
    return;
  }
  for (const c of text) {
    if (c.match(/[a-zA-Z0-9]/)) {
      return c;
    }
  }
  return fallback;
}

export async function sleep(delayMs: number) {
  await setTimeout(delayMs);
}
