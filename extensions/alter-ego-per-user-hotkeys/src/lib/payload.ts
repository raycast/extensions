import { AlterEgoMap, AlterEgoPayload, TARGET_TYPES, Target } from "./types";

export type DecodeResult = { ok: true; payload: AlterEgoPayload } | { ok: false; reason: string };

const BASE64URL_RE = /^[A-Za-z0-9_-]+$/;

export function encodePayload(payload: AlterEgoPayload): string {
  return Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
}

export function decodePayload(raw: string): DecodeResult {
  if (typeof raw !== "string" || raw.length === 0 || !BASE64URL_RE.test(raw) || raw.length % 4 === 1) {
    return { ok: false, reason: "invalid-base64" };
  }

  const json = Buffer.from(raw, "base64url").toString("utf8");

  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    return { ok: false, reason: "invalid-json" };
  }

  const payload = validatePayload(parsed);
  if (!payload) {
    return { ok: false, reason: "invalid-shape" };
  }

  return { ok: true, payload };
}

function validatePayload(value: unknown): AlterEgoPayload | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return null;
  }

  const candidate = value as Record<string, unknown>;
  if (typeof candidate.name !== "string" || candidate.name.trim().length === 0) {
    return null;
  }

  const map = validateMap(candidate.map);
  if (!map) {
    return null;
  }

  return { name: candidate.name, map };
}

function validateMap(value: unknown): AlterEgoMap | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return null;
  }

  const map: AlterEgoMap = {};
  for (const [username, target] of Object.entries(value as Record<string, unknown>)) {
    if (!username) return null;
    if (!isValidTarget(target)) return null;
    map[username] = target;
  }

  return map;
}

function isValidTarget(value: unknown): value is Target {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.type === "string" &&
    (TARGET_TYPES as readonly string[]).includes(candidate.type) &&
    typeof candidate.value === "string" &&
    candidate.value.length > 0
  );
}
