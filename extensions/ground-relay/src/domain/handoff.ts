import { createHash } from "node:crypto";
import { groundRecord, splatRecord } from "./validation-common";
export interface Handoff {
  format: "context-handoff.v1";
  sender: "ground-relay" | "lawful-splat";
  id: string;
  rootId: string;
  version: number;
  sha256: string;
  recordJson: string;
}
export function makeHandoff(
  sender: Handoff["sender"],
  record: unknown,
): Handoff {
  const valid = sender === "ground-relay" ? groundRecord : splatRecord;
  if (!valid(record)) throw new Error("Cannot hand off an invalid record.");
  const r = record as { id: string; rootId: string; version: number };
  const recordJson = JSON.stringify(record);
  return {
    format: "context-handoff.v1",
    sender,
    id: r.id,
    rootId: r.rootId,
    version: r.version,
    sha256: createHash("sha256").update(recordJson).digest("hex"),
    recordJson,
  };
}
export function readHandoff(
  value: unknown,
  expected: Handoff["sender"],
): Handoff {
  if (!value || typeof value !== "object")
    throw new Error(
      "Missing structured handoff. Open the paired extension's Send action.",
    );
  const h = value as Handoff;
  if (
    h.format !== "context-handoff.v1" ||
    h.sender !== expected ||
    typeof h.recordJson !== "string"
  )
    throw new Error("Unsupported handoff format or source.");
  const verified = makeHandoff(expected, JSON.parse(h.recordJson));
  if (
    verified.id !== h.id ||
    verified.rootId !== h.rootId ||
    verified.version !== h.version ||
    verified.sha256 !== h.sha256
  )
    throw new Error(
      "Handoff identity or digest does not match its source snapshot.",
    );
  return verified;
}
