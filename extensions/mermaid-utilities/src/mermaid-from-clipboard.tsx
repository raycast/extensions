import React, { useEffect, useState, useRef } from "react";
import { showToast, Toast, Detail, Icon, ActionPanel, Action } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { ImagePreview } from "./components/ImagePreview";
import { generateMermaidDiagram } from "./utils/diagram";
import { cleanupTempFile } from "./utils/files";
import { Clipboard, getPreferenceValues } from "@raycast/api";
import { Preferences } from "./types";

export default function Command() {
  const [imagePath, setImagePath] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const isProcessingRef = useRef(false);
  const tempFileRef = useRef<string | null>(null);
  const preferences = getPreferenceValues<Preferences>();

  async function processMermaidCode() {
    if (isProcessingRef.current) return;
    isProcessingRef.current = true;

    try {
      setIsLoading(true);
      setError(null);

      // Use clipboard content
      let mermaidCode;
      try {
        mermaidCode = await Clipboard.readText();
        if (!mermaidCode) {
          setError("Clipboard is empty. Please copy a Mermaid diagram code first.");
          await showFailureToast({
            title: "Empty Clipboard",
            message: "Please copy a Mermaid diagram code first.",
          });
          setIsLoading(false);
          return;
        }
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        setError("Failed to read clipboard. Please try again.");
        await showFailureToast(error, {
          title: "Clipboard Error",
          message: "Failed to read clipboard. Please try again.",
        });
        console.error("Clipboard error details:", errorMessage);
        setIsLoading(false);
        return;
      }

      await showToast({
        style: Toast.Style.Animated,
        title: "Generating diagram...",
      });

      const outputPath = await generateMermaidDiagram(mermaidCode, tempFileRef);
      setImagePath(outputPath);

      await showToast({
        style: Toast.Style.Success,
        title: "Diagram generated successfully",
      });
    } catch (error) {
      // Log the full error for debugging but show a simplified version to the user
      console.error("Error details:", error);

      // Extract a user-friendly message
      let userMessage = "An unexpected error occurred.";
      if (error instanceof Error) {
        userMessage = error.message;
      } else if (typeof error === "string") {
        userMessage = error;
      }

      setError(userMessage);

      // Show failure toast with the user-friendly message
      await showFailureToast(error, {
        title: "Diagram Generation Failed",
        message: userMessage,
      });
    } finally {
      setIsLoading(false);
      isProcessingRef.current = false;
    }
  }

  useEffect(() => {
    processMermaidCode(); // Process clipboard content on load
  }, []);

  useEffect(() => {
    return () => {
      // Cleanup temporary image file
      cleanupTempFile(imagePath);

      // Cleanup temporary .mmd file
      cleanupTempFile(tempFileRef.current);
    };
  }, [imagePath]);

  if (isLoading) {
    return (
      <Detail
        markdown="# Generating diagram, please wait..."
        isLoading={true}
        actions={
          <ActionPanel>
            <Action
              title="Cancel"
              icon={Icon.XMarkCircle}
              onAction={() => {
                // Clean up any temporary files before canceling
                if (tempFileRef.current) {
                  cleanupTempFile(tempFileRef.current);
                  tempFileRef.current = null;
                }

                isProcessingRef.current = false;
                setIsLoading(false);
                setError("Operation cancelled by user.");

                // Show toast to confirm cancellation
                showToast({
                  style: Toast.Style.Success,
                  title: "Operation cancelled",
                  message: "Temporary files have been cleaned up",
                });
              }}
            />
          </ActionPanel>
        }
      />
    );
  }

  if (error) {
    return (
      <Detail
        markdown={`# Diagram Generation Failed

${error}

## Common Solutions:
- Ensure your Mermaid syntax is valid
- Check that your diagram starts with a proper declaration (like \`graph TD\` or \`sequenceDiagram\`)
- Make sure Mermaid CLI is properly installed

## Valid Mermaid Diagram Types:
- \`graph TD\` or \`flowchart TD\` - Flowcharts
- \`sequenceDiagram\` - Sequence diagrams  
- \`classDiagram\` - Class diagrams
- \`stateDiagram-v2\` - State diagrams
- \`erDiagram\` - Entity relationship diagrams
- \`journey\` - User journey diagrams
- \`gantt\` - Gantt charts
- \`pie\` - Pie charts

[View Mermaid Syntax Documentation](https://mermaid.js.org/syntax/flowchart.html)`}
        actions={
          <ActionPanel>
            <Action
              title="Try Again"
              icon={Icon.Clipboard}
              shortcut={{ modifiers: ["cmd"], key: "r" }}
              onAction={() => processMermaidCode()}
            />
            <ActionPanel.Section title="Help">
              <Action.OpenInBrowser
                title="Mermaid Documentation"
                url="https://mermaid.js.org/syntax/flowchart.html"
                icon={Icon.Book}
              />
            </ActionPanel.Section>
          </ActionPanel>
        }
      />
    );
  }

  if (imagePath) {
    return <ImagePreview imagePath={imagePath} format={preferences.outputFormat} />;
  }

  // Fallback state
  return (
    <Detail
      markdown="# Generate Diagram from Clipboard

Copy Mermaid diagram code to your clipboard, then use the action below to generate an image.

## Example Mermaid Code:
\`\`\`mermaid
graph TD
    A[Start] --> B{Decision}
    B -->|Yes| C[End]
    B -->|No| D[Continue]
    D --> A
\`\`\`

*Note: Make sure your clipboard contains valid Mermaid syntax.*"
      actions={
        <ActionPanel>
          <Action
            title="Generate from Clipboard"
            icon={Icon.Clipboard}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
            onAction={() => processMermaidCode()}
          />
          <ActionPanel.Section title="Help">
            <Action.OpenInBrowser
              title="Mermaid Documentation"
              url="https://mermaid.js.org/syntax/flowchart.html"
              icon={Icon.Book}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
