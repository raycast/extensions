import { Action, ActionPanel, Form, showToast, Toast, Detail, Clipboard, Icon } from "@raycast/api";
import { useForm, FormValidation } from "@raycast/utils";
import { useState } from "react";
import { createNoteFromTranscript, CreateNoteProgress, CreateNoteResult } from "./utils/granolaApi";
import { processTranscriptInput, isYouTubeURL } from "./utils/youtubeTranscript";
import convertHtmlToMarkdown from "./utils/convertHtmltoMarkdown";

interface TranscriptFormValues {
  input: string;
}

export default function Command() {
  const [isCreating, setIsCreating] = useState(false);
  const [progress, setProgress] = useState<CreateNoteProgress | null>(null);
  const [result, setResult] = useState<CreateNoteResult | null>(null);

  const { handleSubmit, itemProps } = useForm<TranscriptFormValues>({
    async onSubmit(values) {
      if (isCreating) return;

      setIsCreating(true);
      setResult(null);
      setProgress(null);

      try {
        const isYouTube = isYouTubeURL(values.input);

        await showToast({
          style: Toast.Style.Animated,
          title: isYouTube ? "Fetching YouTube transcript..." : "Creating note from transcript...",
        });

        // Process the input (either fetch from YouTube or use as manual transcript)
        let transcriptData;
        try {
          transcriptData = await processTranscriptInput(values.input);
        } catch (error) {
          throw new Error(`Failed to process input: ${error}`);
        }

        if (isYouTube) {
          await showToast({
            style: Toast.Style.Animated,
            title: "Creating note from YouTube transcript...",
          });
        }

        // Create the note with the processed transcript
        const result = await createNoteFromTranscript(transcriptData.transcript, setProgress);

        setResult(result);

        await showToast({
          style: Toast.Style.Success,
          title: isYouTube ? "Note created from YouTube video!" : "Note created successfully!",
        });
      } catch (error) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to create note",
          message: String(error),
        });
      } finally {
        setIsCreating(false);
        setProgress(null);
      }
    },
    validation: {
      input: FormValidation.Required,
    },
  });

  // Show result view if note was created successfully
  if (result) {
    const markdownContent = convertHtmlToMarkdown(result.summaryContent);

    return (
      <Detail
        markdown={`# ${result.title}

${markdownContent}`}
        navigationTitle={`Note: ${result.title}`}
        actions={
          <ActionPanel>
            <Action.OpenInBrowser title="Open in Granola Web" url={result.noteUrl} icon={Icon.Globe} />
            <Action.CopyToClipboard title="Copy Note URL" content={result.noteUrl} icon={Icon.CopyClipboard} />
            <Action.CopyToClipboard title="Copy Notes as Markdown" content={markdownContent} icon={Icon.Document} />
            <Action.CopyToClipboard title="Copy Notes as Html" content={result.summaryContent} icon={Icon.CodeBlock} />
            <ActionPanel.Section>
              <Action
                title="Create Another Note"
                onAction={() => {
                  setResult(null);
                }}
                icon={Icon.Plus}
              />
            </ActionPanel.Section>
          </ActionPanel>
        }
      />
    );
  }

  // Show progress view if currently creating
  if (isCreating && progress) {
    const { step, title, streamingContent } = progress;

    // Generate appropriate markdown based on the current step
    let markdown = "";

    switch (step) {
      case "setup":
      case "processing":
        markdown = `# Analyzing Transcript...`;
        break;

      case "generating-title":
        markdown = `# Generating Title...`;
        break;

      case "streaming-summary": {
        const displayTitle = title ? `# ${title}` : "# Generating Summary...";
        const summaryContent = streamingContent && streamingContent.trim() ? streamingContent : "";

        markdown = `${displayTitle}

${summaryContent}`;
        break;
      }

      case "finalizing":
        markdown = `# Finalizing...`;
        break;

      case "complete":
        markdown = `# Complete!`;
        break;

      default:
        markdown = `# Analyzing Transcript...`;
    }

    return (
      <Detail
        isLoading={step !== "streaming-summary"} // Don't show spinner during streaming to avoid visual conflict
        markdown={markdown}
        actions={
          step === "streaming-summary" ? (
            <ActionPanel>
              <Action
                title="Cancel"
                onAction={() => {
                  setIsCreating(false);
                  setProgress(null);
                }}
                icon={Icon.XMarkCircle}
              />
            </ActionPanel>
          ) : undefined
        }
      />
    );
  }

  // Show simple loading state before progress starts
  if (isCreating) {
    return <Detail isLoading={true} />;
  }

  // Show main form
  return (
    <Form
      isLoading={isCreating}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Note" onSubmit={handleSubmit} icon={Icon.Document} />
          <ActionPanel.Section>
            <Action
              title="Paste from Clipboard"
              shortcut={{ modifiers: ["cmd"], key: "v" }}
              onAction={async () => {
                try {
                  const clipboardText = await Clipboard.readText();
                  if (clipboardText) {
                    itemProps.input.onChange?.(clipboardText);
                    await showToast({
                      style: Toast.Style.Success,
                      title: "Pasted from clipboard",
                    });
                  }
                } catch (error) {
                  await showToast({
                    style: Toast.Style.Failure,
                    title: "Failed to paste from clipboard",
                    message: String(error),
                  });
                }
              }}
              icon={Icon.CopyClipboard}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    >
      <Form.TextArea
        title="Transcript"
        placeholder="Paste URL or enter your transcript..."
        enableMarkdown={false}
        {...itemProps.input}
      />
    </Form>
  );
}
