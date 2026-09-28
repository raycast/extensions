import { open } from "node:fs/promises";
import { constants } from "node:fs";
import { createHash } from "node:crypto";
import { homedir } from "node:os";
import { join } from "node:path";
import type { ProviderSnapshot, ProviderState, UsageWindow } from "../core/types";

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Expected an object.");
  return value as Record<string, unknown>;
}

function label(value: unknown, field: string): string {
  if (
    typeof value !== "string" ||
    !value.trim() ||
    value.length > 100 ||
    [...value].some((character) => character.charCodeAt(0) < 32)
  ) {
    throw new Error(`Invalid ${field}; use 1–100 visible characters.`);
  }
  return value.trim();
}

function date(value: unknown, field: string): string {
  if (
    typeof value !== "string" ||
    !/^\d{4}-\d\d-\d\dT.*(?:Z|[+-]\d\d:\d\d)$/.test(value) ||
    !Number.isFinite(Date.parse(value))
  ) {
    throw new Error(`Invalid ${field}; use an ISO 8601 timestamp with a timezone.`);
  }
  return new Date(value).toISOString();
}

function parseWindow(value: unknown, index: number): UsageWindow {
  const input = record(value);
  if (
    typeof input.usedPercent !== "number" ||
    !Number.isFinite(input.usedPercent) ||
    input.usedPercent < 0 ||
    input.usedPercent > 100
  ) {
    throw new Error("usedPercent must be a number between 0 and 100.");
  }
  return {
    id: String(index),
    label: label(input.label, "window label"),
    usedPercent: input.usedPercent,
    ...(input.resetAt != null ? { resetAt: date(input.resetAt, "resetAt") } : {}),
  };
}

function parseProvider(value: unknown, now: number): ProviderSnapshot {
  const input = record(value);
  const name = label(input.name, "provider name");
  const identity = input.id == null ? name : label(input.id, "provider id");
  const updatedAt = date(input.updatedAt, "updatedAt");
  if (Date.parse(updatedAt) > now + 60_000) throw new Error("updatedAt cannot be in the future.");
  if (!Array.isArray(input.windows) || input.windows.length < 1 || input.windows.length > 20) {
    throw new Error("Each provider needs 1–20 quota windows.");
  }
  let dashboardUrl: string | undefined;
  if (input.dashboardUrl != null) {
    try {
      const url = new URL(String(input.dashboardUrl));
      if (url.protocol !== "https:" || url.username || url.password) throw new Error();
      dashboardUrl = url.href;
    } catch {
      throw new Error("dashboardUrl must be an HTTPS URL without credentials.");
    }
  }
  return {
    id: `custom-${createHash("sha256").update(identity).digest("hex").slice(0, 16)}`,
    name,
    ...(input.plan != null ? { plan: label(input.plan, "plan") } : {}),
    windows: input.windows.map(parseWindow),
    updatedAt,
    source: "Local JSON file",
    ...(dashboardUrl ? { dashboardUrl } : {}),
  };
}

export function parseCustomProviders(value: unknown, now = Date.now()): ProviderState[] {
  const input = record(value);
  if (input.version !== 1 || !Array.isArray(input.providers) || input.providers.length > 30) {
    throw new Error("Expected version: 1 and a providers array with at most 30 entries.");
  }
  const seen = new Set<string>();
  return input.providers.map((provider, index) => {
    try {
      const snapshot = parseProvider(provider, now);
      if (seen.has(snapshot.id))
        throw new Error("Duplicate provider name or id. Give each provider a unique id.");
      seen.add(snapshot.id);
      return { id: snapshot.id, name: snapshot.name, status: "ready", snapshot };
    } catch (error) {
      return {
        id: `custom-${index}`,
        name: `Custom provider ${index + 1}`,
        status: "error",
        error: (error as Error).message,
      };
    }
  });
}

export async function fetchCustomProviders(file: string): Promise<ProviderState[]> {
  const resolved = file.startsWith("~/") ? join(homedir(), file.slice(2)) : file;
  const handle = await open(resolved, constants.O_RDONLY | constants.O_NONBLOCK).catch(() => {
    throw new Error(
      "Cannot open the custom providers file. Choose a readable JSON file in Extension Settings.",
    );
  });
  try {
    const info = await handle.stat();
    if (!info.isFile() || info.size > 1_048_576)
      throw new Error("Custom providers must be a regular JSON file smaller than 1 MB.");
    // Bound the read even if a producer grows the file between stat and read.
    const buffer = Buffer.alloc(1_048_577);
    let bytesRead = 0;
    while (bytesRead < buffer.length) {
      const result = await handle.read(buffer, bytesRead, buffer.length - bytesRead, null);
      if (!result.bytesRead) break;
      bytesRead += result.bytesRead;
    }
    if (bytesRead > 1_048_576) throw new Error("Custom providers file exceeds 1 MB.");
    let value: unknown;
    try {
      value = JSON.parse(buffer.toString("utf8", 0, bytesRead));
    } catch {
      throw new Error("Custom providers file contains invalid JSON. See the README for the format.");
    }
    return parseCustomProviders(value);
  } finally {
    await handle.close();
  }
}
