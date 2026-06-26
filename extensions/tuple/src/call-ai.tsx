import { Action, ActionPanel, Detail, Form, Icon, showToast, Toast, useNavigation } from "@raycast/api";
import { useEffect, useState } from "react";
import { aiAvailable, CallDraft, CallMetadata, generateCallMetadata } from "./lib/ai";
import { setCallSummary, setCallTitle } from "./lib/tuple";

function ProRequired({ navigationTitle }: { navigationTitle: string }) {
  return (
    <Detail
      navigationTitle={navigationTitle}
      markdown={
        "# Raycast Pro Required\n\nSummarizing a call uses Raycast's built-in AI, which needs **Raycast Pro**.\n\nYou can still **Copy AI Context** from a call and paste it into your own assistant."
      }
      actions={
        <ActionPanel>
          <Action.OpenInBrowser title="Learn About Raycast Pro" url="https://www.raycast.com/pro" />
        </ActionPanel>
      }
    />
  );
}

/** Write a drafted title + summary back to the call. Title is left untouched when blank (an empty
 *  title would be worse than the existing one); an empty summary is allowed and clears the field. */
async function writeMetadata(callId: string, applied: CallDraft): Promise<void> {
  if (applied.title) {
    await setCallTitle(callId, applied.title);
  }
  await setCallSummary(callId, applied.summary);
}

/** Write a draft back to the call with toast feedback, then pop to the previous view on success. */
async function applyMetadata(
  callId: string,
  applied: CallDraft,
  onApplied: ((applied: CallDraft) => void) | undefined,
  pop: () => void,
): Promise<void> {
  const toast = await showToast({ style: Toast.Style.Animated, title: "Updating call…" });
  try {
    await writeMetadata(callId, applied);
    toast.style = Toast.Style.Success;
    // writeMetadata only writes the title when it's non-blank, so don't claim we touched it otherwise.
    toast.title = applied.title ? "Title & Summary Updated" : "Summary Updated";
    onApplied?.(applied);
    pop();
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = "Could Not Update Call";
    toast.message = error instanceof Error ? error.message : String(error);
  }
}

/**
 * AI-drafted title + summary for a call, shown read-only for a quick review, then written back with
 * one "Apply to Call". "Edit Before Applying" drops into a form seeded with the same draft (no second
 * model call) when you want to tweak first. Gated on Raycast Pro.
 */
export function SummarizeCall({
  callId,
  title,
  onApplied,
}: {
  callId: string;
  title: string;
  /** Called with the saved values so callers can refresh or optimistically update their view. */
  onApplied?: (applied: CallDraft) => void;
}) {
  if (!aiAvailable()) {
    return <ProRequired navigationTitle={`Summary: ${title}`} />;
  }
  return <SummaryDetail callId={callId} title={title} onApplied={onApplied} />;
}

function SummaryDetail({
  callId,
  title,
  onApplied,
}: {
  callId: string;
  title: string;
  onApplied?: (applied: CallDraft) => void;
}) {
  const { pop } = useNavigation();
  const [draft, setDraft] = useState<CallMetadata | undefined>();
  const [error, setError] = useState<Error | undefined>();

  useEffect(() => {
    let cancelled = false;
    // Abort the request on unmount so the model stops generating and a late resolution can't set state.
    const controller = new AbortController();
    (async () => {
      try {
        const metadata = await generateCallMetadata(callId, controller.signal);
        if (!cancelled) {
          setDraft(metadata);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err as Error);
        }
      }
    })();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, []);

  if (error) {
    return <Detail navigationTitle={`Summary: ${title}`} markdown={`# Couldn’t Summarize\n\n${error.message}`} />;
  }
  if (!draft) {
    return (
      <Detail
        isLoading
        navigationTitle={`Summary: ${title}`}
        markdown="_Reading the transcript and drafting a title & summary…_"
      />
    );
  }

  const draftTitle = draft.title.trim();
  const draftSummary = draft.summary.trim();
  const heading = draftTitle ? `# ${draftTitle}\n\n` : "";
  // Only offer one-tap apply for a cleanly parsed draft that actually has a summary. Requiring a
  // summary matters: writeMetadata writes it unconditionally, so a parsed-but-empty draft would
  // silently clear an existing summary. A non-JSON reply (parsed: false) or empty one routes through
  // the editable form instead, where the raw text is visible and salvageable.
  const canApply = draft.parsed && Boolean(draftSummary);
  const markdown = canApply
    ? `${heading}${draftSummary}`
    : `${heading}${draftSummary}\n\n---\n\n_The model didn’t return a clean title & summary. Use **Edit Before Applying** to fix it up._`;

  // Raycast's pop lands back on this page (not the originating list), so mirror an edit-form save into
  // our own draft: the page then shows what was saved and a second Apply is idempotent rather than
  // re-applying the original draft over the user's edits.
  const handleEditApplied = (applied: CallDraft) => {
    setDraft({ title: applied.title, summary: applied.summary, parsed: true });
    onApplied?.(applied);
  };

  return (
    <Detail
      navigationTitle={`Summary: ${title}`}
      markdown={markdown}
      actions={
        <ActionPanel>
          {canApply && (
            <Action
              title="Apply to Call"
              icon={Icon.Check}
              onAction={() => applyMetadata(callId, { title: draftTitle, summary: draftSummary }, onApplied, pop)}
            />
          )}
          <Action.Push
            title="Edit Before Applying"
            icon={Icon.Pencil}
            target={
              <EditCallMetadata
                callId={callId}
                title={title}
                draft={{ title: draftTitle || title, summary: draftSummary }}
                description="AI drafted these from the transcript. Edit if you like, then apply."
                onApplied={handleEditApplied}
              />
            }
          />
          <Action.CopyToClipboard title="Copy Summary" content={draftSummary} icon={Icon.Clipboard} />
        </ActionPanel>
      }
    />
  );
}

/**
 * Editable title + summary, seeded with `draft`, then written back on submit. Used both to tweak a
 * fresh AI draft and to hand-edit a call's existing title/summary — the latter involves no AI, so this
 * form is not Pro-gated. `description` sets the helper text above the fields for each context.
 */
export function EditCallMetadata({
  callId,
  title,
  draft,
  description = "Edit the title and summary, then apply.",
  onApplied,
}: {
  callId: string;
  title: string;
  draft: CallDraft;
  description?: string;
  onApplied?: (applied: CallDraft) => void;
}) {
  const { pop } = useNavigation();
  return (
    <Form
      navigationTitle={`Title & Summary: ${title}`}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Apply to Call"
            icon={Icon.Check}
            onSubmit={(values: { title: string; summary: string }) =>
              applyMetadata(callId, { title: values.title.trim(), summary: values.summary.trim() }, onApplied, pop)
            }
          />
        </ActionPanel>
      }
    >
      <Form.Description text={description} />
      <Form.TextField id="title" title="Title" defaultValue={draft.title} />
      <Form.TextArea id="summary" title="Summary" defaultValue={draft.summary} />
    </Form>
  );
}
