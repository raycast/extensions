import { Action, ActionPanel, Form, showToast, Toast } from "@raycast/api";
import { promptVersionSnapshot } from "./core/feedback-store";
import type {
  FeedbackOutcomeStatus,
  FeedbackTargetAgent,
  FeedbackVerdict,
  PromptUseFeedbackDraft,
  PromptUseFeedbackPatch,
  PromptUseFeedbackRecord,
} from "./core/feedback-store";
import type { PromptRecord } from "./core/prompt-store";

export interface FeedbackFormValues {
  usedAt: string;
  targetAgent: FeedbackTargetAgent;
  targetApplication: string;
  projectCommit: string;
  verdict: FeedbackVerdict;
  rating: string;
  critique: string;
  correction: string;
  finalPrompt: string;
  outcomeStatus: FeedbackOutcomeStatus | "";
  outcomeSummary: string;
  notes: string;
}

interface FeedbackFormProps {
  prompt: PromptRecord | PromptUseFeedbackRecord["prompt"];
  initial?: PromptUseFeedbackRecord;
  currentProjectCommit?: string;
  submitTitle: string;
  onSubmit: (values: FeedbackFormValues) => Promise<void>;
}

export function FeedbackForm({
  prompt,
  initial,
  currentProjectCommit,
  submitTitle,
  onSubmit,
}: FeedbackFormProps) {
  const values = initialValues(prompt, initial, currentProjectCommit);

  async function submit(formValues: FeedbackFormValues) {
    try {
      await onSubmit(formValues);
    } catch (error) {
      await showToast(
        Toast.Style.Failure,
        "Could Not Save Feedback",
        error instanceof Error ? error.message : String(error),
      );
    }
  }

  return (
    <Form
      navigationTitle={`Feedback · ${prompt.title}`}
      actions={
        <ActionPanel>
          <Action.SubmitForm title={submitTitle} onSubmit={submit} />
        </ActionPanel>
      }
    >
      <Form.Description
        title="Prompt Version"
        text={`${new Date(promptVersionTime(prompt)).toLocaleString()} · ${shortDigest(promptVersionDigest(prompt))}`}
      />
      <Form.Dropdown id="verdict" title="Verdict" defaultValue={values.verdict}>
        <Form.Dropdown.Item title="Not Rated" value="not-rated" />
        <Form.Dropdown.Item title="Useful" value="useful" />
        <Form.Dropdown.Item title="Not Useful" value="not-useful" />
      </Form.Dropdown>
      <Form.Dropdown id="rating" title="Rating" defaultValue={values.rating}>
        <Form.Dropdown.Item title="No Rating" value="" />
        <Form.Dropdown.Item title="1 · Poor" value="1" />
        <Form.Dropdown.Item title="2 · Weak" value="2" />
        <Form.Dropdown.Item title="3 · Mixed" value="3" />
        <Form.Dropdown.Item title="4 · Good" value="4" />
        <Form.Dropdown.Item title="5 · Excellent" value="5" />
      </Form.Dropdown>
      <Form.Dropdown
        id="targetAgent"
        title="Target Agent"
        defaultValue={values.targetAgent}
      >
        <Form.Dropdown.Item title="Generic" value="generic" />
        <Form.Dropdown.Item title="Codex" value="codex" />
        <Form.Dropdown.Item title="Claude Code" value="claude-code" />
        <Form.Dropdown.Item title="Other" value="other" />
      </Form.Dropdown>
      <Form.TextField
        id="targetApplication"
        title="Application"
        defaultValue={values.targetApplication}
        placeholder="Codex Desktop, Claude Code, Cursor…"
      />
      <Form.TextField
        id="usedAt"
        title="Used At"
        defaultValue={values.usedAt}
        placeholder="ISO timestamp"
      />
      <Form.TextField
        id="projectCommit"
        title="Project Commit"
        defaultValue={values.projectCommit}
        placeholder="Optional Git commit"
      />
      <Form.Separator />
      <Form.TextArea
        id="critique"
        title="What Worked or Failed?"
        defaultValue={values.critique}
        placeholder="Optional evidence-based critique"
      />
      <Form.TextArea
        id="correction"
        title="Correction"
        defaultValue={values.correction}
        placeholder="Optional instruction or behavior that should change"
      />
      <Form.TextArea
        id="finalPrompt"
        title="Final Edited Prompt"
        defaultValue={values.finalPrompt}
        placeholder="Optional prompt actually used after manual edits"
      />
      <Form.Separator />
      <Form.Dropdown
        id="outcomeStatus"
        title="Outcome"
        defaultValue={values.outcomeStatus}
      >
        <Form.Dropdown.Item title="Not Provided" value="" />
        <Form.Dropdown.Item title="Succeeded" value="succeeded" />
        <Form.Dropdown.Item title="Partially Succeeded" value="partial" />
        <Form.Dropdown.Item title="Failed" value="failed" />
        <Form.Dropdown.Item title="Unknown" value="unknown" />
      </Form.Dropdown>
      <Form.TextArea
        id="outcomeSummary"
        title="Outcome Summary"
        defaultValue={values.outcomeSummary}
        placeholder="Optional observed result; leave blank when unknown"
      />
      <Form.TextArea
        id="notes"
        title="Private Notes"
        defaultValue={values.notes}
        placeholder="Optional local note without secrets"
      />
      <Form.Description text="Feedback stays in the local prompt library. Outcome fields are optional and Prompt Studio never infers them. Do not paste credentials, personal contact details, or private keys." />
    </Form>
  );
}

