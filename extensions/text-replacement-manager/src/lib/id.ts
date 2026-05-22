import { randomUUID } from "node:crypto";

export function createReplacementId(): string {
  return randomUUID();
}
