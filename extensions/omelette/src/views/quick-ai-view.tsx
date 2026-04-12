import { useState } from "react";
import {
  Detail,
  getSelectedText,
  showToast,
  Toast,
  getPreferenceValues,
  ActionPanel,
  Action,
  Form,
  useNavigation,
} from "@raycast/api";
import { generateStreamedResponse } from "../api/openrouter";
import { v4 as uuidv4 } from "uuid";
import { Question } from "../types/question";
import { useMountEffect } from "../hooks/useMountEffect";

interface QuickAIProps {
  prompt: string;
  title: string;
}

export function QuickAI({ prompt, title }: QuickAIProps) {
  const [output, setOutput] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const preferences = getPreferenceValues<Preferences>();

  useMountEffect(() => {
    const controller = new AbortController();
    let mounted = true;

    async function runAction() {
      try {
        let selectedText = "";
        try {
          selectedText = await getSelectedText();
        } catch (error) {
          const message =
            error instanceof Error ? error.message : "Please select some text before running this command.";
          showToast({
            style: Toast.Style.Failure,
            title: "Unable to read selected text",
            message,
          });
          if (mounted) setIsLoading(false);
          return;
        }

        const question: Question = {
          id: uuidv4(),
          conversationId: uuidv4(),
          prompt: `${prompt}:\n\n${selectedText}`,
          response: "",
          createdAt: new Date().toISOString(),
          isStreaming: true,
        };

        await generateStreamedResponse(
          [question],
          question.id,
          (partialOutput) => {
            if (mounted) setOutput(partialOutput);
          },
          controller.signal,
          preferences.defaultModel,
        );
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") return;
        showToast({
          style: Toast.Style.Failure,
          title: "Error",
          message: error instanceof Error ? error.message : "An unknown error occurred",
        });
      } finally {
        if (mounted) setIsLoading(false);
      }
    }

    runAction();
    return () => {
      mounted = false;
      controller.abort();
    };
  });

  return (
    <Detail
      isLoading={isLoading}
      markdown={output || (isLoading ? "Processing..." : "No output")}
      navigationTitle={title}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard content={output} />
        </ActionPanel>
      }
    />
  );
}

export function Summarize() {
  return <QuickAI title="Summarize" prompt="Summarize the following text briefly and concisely" />;
}

export function ImproveWriting() {
  return (
    <QuickAI
      title="Improve Writing"
      prompt="Improve the writing of the following text, making it more professional and clear"
    />
  );
}

export function FixGrammar() {
  return <QuickAI title="Fix Grammar" prompt="Fix any grammar and spelling errors in the following text" />;
}

export function TranslateToEnglish() {
  return <QuickAI title="Translate to English" prompt="Translate the following text to English" />;
}

export function CustomAction() {
  const { push } = useNavigation();

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Run Custom Action"
            onSubmit={(values: { prompt: string }) => {
              push(<QuickAI title="Custom Quick AI" prompt={values.prompt} />);
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextArea id="prompt" title="Custom Prompt" placeholder="e.g. Explain this code like I'm five" />
    </Form>
  );
}
