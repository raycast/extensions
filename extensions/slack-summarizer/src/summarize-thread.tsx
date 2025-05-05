import { ActionPanel, Action, Detail, Form, LaunchProps, showToast, Toast, getPreferenceValues } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useState } from "react";
import { summarizeThread } from "./utils/summarizer";

interface Arguments {
  thread?: string;
}

export default function Command({ arguments: { thread: initialThread } }: LaunchProps<{ arguments: Arguments }>) {
  const [thread, setThread] = useState<string | undefined>(initialThread);

  const preferences = getPreferenceValues();
  const customPrompt = preferences.openaiPrompt;

  /* ---------- Helpers ---------------------- */

  /* Wrapped summarizer with Animated Toast */
  async function handleSummarize(threadId: string) {
    // Animated toast while the summary is being generated
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Generating summary...",
    });

    try {
      const summary = await summarizeThread(threadId, customPrompt);

      toast.style = Toast.Style.Success;
      toast.title = "Completed";
      toast.message = "Summary generated successfully.";

      return summary;
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Couldn't generate summary";
      if (error instanceof Error) {
        toast.message = error.message;
      }
      // Rethrow so the hook can propagate the error to the UI
      throw error;
    }
  }

  /* ---------- Data fetching ---------- */
  const {
    isLoading,
    data: summary,
    error,
    revalidate,
  } = usePromise(
    async (t) => {
      if (!t) return undefined; // skip fetch until we have a thread id
      return handleSummarize(t);
    },
    [thread],
  );

  /* ---------- UI ---------- */
  if (!thread) {
    return (
      <Form
        actions={
          <ActionPanel>
            <Action.SubmitForm title="Summarize" onSubmit={(values: { thread: string }) => setThread(values.thread)} />
          </ActionPanel>
        }
      >
        <Form.TextField id="thread" title="Thread (or Message) URL" placeholder="Paste Slack thread link…" />
      </Form>
    );
  } else {
    return (
      <Detail
        isLoading={isLoading}
        markdown={
          error
            ? `**Error:** Couldn't generate summary.\n\n\`\`${error instanceof Error ? error.message : String(error)}\`\``
            : (summary ?? "Summarizing…")
        }
        navigationTitle="Thread summary"
        actions={
          <ActionPanel>
            <Action.CopyToClipboard title="Copy Summary" content={summary ?? ""} />
            <Action title="Regenerate" onAction={revalidate} />
          </ActionPanel>
        }
      />
    );
  }
}
