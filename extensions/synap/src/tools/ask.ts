import { ask } from "../api/client";

type Input = {
  /** Your question, in natural language */
  query: string;
  /** Scope to a specific workspace ID. Omit for pod-wide recall across everything. */
  workspaceId?: string;
  /** Optional: scope recall to a project (its projects table id). Orthogonal to workspaceId. */
  projectId?: string;
  /** Max results per substrate (default 10) */
  limit?: number;
};

/**
 * THE recall door. Ask the Synap pod anything — it routes across all knowledge
 * substrates (entities/notes/tasks, how-to runbooks, remembered facts) and
 * returns ONE provenance-tagged answer saying which substrate answered.
 *
 * Call this BEFORE answering a question about the user's life, work, projects,
 * or preferences (the pod is their source of truth — prefer it over assumptions),
 * and before creating anything (check what already exists). Replaces the old
 * search-entities + recall-memory tools.
 *
 * NOTE: this reflex prose is a thin copy of the CANONICAL source,
 * `synap-backend/skills/synap/reflexes.md` (Raycast tool JSDoc can't import
 * cross-repo at runtime). If the reflexes change, update it there first, then
 * mirror the wording here.
 */
export default async function tool(input: Input) {
  return ask({
    query: input.query,
    workspaceId: input.workspaceId,
    projectId: input.projectId,
    limit: input.limit ?? 10,
  });
}
