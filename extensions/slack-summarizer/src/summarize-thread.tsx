import { ActionPanel, Action, Form, LaunchProps, getPreferenceValues, Clipboard } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useState, useEffect } from "react";
import { summarizeThread } from "./utils/summarizer";
import { useToast } from "./utils/useToast";
import { SummaryDisplay } from "./components/SummaryDisplay";

interface Arguments {
  thread?: string;
}

interface Preferences {
  openaiPrompt: string;
}

// Thread Input Form Component
function ThreadInputForm({ onSubmit }: { onSubmit: (thread: string) => void }) {
  const [inputValue, setInputValue] = useState<string>("");

  function isSlackLink(text: string): boolean {
    const slackRegex = /^https?:\/\/[\w.-]+\.slack\.com\/archives\/\w+\/p\d+$/i;
    return slackRegex.test(text.trim());
  }

  useEffect(() => {
    const checkClipboard = async () => {
      const text = await Clipboard.readText();
      if (text && isSlackLink(text)) {
        setInputValue(text);
      }
    };
    checkClipboard();
  }, []);

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Summarize" onSubmit={(values: { thread: string }) => onSubmit(values.thread)} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="thread"
        title="Thread (or Message) URL"
        placeholder="Paste Slack thread link…"
        value={inputValue}
        onChange={setInputValue}
      />
    </Form>
  );
}

export default function Command({ arguments: { thread: initialThread } }: LaunchProps<{ arguments: Arguments }>) {
  const [thread, setThread] = useState(initialThread);
  const { openaiPrompt } = getPreferenceValues<Preferences>();
  const toast = useToast();

  const {
    isLoading,
    data: summaryStream,
    error,
    revalidate,
  } = usePromise(
    async (threadUrl?: string) => {
      if (!threadUrl) return;
      try {
        const result = await summarizeThread(threadUrl, openaiPrompt);
        return result;
      } catch (e) {
        toast.showErrorToast("Couldn't generate summary", e);
        throw e;
      }
    },
    [thread],
  );

  return thread ? (
    <SummaryDisplay
      isLoading={isLoading}
      summaryStream={summaryStream}
      error={error as Error | undefined}
      onRegenerate={revalidate}
      navigationTitle="Thread summary"
    />
  ) : (
    <ThreadInputForm onSubmit={setThread} />
  );
}
