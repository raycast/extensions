import { ActionPanel, Action, Form, Clipboard, getPreferenceValues, showHUD, LaunchProps } from "@raycast/api";
import { useState } from "react";
import { processText } from "./utils";

interface CommandFormValues {
  textToProcess: string;
  processedTextOutput?: string;
}

interface CommandLaunchArguments {
  draftText?: string;
}

export default function Command(props: LaunchProps<{ arguments: CommandLaunchArguments }>) {
  const [textToProcessError, setTextToProcessError] = useState<string | undefined>();
  const [processedTextOutput, setProcessedTextOutput] = useState<string | undefined>();
  const [isLoading, setIsLoading] = useState<boolean>(false);

  async function handleSubmit(values: CommandFormValues) {
    if (!values.textToProcess?.trim()) {
      setTextToProcessError("Text cannot be empty");
      setProcessedTextOutput(undefined);
      return;
    }
    setTextToProcessError(undefined);
    setProcessedTextOutput(undefined);
    setIsLoading(true);

    try {
      const { apiKey } = getPreferenceValues<{ apiKey: string }>();
      if (!apiKey) {
        await showHUD("❌ API key not found. Please set it in preferences.");
        return;
      }

      const processedContent = await processText(values.textToProcess, apiKey);
      await Clipboard.copy(processedContent);
      setProcessedTextOutput(processedContent);
      await showHUD("✅ Text processed, displayed below, and copied to clipboard!");
    } catch (err) {
      if (err instanceof Error) {
        await showHUD(`❌ Error: ${err.message}`);
      } else {
        await showHUD(`❌ Error: ${String(err)}`);
      }
      setProcessedTextOutput(undefined);
    } finally {
      setIsLoading(false);
    }
  }

  function clearTextToProcessError() {
    if (textToProcessError) {
      setTextToProcessError(undefined);
    }
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Process Text" onSubmit={handleSubmit} />
          {processedTextOutput && !isLoading && (
            <Action.CopyToClipboard title="Copy Output to Clipboard" content={processedTextOutput} />
          )}
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="textToProcess"
        title="Text to Fix"
        placeholder="Enter or paste text here..."
        error={textToProcessError}
        onChange={(_) => {
          clearTextToProcessError();
          if (processedTextOutput) {
            setProcessedTextOutput(undefined);
          }
        }}
        onBlur={(event) => {
          if (!event.target.value?.trim()) {
            setTextToProcessError("Text cannot be empty");
          } else {
            clearTextToProcessError();
          }
        }}
        defaultValue={props.arguments?.draftText}
      />
      {processedTextOutput && (
        <>
          <Form.Separator />
          <Form.TextArea id="processedTextOutput" title="Fixed Text" value={processedTextOutput} onChange={() => {}} />
        </>
      )}
    </Form>
  );
}
