import { AI } from "@raycast/api";
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

async function generateLabel(prompt: string): Promise<string> {
  const result = await AI.ask(
    `用不超过10个字概括这个请求的核心目的，只输出概括不要任何其他内容：${prompt.slice(0, 200)}`,
    { model: AI.Model["Anthropic_Claude_4.5_Haiku"], creativity: "none" },
  );
  return result.trim().slice(0, 30);
}

export function useSessions(pollInterval: number = 3000) {
  const pendingLabels = useRef(new Set<string>());
  const labelsGeneratedRef = useRef(new Set<string>());

  const { data, isLoading, revalidate } = useCachedPromise(async () => {
    const hookSessions = readHookSessions();
    // Only load recent JSONL sessions for metadata enrichment
    const jsonlSessions = await listAllSessions({ limit: 50 });
    const merged = mergeSessions(hookSessions, jsonlSessions);

    const active = merged.filter((s) => s.state === "active");
    const waiting = merged.filter((s) => s.state === "waiting");
    const idle = merged.filter((s) => s.state === "idle");
    const ended = merged.filter((s) => s.state === "ended");

    return { all: merged, active, waiting, idle, ended };
  }, []);

  // Generate labels for sessions that have first_prompt but no label
  useEffect(() => {
    if (!data?.all) return;
    const sessions = data.all.filter(
      (s) =>
        s.first_prompt &&
        !s.label &&
        !pendingLabels.current.has(s.session_id) &&
        !labelsGeneratedRef.current.has(s.session_id),
    );
    if (sessions.length === 0) return;

    // Process up to 3 at a time to avoid overwhelming the AI API
    const batch = sessions.slice(0, 3);
    for (const session of batch) {
      pendingLabels.current.add(session.session_id);
    }
    (async () => {
      for (const session of batch) {
        try {
          if (labelsGeneratedRef.current.has(session.session_id)) continue;
          const label = await generateLabel(session.first_prompt!);
          if (label) {
            updateSessionLabel(session.session_id, label);
            labelsGeneratedRef.current.add(session.session_id);
          }
        } catch {
          // Label generation failed, will retry on next cycle
        } finally {
          pendingLabels.current.delete(session.session_id);
        }
      }
    })();
  }, [data?.all]);

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
