type TernBlock = { focused?: boolean; cwd?: string | null };
type TernTab = { shown?: boolean; blocks?: TernBlock[] };
type TernSession = { shown?: boolean; tabs?: TernTab[] };

/** The part of `tern ls --json` needed to find the focused block. */
export type TernSessionList = { sessions?: TernSession[] };

export function extractTernWorkingDirectory(sessionList: TernSessionList): string {
  // Every tab keeps its own focused block, so the shown session and tab decide which one is in front.
  const session = sessionList.sessions?.find((candidate) => candidate.shown);
  const tab = session?.tabs?.find((candidate) => candidate.shown);
  const cwd = tab?.blocks?.find((candidate) => candidate.focused)?.cwd;

  if (cwd?.trim()) {
    return cwd;
  }

  throw new Error("Tern did not report a focused block with a working directory");
}
