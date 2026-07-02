import { listRecordedCalls } from "../lib/tuple";

type Input = {
  /** Maximum number of recent calls to return. Defaults to 10. */
  limit?: number;
  /** Only include calls with a participant whose name or email contains this text. */
  participant?: string;
};

/** List recent recorded Tuple calls (most recent first), optionally filtered by participant. */
export default async function (input: Input) {
  const calls = await listRecordedCalls();
  const needle = input.participant?.toLowerCase();

  return calls
    .filter(
      (call) =>
        !needle ||
        call.participants.some(
          (p) => p.full_name.toLowerCase().includes(needle) || p.email.toLowerCase().includes(needle),
        ),
    )
    .sort((a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime())
    .slice(0, input.limit ?? 10)
    .map((call) => ({
      callId: call.call_id,
      title: call.title,
      summary: call.summary,
      startedAt: call.started_at,
      endedAt: call.ended_at,
      participants: call.participants.map((p) => p.full_name),
      segments: call.segments,
    }));
}
