import { runTool } from "../tools";
import { toolContext, prefs } from "../calypso";

type Input = {
  /** What to look up in the private knowledge base. */
  query: string;
};

/**
 * Searches the private RAG — the one thing Raycast AI cannot get anywhere else.
 * Everything internal (project state, research notes, private docs) lives
 * here and appears nowhere on the public web.
 *
 * Fails loudly rather than silently: with no key configured the RAG returns a
 * 403 and the model would otherwise quietly answer from the open web, which
 * reads as "we have nothing on that" instead of "the credential is dead".
 */
export default async function searchKnowledge(input: Input): Promise<string> {
  const p = prefs();
  if (!p.ragApiKey?.trim()) {
    return "RAG API key is not configured in the Calypso extension preferences, so the private knowledge base was NOT searched. Say so explicitly rather than answering from the public web.";
  }
  return runTool("rag_search", JSON.stringify({ query: input.query }), toolContext(p));
}
