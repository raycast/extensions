import { AI, Detail } from "@raycast/api";
import { useAI, usePromise } from "@raycast/utils";
import { useRef } from "react";

import { loadTranscript } from "../lib/storage";
import { Project, Session } from "../types";
import { buildTranscriptMarkdown } from "../utils";
import { SessionActions } from "./SessionActions";

interface SessionSummaryProps {
  session: Session;
  project: Project | undefined;
  mutate: () => Promise<void>;
}

// Keep prompt under ~100k chars to stay within model context limits
const MAX_TRANSCRIPT_CHARS = 100_000;

const SUMMARY_PROMPT = `Summarize this coding session transcript concisely. Include:
- What the user was trying to accomplish
- Key decisions made
- What was implemented or changed
- Any unresolved issues

Keep it brief — a few bullet points or short paragraphs. Do not repeat the transcript.

Transcript:
`;

export function SessionSummary({ session, project, mutate }: SessionSummaryProps) {
  const abortable = useRef<AbortController>(null);
  const { data: entries, isLoading: transcriptLoading } = usePromise((sid) => loadTranscript(sid), [session.id], {
    abortable,
  });

  const fullTranscript = entries ? buildTranscriptMarkdown(entries) : "";
  const transcript =
    fullTranscript.length > MAX_TRANSCRIPT_CHARS
      ? "...(truncated)\n\n" + fullTranscript.slice(-MAX_TRANSCRIPT_CHARS)
      : fullTranscript;
  const prompt = SUMMARY_PROMPT + transcript;

  const { data: summary, isLoading: aiLoading } = useAI(prompt, {
    execute: !transcriptLoading && transcript.length > 0,
    stream: true,
    creativity: "low",
    model: AI.Model["OpenAI_GPT-4o_mini"],
  });

  const isLoading = transcriptLoading || aiLoading;
  const heading = `# ${session.title || session.slug}\n\n`;
  const markdown = transcriptLoading ? "Loading transcript..." : heading + (summary || "Generating summary...");

  return (
    <Detail
      markdown={markdown}
      isLoading={isLoading}
      navigationTitle={`Summary: ${session.title || session.slug}`}
      actions={<SessionActions session={session} project={project} mutate={mutate} isDetail isSummary />}
    />
  );
}
