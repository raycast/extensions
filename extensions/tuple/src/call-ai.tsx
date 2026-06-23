import { Action, ActionPanel, AI, Detail, Form, Icon, showToast, Toast, useNavigation } from "@raycast/api";
import { useEffect, useState } from "react";
import { aiAvailable, generateCallMetadata, summaryPrompt, transcriptContext } from "./lib/ai";
import { setCallSummary, setCallTitle } from "./lib/tuple";

/**
 * Run a one-shot streaming AI completion. `buildPrompt` is awaited once on mount (it loads the
 * transcript), then the answer streams into `markdown`. Gated on Raycast Pro.
 */
function useAICompletion(buildPrompt: () => Promise<string>) {
  const [markdown, setMarkdown] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | undefined>();

  useEffect(() => {
    let cancelled = false;
    // Abort the request on unmount so the model stops generating and a late chunk can't update state.
    const controller = new AbortController();

    (async () => {
      try {
        const prompt = await buildPrompt();
        const stream = AI.ask(prompt, { creativity: "low", signal: controller.signal });
        stream.on("data", (chunk) => {
          if (!cancelled) {
            setMarkdown((current) => current + chunk);
          }
        });
        await stream;
      } catch (err) {
        if (!cancelled) {
          setError(err as Error);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
      controller.abort();
    };
    // Intentionally run once per mounted view (the prompt builder is captured at mount).
  }, []);

  return { markdown, isLoading, error };
}

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

/** AI-drafted title + summary for a call, shown in an editable form, then written back. */
export function GenerateCallMetadata({
  callId,
  title,
  onApplied,
}: {
  callId: string;
  title: string;
  /** Called with the saved values so callers can refresh or optimistically update their view. */
  onApplied?: (applied: { title: string; summary: string }) => void;
}) {
  if (!aiAvailable()) {
    return <ProRequired navigationTitle={`Title & Summary: ${title}`} />;
  }
  return <GenerateMetadataForm callId={callId} title={title} onApplied={onApplied} />;
}

function GenerateMetadataForm({
  callId,
  title,
  onApplied,
}: {
  callId: string;
  title: string;
  onApplied?: (applied: { title: string; summary: string }) => void;
}) {
  const { pop } = useNavigation();
  const [draft, setDraft] = useState<{ title: string; summary: string } | undefined>();
  const [error, setError] = useState<Error | undefined>();

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    (async () => {
      try {
        const metadata = await generateCallMetadata(callId, controller.signal);
        if (!cancelled) {
          setDraft({ title: metadata.title.trim() || title, summary: metadata.summary });
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
    return (
      <Detail navigationTitle={`Title & Summary: ${title}`} markdown={`# Couldn’t Generate\n\n${error.message}`} />
    );
  }
  if (!draft) {
    return (
      <Detail
        isLoading
        navigationTitle={`Title & Summary: ${title}`}
        markdown="_Reading the transcript and drafting a title & summary…_"
      />
    );
  }

  return (
    <Form
      navigationTitle={`Title & Summary: ${title}`}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Apply to Call"
            icon={Icon.Check}
            onSubmit={async (values: { title: string; summary: string }) => {
              const toast = await showToast({ style: Toast.Style.Animated, title: "Updating call…" });
              try {
                const applied = { title: values.title.trim(), summary: values.summary.trim() };
                if (applied.title) {
                  await setCallTitle(callId, applied.title);
                }
                await setCallSummary(callId, applied.summary);
                toast.style = Toast.Style.Success;
                toast.title = "Title & Summary Updated";
                onApplied?.(applied);
                pop();
              } catch (err) {
                toast.style = Toast.Style.Failure;
                toast.title = "Could Not Update Call";
                toast.message = err instanceof Error ? err.message : String(err);
              }
            }}
          />
        </ActionPanel>
      }
    >
      <Form.Description text="AI drafted these from the transcript. Edit if you like, then apply." />
      <Form.TextField id="title" title="Title" defaultValue={draft.title} />
      <Form.TextArea id="summary" title="Summary" defaultValue={draft.summary} />
    </Form>
  );
}

/** Streamed AI summary of a single call. */
export function SummarizeCall({
  callId,
  title,
  onApplied,
}: {
  callId: string;
  title: string;
  /** Called with the saved summary when the user applies it to the call. */
  onApplied?: (summary: string) => void;
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
  onApplied?: (summary: string) => void;
}) {
  const { pop } = useNavigation();
  const { markdown, isLoading, error } = useAICompletion(async () => summaryPrompt(await transcriptContext(callId)));
  const body = error ? `# Couldn’t Summarize\n\n${error.message}` : markdown || "_Summarizing…_";
  const canApply = Boolean(markdown.trim()) && !isLoading && !error;

  return (
    <Detail
      isLoading={isLoading}
      navigationTitle={`Summary: ${title}`}
      markdown={body}
      actions={
        canApply ? (
          <ActionPanel>
            <Action
              title="Apply to Call"
              icon={Icon.Check}
              onAction={async () => {
                const toast = await showToast({ style: Toast.Style.Animated, title: "Saving summary…" });
                try {
                  const summary = markdown.trim();
                  await setCallSummary(callId, summary);
                  toast.style = Toast.Style.Success;
                  toast.title = "Summary Saved";
                  onApplied?.(summary);
                  pop();
                } catch (err) {
                  toast.style = Toast.Style.Failure;
                  toast.title = "Could Not Save Summary";
                  toast.message = err instanceof Error ? err.message : String(err);
                }
              }}
            />
            <Action.CopyToClipboard title="Copy Summary" content={markdown} icon={Icon.Clipboard} />
          </ActionPanel>
        ) : undefined
      }
    />
  );
}
