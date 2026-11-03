import { Cache } from "@raycast/api";
import { randomUUID } from "node:crypto";
import { isRecord } from "../core/guards";
import type { RunInput, SessionContext } from "./input";

/** Holds only random IDs. Old ones drop out by age, so a few kilobytes are plenty. */
const LAUNCH_CACHE_BYTES = 4 * 1024;

let launches: Cache | undefined;

function launchCache(): Cache {
  // Created lazily so importing this module has no side effects.
  return (launches ??= new Cache({ namespace: "session-launches", capacity: LAUNCH_CACHE_BYTES }));
}

/**
 * Marks a launch as coming from this extension. Deeplinks can reach `prompt-session` from outside and carry any
 * context, and a context with input starts a paid run on its own. Only a process with access to this extension's cache
 * can issue an ID, so foreign links end up at the prompt list instead.
 */
export function issueLaunchId(): string {
  const id = randomUUID();
  launchCache().set(id, "1");
  return id;
}

function optionalString(value: unknown): value is string | undefined {
  return value === undefined || typeof value === "string";
}

function isStringRecord(value: unknown): value is Record<string, string> {
  return isRecord(value) && Object.values(value).every((entry) => typeof entry === "string");
}

function parseInput(raw: unknown): RunInput | undefined {
  if (!isRecord(raw)) return undefined;
  const { selection, clipboard, browserTab, sourceApp, notices } = raw;
  if (!optionalString(selection) || !optionalString(sourceApp)) return undefined;
  if (!isStringRecord(clipboard) || !isStringRecord(browserTab)) return undefined;
  if (!Array.isArray(notices) || !notices.every((notice) => typeof notice === "string")) return undefined;
  return { selection, clipboard, browserTab, sourceApp, notices: notices as string[] };
}

/** The context arrives through a deeplink-capable channel, so nothing about its shape can be taken for granted. */
export function parseSessionContext(raw: unknown): SessionContext | undefined {
  if (!isRecord(raw)) return undefined;
  const { launchId, promptId, args, forcePreview } = raw;
  if (typeof launchId !== "string" || typeof promptId !== "string") return undefined;
  if (args !== undefined && !isStringRecord(args)) return undefined;
  if (forcePreview !== undefined && typeof forcePreview !== "boolean") return undefined;
  const input = parseInput(raw.input);
  return input ? { launchId, promptId, input, args, forcePreview } : undefined;
}

/** Returns a usable context only for launches this extension issued itself. */
export function acceptSessionContext(raw: unknown): SessionContext | undefined {
  const context = parseSessionContext(raw);
  return context && launchCache().get(context.launchId) !== undefined ? context : undefined;
}
