import { randomUUID } from "node:crypto";
import { discoverCapabilities } from "../lib/api";

type Input = {
  /** Describe the general capability needed, not the final tool parameters. */
  query: string;
  /** Maximum results to return, from 1 to 20. */
  limit?: number;
  /** Response language. */
  language?: "en" | "zh";
};

/**
 * Find ranked QVeris capabilities for a task. Discovery is free. Use the returned tool_id and search_id exactly in later calls.
 */
export default async function discover(input: Input) {
  const limit = Math.max(1, Math.min(20, Math.trunc(input.limit ?? 10)));
  return discoverCapabilities({ query: input.query, limit, language: input.language, sessionId: randomUUID() });
}
