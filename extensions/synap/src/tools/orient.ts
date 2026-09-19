import { orient } from "../api/client";
import { getFocus } from "../utils/focus";

type Input = {
  /** Optional workspace lens. Omit to see the live pod-level map first. */
  workspaceId?: string;
  /** Optional project lens when the user explicitly names a project. */
  projectId?: string;
  /** Use `full` only when names and profile summaries are needed; otherwise leave empty for the compact live map. */
  detail?: "light" | "full";
  /** Optional comma-separated sections: workspaces, projects, profiles. */
  scope?: string;
};

const ORIENT_SCOPES = new Set(["workspaces", "projects", "profiles"]);

function parseScope(value: string | undefined): Array<"workspaces" | "projects" | "profiles"> | undefined {
  if (!value?.trim()) return undefined;

  const scope = value
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
  const invalid = scope.filter((entry) => !ORIENT_SCOPES.has(entry));
  if (invalid.length > 0) {
    throw new Error(`scope contains unsupported section(s): ${invalid.join(", ")}.`);
  }
  return scope as Array<"workspaces" | "projects" | "profiles">;
}

/**
 * Start a Synap session from the canonical live lens. This is intentionally a
 * compact map, not a schema dump; call discover only for the selected profile.
 */
export default async function tool(input: Input) {
  const result = await orient({
    workspaceId: input.workspaceId,
    projectId: input.projectId,
    detail: input.detail,
    scope: parseScope(input.scope),
  });

  // Focus is explicit + sticky (set via "Set Synap Focus" or the set-focus
  // tool) and must never be applied silently — echo it here so the AI sees
  // it rather than being scoped behind its back. Additive only: does not
  // change orient's own scoping.
  const activeFocus = await getFocus();

  return { ...result, activeFocus };
}
