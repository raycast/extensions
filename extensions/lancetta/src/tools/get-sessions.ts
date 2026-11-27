import { folderName, formatSpan, isStale, nowSeconds } from "../lib/snapshot";
import { agentOf, changedAt, loadWall, Session, sessionsIn, titleOf } from "../lib/sessions";

type Input = {
  /** Which sessions: "open" (working, or waiting on the user; the default) or "done" (finished with, latest first). */
  which?: string;
};

/**
 * The Claude Code and Codex sessions Lancetta's session wall holds: the ones working, the ones
 * waiting on the user (a question, an approval, a finished turn, a failure), and on request
 * the ones done. Read-only.
 */
export default async function tool(input: Input) {
  const which = (input.which ?? "open").toLowerCase();
  if (which !== "open" && which !== "done") {
    throw new Error(`"which" is "open" or "done", not "${input.which}".`);
  }
  const { notes, writtenAt } = await loadWall();
  const now = nowSeconds();
  // the wall is what Lancetta saw last; with the app quit, sessions may have moved on since
  const lancettaRunning = writtenAt === null ? null : !isStale(writtenAt, now);
  const describe = (note: Session) => {
    const changed = changedAt(note);
    return {
      name: titleOf(note),
      agent: agentOf(note),
      // the last folder only: the full path names the user's home and its layout
      folder: folderName(note.cwd) ?? null,
      status: note.status ?? "done",
      inThisStateFor: changed ? formatSpan(now - changed / 1000) : null,
      worked: note.worked !== null ? formatSpan(note.worked) : null,
    };
  };
  const freshness =
    lancettaRunning === false
      ? `Lancetta is not running: this is what it saw ${formatSpan(now - (writtenAt ?? now))} ago, and sessions may have moved on since.`
      : undefined;
  if (which === "done") return { lancettaRunning, freshness, done: sessionsIn(notes, "done", 20).map(describe) };
  return {
    lancettaRunning,
    freshness,
    waitingOnYou: sessionsIn(notes, "yourTurn").map(describe),
    working: sessionsIn(notes, "working").map(describe),
    note:
      notes.length === 0
        ? "Lancetta has no sessions on its wall: it has not seen a Claude Code or Codex session yet."
        : undefined,
  };
}
