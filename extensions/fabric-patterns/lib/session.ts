// A fabric session file is a JSON array of {role, content}; role is meta,
// system, user or assistant (probed on fabric 1.4.518). The transcript shows the user and
// assistant turns; `meta` (fabric's own bookkeeping) is skipped (ISC-35).

export interface SessionMessage {
  role: string;
  content: string;
}

export function parseSession(raw: string): SessionMessage[] {
  const data = JSON.parse(raw) as unknown;
  if (!Array.isArray(data)) throw new Error("not a fabric session file");
  return data.filter(
    (m): m is SessionMessage =>
      !!m && typeof m === "object" && typeof m.role === "string" && typeof m.content === "string",
  );
}

export function renderTranscript(msgs: SessionMessage[]): string {
  const turns = msgs.filter((m) => m.role === "user" || m.role === "assistant");
  if (!turns.length) return "_No messages yet._";
  return turns.map((m) => `### ${m.role === "user" ? "You" : "Answer"}\n\n${m.content.trim()}`).join("\n\n---\n\n");
}

export function lastAnswer(msgs: SessionMessage[]): string | undefined {
  return [...msgs].reverse().find((m) => m.role === "assistant")?.content;
}

export function messageCount(msgs: SessionMessage[]): { turns: number; system: boolean } {
  return {
    turns: msgs.filter((m) => m.role === "user" || m.role === "assistant").length,
    system: msgs.some((m) => m.role === "system"),
  };
}
