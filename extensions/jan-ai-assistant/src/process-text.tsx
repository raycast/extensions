import {
  ActionPanel,
  Action,
  Detail,
  LaunchProps,
  Clipboard,
  showToast,
  Toast,
  Icon,
} from "@raycast/api";
import { useState, useEffect } from "react";
import { sendToJanAi } from "./utils/janApi";
import { formatForDisplay } from "./utils/textHelpers";

interface Arguments {
  text?: string;
}

export default function Command(props: LaunchProps<{ arguments: Arguments }>) {
  const [inputText, setInputText] = useState<string>("");
  const [outputText, setOutputText] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);

  useEffect(() => {
    async function loadText() {
      if (props.arguments.text) {
        setInputText(props.arguments.text);
      } else {
        const clipboardText = await Clipboard.readText();
        if (clipboardText) {
          setInputText(clipboardText);
        }
      }
    }
    loadText();
  }, []);

  async function processText(prompt: string) {
    if (!inputText) {
      await showToast({
        style: Toast.Style.Failure,
        title: "No text to process",
        message: "Please provide text or copy text to clipboard",
      });
      return;
    }

    setIsLoading(true);
    try {
      const response = await sendToJanAi([
        { role: "user", content: `${prompt}\n\n${inputText}` },
      ]);
      setOutputText(formatForDisplay(response));
      await showToast({
        style: Toast.Style.Success,
        title: "Processing complete",
      });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Processing failed",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsLoading(false);
    }
  }

  const markdown = outputText
    ? `# Result\n\n${outputText}\n\n---\n\n# Original Text\n\n${inputText}`
    : inputText
      ? `# Text to Process\n\n${inputText}\n\nSelect an action from the menu.`
      : "# No Text Available\n\nProvide text as argument or copy text to clipboard.";

  return (
    <Detail
      markdown={markdown}
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <ActionPanel.Section title="Quick Actions">
            <Action
              title="Summarize"
              icon={Icon.Text}
              onAction={() => processText("Summarize this text concisely:")}
            />
            <Action
              title="Improve Writing"
              icon={Icon.Pencil}
              onAction={() =>
                processText(
                  "Improve the writing of this text while maintaining its meaning:",
                )
              }
            />
            <Action
              title="Fix Grammar"
              icon={Icon.CheckCircle}
              onAction={() =>
                processText("Fix any grammar and spelling errors in this text:")
              }
            />
            <Action
              title="Make Professional"
              icon={Icon.Envelope}
              onAction={() =>
                processText("Rewrite this text in a professional tone:")
              }
            />
            <Action
              title="Explain"
              icon={Icon.QuestionMark}
              onAction={() => processText("Explain this text in simple terms:")}
            />
          </ActionPanel.Section>
          {outputText && (
            <ActionPanel.Section title="Output Actions">
              <Action.CopyToClipboard
                title="Copy Result"
                content={outputText}
              />
              <Action.Paste title="Paste Result" content={outputText} />
            </ActionPanel.Section>
          )}
        </ActionPanel>
      }
    />
  );
}
