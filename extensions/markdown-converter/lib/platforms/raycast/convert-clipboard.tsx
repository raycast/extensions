import { Action, ActionPanel, Clipboard, Detail, showToast, Toast, getPreferenceValues } from "@raycast/api";
import { useState, useEffect } from "react";
import { raycastConverter } from "./raycast-converter.js";
import { ImageHandlingMode } from "../../core/converter.js";

export default function ConvertClipboard() {
  const [markdown, setMarkdown] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const preferences = getPreferenceValues<{ imageHandling: ImageHandlingMode }>();

  useEffect(() => {
    convertClipboard();
  }, []);

  const convertClipboard = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Since Raycast doesn't support HTML clipboard reading, we'll enhance the plain text processing
      
      const result = await raycastConverter.convertFromClipboard({
        imageHandling: preferences.imageHandling
      });

      setMarkdown(result);
      
      if (result.trim()) {
        await showToast({
          style: Toast.Style.Success,
          title: "Converted to Markdown",
          message: "Result copied to clipboard"
        });
        
        // Copy back to clipboard
        await Clipboard.copy(result);
      } else {
        await showToast({
          style: Toast.Style.Failure,
          title: "No content found",
          message: "No rich text found in clipboard"
        });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      setError(errorMessage);
      await showToast({
        style: Toast.Style.Failure,
        title: "Conversion failed",
        message: errorMessage
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return <Detail isLoading={true} markdown="Converting clipboard content..." />;
  }

  if (error) {
    return (
      <Detail
        markdown={`# Conversion Error\n\n${error}`}
        actions={
          <ActionPanel>
            <Action title="Try Again" onAction={convertClipboard} />
          </ActionPanel>
        }
      />
    );
  }

  if (!markdown.trim()) {
    return (
      <Detail
        markdown="# No Content Found\n\nNo rich text content was found in your clipboard. Copy some formatted text (from Word, Google Docs, or a webpage) and try again."
        actions={
          <ActionPanel>
            <Action title="Try Again" onAction={convertClipboard} />
          </ActionPanel>
        }
      />
    );
  }

  const escapedMarkdown = markdown
    .replace(/```/g, "`\u200b``")
    .replace(/\r\n/g, "\n");

  const detailMarkdown = `# Conversion Result\n\n\`\`\`\n${escapedMarkdown}\n\`\`\``;

  return (
    <Detail
      markdown={detailMarkdown}
      actions={
        <ActionPanel>
          <Action title="Convert Again" onAction={convertClipboard} />
        </ActionPanel>
      }
    />
  );
}