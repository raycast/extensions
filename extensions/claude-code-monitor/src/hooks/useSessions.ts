import { useCachedPromise } from "@raycast/utils";
import { useEffect, useRef } from "react";
import { readHookSessions, updateSessionLabel } from "../lib/hook-state";
import { listAllSessions } from "../lib/session-parser";
import { Session, HookSession, SessionMetadata } from "../types";

/**
 * Merge hook state (real-time status) with JSONL metadata (cost, summary, etc.)
 */
function mergeSessions(
  hookSessions: HookSession[],
  jsonlSessions: SessionMetadata[],
): Session[] {
  // Build lookup by session ID from JSONL
  const jsonlById = new Map<string, SessionMetadata>();
  for (const s of jsonlSessions) {
    jsonlById.set(s.id, s);
  }

  return hookSessions.map((hook) => {
    // Try to find matching JSONL session
    const jsonl = jsonlById.get(hook.session_id);

    return {
      session_id: hook.session_id,
      cwd: hook.cwd,
      project_name: hook.project_name,
      state: hook.state,
      started_at: hook.started_at,
      last_updated_at: hook.last_updated_at,
      ended_at: hook.ended_at,
      last_event: hook.last_event,
      transcript_path: hook.transcript_path,
      term_program: hook.term_program,
      label: hook.label,
      first_prompt: hook.first_prompt,
      is_worktree: hook.is_worktree,
      worktree_name: hook.worktree_name,
      // Merge JSONL metadata if found
      summary: jsonl?.summary,
      firstMessage: jsonl?.firstMessage,
      turnCount: jsonl?.turnCount,
      cost: jsonl?.cost,
      model: jsonl?.model,
      gitBranch: jsonl?.gitBranch,
    };
  });
}

function truncateLabel(prompt: string): string {
  const cleaned = prompt.replace(/\s+/g, " ").trim();
  if (cleaned.length <= 30) return cleaned;
  return cleaned.slice(0, 27) + "...";
}

export function useSessions(pollInterval: number = 3000) {
  const knownSessionIds = useRef(new Set<string>());

  const { data, isLoading, revalidate } = useCachedPromise(async () => {
    const hookSessions = readHookSessions();
    // Only load recent JSONL sessions for metadata enrichment
    const jsonlSessions = await listAllSessions({ limit: 50 });
    const merged = mergeSessions(hookSessions, jsonlSessions);

    // Generate labels for newly discovered sessions using prompt truncation
    for (const session of merged) {
      if (knownSessionIds.current.has(session.session_id)) continue;
      knownSessionIds.current.add(session.session_id);

      if (session.first_prompt && !session.label) {
        const label = truncateLabel(session.first_prompt);
        if (label) {
          updateSessionLabel(session.session_id, label);
        }
      }
    }

    const active = merged.filter((s) => s.state === "active");
    const waiting = merged.filter((s) => s.state === "waiting");
    const idle = merged.filter((s) => s.state === "idle");
    const ended = merged.filter((s) => s.state === "ended");

    return { all: merged, active, waiting, idle, ended };
  }, []);

  // Poll for updates
  useEffect(() => {
    const timer = setInterval(revalidate, pollInterval);
    return () => clearInterval(timer);
  }, [revalidate, pollInterval]);

  return {
    sessions: data?.all ?? [],
    activeSessions: data?.active ?? [],
    waitingSessions: data?.waiting ?? [],
    idleSessions: data?.idle ?? [],
    endedSessions: data?.ended ?? [],
    isLoading,
    revalidate,
  };
}
