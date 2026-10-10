import { createHash } from "node:crypto";
import { request } from "./client";
import { pausedInteraction } from "./execution";

interface PausedDetails {
  text: string;
  structured: unknown;
}

function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value) ?? "null";
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  const object = value as Record<string, unknown>;
  return `{${Object.keys(object)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${canonicalJson(object[key])}`)
    .join(",")}}`;
}

export function pauseFingerprint(interaction: Record<string, unknown>): string {
  return createHash("sha256").update(canonicalJson(interaction)).digest("hex");
}

export async function readPaused(executionId: string) {
  const exactId = executionId.trim();
  if (!exactId) throw new Error("Execution ID is required.");
  const detail = await request<PausedDetails>(`/api/executions/${encodeURIComponent(exactId)}`);
  const paused = pausedInteraction({ status: "paused", text: detail.text, structured: detail.structured });
  if (!paused || paused.executionId !== exactId) {
    throw new Error("Executor did not return matching server-stored terms for this paused execution.");
  }
  return { detail, interaction: paused.interaction, fingerprint: pauseFingerprint(paused.interaction) };
}
