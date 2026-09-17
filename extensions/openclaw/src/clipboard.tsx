import {
  Action,
  ActionPanel,
  Detail,
  Form,
  Clipboard,
  showToast,
  Toast,
  useNavigation,
  Keyboard,
} from "@raycast/api";
import { useState, useEffect } from "react";
import { sendMessage } from "./api";

function ResultView({
  prompt,
  clipboardContent,
  answer,
}: {
  prompt: string;
  clipboardContent: string;
  answer: string;
}) {
  const markdown = `## Your Prompt
${prompt}

## Clipboard Content
\`\`\`
${clipboardContent.slice(0, 500)}${clipboardContent.length > 500 ? "…" : ""}
\`\`\`

---

## OpenClaw's Response
${answer}`;

  return (
    <Detail
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard
            title="Copy Response"
            content={answer}
            shortcut={Keyboard.Shortcut.Common.Copy}
          />
          <Action.CopyToClipboard
            title="Copy All"
            content={`Prompt: ${prompt}\n\nClipboard: ${clipboardContent}\n\nResponse: ${answer}`}
          />
          <Action.Paste
            title="Paste Response"
            content={answer}
            shortcut={{ modifiers: ["cmd"], key: "return" }}
          />
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
        await showToast({
          style: Toast.Style.Failure,
          title: "Could Not Read Clipboard",
        });
      } finally {
        setIsLoading(false);
      }
    }
    getClipboard();
  }, []);

  async function handleSubmit() {
    if (!clipboardContent.trim()) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Clipboard Is Empty",
      });
      return;
    }

    const userPrompt = prompt.trim() || "What is this?";
    const fullMessage = `${userPrompt}\n\n---\n\nClipboard content:\n${clipboardContent}`;

    setIsLoading(true);

    try {
      const response = await sendMessage([
        { role: "user", content: fullMessage },
      ]);
      push(
        <ResultView
          prompt={userPrompt}
          clipboardContent={clipboardContent}
          answer={response}
        />,
      );
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Could Not Ask OpenClaw",
        message:
          error instanceof Error ? error.message : "OpenClaw did not respond.",
      });
    } finally {
      setIsLoading(false);
    }
  }

  if (isLoading && !clipboardContent) {
    return <Detail isLoading={true} markdown="Reading clipboard…" />;
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Ask OpenClaw" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="prompt"
        title="Prompt"
        placeholder='Ask about the clipboard. Leave blank for "What is this?"'
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
