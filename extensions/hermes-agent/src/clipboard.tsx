import {
  Action,
  ActionPanel,
  Clipboard,
  Detail,
  Form,
  Icon,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useEffect, useRef, useState } from "react";
import { askQuestion } from "./api";
import { ConversationView } from "./conversation";

function ResultView({
  prompt,
  clipboardContent,
}: {
  prompt: string;
  clipboardContent: string;
}) {
  const [answer, setAnswer] = useState("");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const buffer = useRef("");
  const lastUpdate = useRef(0);

  useEffect(() => {
    const fullMessage = `${prompt}\n\n---\n\nClipboard content:\n${clipboardContent}`;
    askQuestion(fullMessage, (chunk) => {
      buffer.current += chunk;
      const now = Date.now();
      if (now - lastUpdate.current > 100) {
        lastUpdate.current = now;
        setAnswer(buffer.current);
      }
    })
      .then((result) => {
        setAnswer(result.content);
        setSessionId(result.sessionId);
      })
      .catch((e) => setError(e instanceof Error ? e.message : String(e)))
      .finally(() => setIsLoading(false));
  }, [prompt, clipboardContent]);

  const preview =
    clipboardContent.slice(0, 500) + (clipboardContent.length > 500 ? "…" : "");
  const markdown = error
    ? `## Error\n\n${error}`
    : `## ${prompt}

\`\`\`
${preview}
\`\`\`

---

${answer || "*Asking Hermes…*"}`;

  return (
    <Detail
      isLoading={isLoading}
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy Response" content={answer} />
          <Action.Paste
            title="Paste Response"
            content={answer}
            shortcut={{ modifiers: ["cmd"], key: "return" }}
          />
          {sessionId && (
            <Action.Push
              title="Continue in Chat"
              icon={Icon.Message}
              shortcut={{ modifiers: ["cmd"], key: "j" }}
              target={
                <ConversationView
                  sessionId={sessionId}
                  sessionTitle={prompt.slice(0, 50)}
                />
              }
            />
          )}
        </ActionPanel>
      }
    />
  );
}

export default function Command() {
  const [clipboardContent, setClipboardContent] = useState<string>("");
  const [prompt, setPrompt] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const { push } = useNavigation();

  useEffect(() => {
    async function getClipboard() {
      try {
        const text = await Clipboard.readText();
        setClipboardContent(text || "");
      } catch {
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to read clipboard",
        });
      } finally {
        setIsLoading(false);
      }
    }
    getClipboard();
  }, []);

  function handleSubmit() {
    if (!clipboardContent.trim()) {
      showToast({ style: Toast.Style.Failure, title: "Clipboard is empty" });
      return;
    }
    const userPrompt = prompt.trim() || "What is this?";
    push(
      <ResultView prompt={userPrompt} clipboardContent={clipboardContent} />,
    );
  }

  if (isLoading && !clipboardContent) {
    return <Detail isLoading={true} markdown="Reading clipboard…" />;
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Ask Hermes" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="prompt"
        title="Prompt"
        placeholder="What would you like to know about this? (default: What is this?)"
        value={prompt}
        onChange={setPrompt}
        autoFocus
      />
      <Form.Separator />
      <Form.Description
        title="Clipboard Preview"
        text={
          clipboardContent.slice(0, 300) +
            (clipboardContent.length > 300 ? "…" : "") || "(empty)"
        }
      />
    </Form>
  );
}
