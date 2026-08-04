import { getClient } from "../lib/preferences";
import type { AskResponse } from "../lib/types";

type Input = {
  /** The question to answer from the vault's contents. */
  question: string;
  /** Restrict to one vault, by its slug or id (from a document's `vault` field). Omit to ask across every vault. */
  vault?: string;
};

/**
 * Ask a natural-language question across the whole vault and get a synthesized
 * answer with citations to source documents. Requires the vault:ask token scope.
 * Use get-document to read any cited document in full.
 */
export default async function tool(input: Input) {
  return getClient().request<AskResponse>("POST", "/ask", { query: { q: input.question, vault: input.vault } });
}