function initialValues(
  prompt: FeedbackFormProps["prompt"],
  feedback: PromptUseFeedbackRecord | undefined,
  currentProjectCommit: string | undefined,
): FeedbackFormValues {
  return {
    usedAt: feedback?.use.usedAt ?? new Date().toISOString(),
    targetAgent:
      feedback?.use.targetAgent ??
      (prompt.target === "generic" ||
      prompt.target === "codex" ||
      prompt.target === "claude-code"
        ? prompt.target
        : "other"),
    targetApplication: feedback?.use.targetApplication ?? "",
    projectCommit:
      feedback?.use.projectCommit ??
      currentProjectCommit ??
      prompt.project?.commit ??
      "",
    verdict: feedback?.verdict ?? "not-rated",
    rating: feedback?.rating ? String(feedback.rating) : "",
    critique: feedback?.critique ?? "",
    correction: feedback?.correction ?? "",
    finalPrompt: feedback?.finalPrompt ?? "",
    outcomeStatus: feedback?.outcome?.status ?? "",
    outcomeSummary: feedback?.outcome?.summary ?? "",
    notes: feedback?.notes ?? "",
  };
}

function promptVersionTime(prompt: FeedbackFormProps["prompt"]): string {
  return "promptUpdatedAt" in prompt
    ? prompt.promptUpdatedAt
    : prompt.updatedAt;
}

function promptVersionDigest(prompt: FeedbackFormProps["prompt"]): string {
  return "snapshotDigest" in prompt
    ? prompt.snapshotDigest
    : promptVersionSnapshot(prompt).snapshotDigest;
}

function shortDigest(value: string): string {
  return value.length > 12 ? `${value.slice(0, 12)}…` : value;
}

export function feedbackDraftFromForm(
  prompt: PromptRecord,
  values: FeedbackFormValues,
): PromptUseFeedbackDraft {
  return {
    prompt,
    usedAt: values.usedAt,
    targetAgent: values.targetAgent,
    verdict: values.verdict,
    ...(values.targetApplication.trim()
      ? { targetApplication: values.targetApplication }
      : {}),
    ...(values.projectCommit.trim()
      ? { projectCommit: values.projectCommit }
      : {}),
    ...(values.rating ? { rating: Number(values.rating) } : {}),
    ...(values.critique.trim() ? { critique: values.critique } : {}),
    ...(values.correction.trim() ? { correction: values.correction } : {}),
    ...(values.finalPrompt.trim() ? { finalPrompt: values.finalPrompt } : {}),
    ...(values.outcomeStatus ? { outcomeStatus: values.outcomeStatus } : {}),
    ...(values.outcomeSummary.trim()
      ? { outcomeSummary: values.outcomeSummary }
      : {}),
    ...(values.notes.trim() ? { notes: values.notes } : {}),
  };
}

export function feedbackPatchFromForm(
  values: FeedbackFormValues,
): PromptUseFeedbackPatch {
  return {
    usedAt: values.usedAt,
    targetAgent: values.targetAgent,
    targetApplication: values.targetApplication.trim() || null,
    projectCommit: values.projectCommit.trim() || null,
    verdict: values.verdict,
    rating: values.rating ? Number(values.rating) : null,
    critique: values.critique.trim() || null,
    correction: values.correction.trim() || null,
    finalPrompt: values.finalPrompt.trim() || null,
    outcomeStatus: values.outcomeStatus || null,
    outcomeSummary: values.outcomeSummary.trim() || null,
    notes: values.notes.trim() || null,
  };
}
