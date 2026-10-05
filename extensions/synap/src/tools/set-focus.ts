import { getWorkspaces, requireAgentConnection } from "../api/client";
import { getFocus, setFocus, clearFocus } from "../utils/focus";

type Input = {
  /** Workspace name or id to focus on. Omit, or pass "clear"/"none", to clear focus and go pod-wide. */
  workspace?: string;
};

const CLEAR_WORDS = new Set(["", "clear", "none", "pod-wide", "podwide"]);

/**
 * Set or clear the sticky workspace focus that Raycast shows everywhere
 * (menu bar, command subtitles, and here). Focus is explicit and visible —
 * never set this without the user naming or picking a workspace.
 */
export default async function tool(input: Input) {
  await requireAgentConnection();

  const requested = input.workspace?.trim() ?? "";
  if (CLEAR_WORDS.has(requested.toLowerCase())) {
    await clearFocus();
    return { status: "cleared" as const, message: "Focus cleared — back to pod-wide." };
  }

  const workspaces = await getWorkspaces();

  const byId = workspaces.find((w) => w.id === requested);
  const byExactName = workspaces.filter((w) => w.name.toLowerCase() === requested.toLowerCase());
  const bySubstring = workspaces.filter((w) => w.name.toLowerCase().includes(requested.toLowerCase()));

  const match =
    byId ??
    (byExactName.length === 1 ? byExactName[0] : undefined) ??
    (bySubstring.length === 1 ? bySubstring[0] : undefined);

  if (!match) {
    const candidates = (byExactName.length > 1 ? byExactName : bySubstring).map((w) => w.name);
    return {
      status: "error" as const,
      message: candidates.length
        ? `Ambiguous workspace "${requested}" — candidates: ${candidates.join(", ")}. Ask the user which one, don't guess.`
        : `No workspace matches "${requested}". Available: ${workspaces.map((w) => w.name).join(", ") || "(none)"}.`,
      candidates,
    };
  }

  const previous = await getFocus();
  await setFocus({ workspaceId: match.id, name: match.name });

  return {
    status: "focused" as const,
    workspaceId: match.id,
    name: match.name,
    previousFocus: previous,
    message: `Focused on ${match.name} — new creates/captures default here until cleared.`,
  };
}
