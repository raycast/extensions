import type { PromptUseFeedbackRecord } from "./feedback-store.ts";
import type { PromptRecord } from "./prompt-store.ts";

const MAX_RECORDS = 10;
const MAX_FIELD_CHARACTERS = 700;
const MAX_BODY_CHARACTERS = 12_000;

export function feedbackRevisionCandidates(
  records: readonly PromptUseFeedbackRecord[],
  promptId: string,
): PromptUseFeedbackRecord[] {
  return records
    .filter((record) => record.prompt.promptId === promptId)
    .filter(
      (record) =>
        record.verdict !== "not-rated" || record.critique || record.correction || record.finalPrompt || record.outcome,
    )
    .sort((left, right) => right.use.usedAt.localeCompare(left.use.usedAt))
    .slice(0, MAX_RECORDS);
}

export function buildFeedbackRevisionThoughts(
  prompt: PromptRecord,
  feedback: readonly PromptUseFeedbackRecord[],
): string {
  if (feedback.length === 0) {
    throw new Error("A feedback revision needs at least one recorded feedback entry.");
  }
  const sections = feedback.map((record, index) => {
    const lines = [
      `### Use ${index + 1} (${record.use.usedAt}, agent: ${record.use.targetAgent})`,
      `- Verdict: ${record.verdict}${record.rating === undefined ? "" : `, rating ${record.rating}/5`}`,
    ];
    if (record.outcome) {
      lines.push(
        `- Outcome: ${record.outcome.status}${record.outcome.summary ? ` — ${clip(record.outcome.summary)}` : ""}`,
      );
    }
    if (record.critique) lines.push(`- Critique: ${clip(record.critique)}`);
    if (record.correction) {
      lines.push(`- Correction the user applied: ${clip(record.correction)}`);
    }
    if (record.finalPrompt) {
      lines.push(`- Prompt text the user actually ran:\n\n${indent(clip(record.finalPrompt))}`);
    }
    if (record.notes) lines.push(`- Notes: ${clip(record.notes)}`);
    return lines.join("\n");
  });
  return [
    `Revise the saved prompt "${prompt.title}" using its recorded usage feedback below.`,
    "Keep the prompt's original job and target audience. Preserve what the feedback shows working, fix what it shows failing, and apply recorded corrections unless they conflict with a newer record.",
    "## Current prompt body",
    indent(prompt.body.slice(0, MAX_BODY_CHARACTERS)),
    "## Recorded usage feedback (newest first)",
    ...sections,
  ].join("\n\n");
}

function clip(value: string): string {
  const trimmed = value.trim();
  return trimmed.length > MAX_FIELD_CHARACTERS ? `${trimmed.slice(0, MAX_FIELD_CHARACTERS)}…` : trimmed;
}

function indent(value: string): string {
  return value
    .split("\n")
    .map((line) => `    ${line}`)
    .join("\n");
}
