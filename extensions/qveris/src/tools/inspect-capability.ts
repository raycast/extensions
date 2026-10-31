import { randomUUID } from "node:crypto";
import { inspectCapabilities } from "../lib/api";

type Input = {
  /** Exact capability ID returned by Discover. */
  toolId: string;
  /** The search ID returned by the Discover call that produced this capability ID. */
  searchId?: string;
};

/**
 * Inspect the current schema, examples, reliability, and pricing metadata for a QVeris capability. Inspection is free.
 */
export default async function inspect(input: Input) {
  return inspectCapabilities({ toolIds: [input.toolId], searchId: input.searchId, sessionId: randomUUID() });
}
