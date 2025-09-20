import React, { useEffect, useState, useRef } from "react";
import { showToast, Toast, Detail, Icon, ActionPanel, Action, getSelectedText } from "@raycast/api";
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

  // Extract the clipboard-only generation logic into a reusable function
  async function generateFromClipboardOnly() {
    try {
      setIsLoading(true);
      setError(null);

      const clipboardText = await Clipboard.readText();
      if (clipboardText && clipboardText.trim()) {
        const outputPath = await generateMermaidDiagram(clipboardText, tempFileRef);
        setImagePath(outputPath);

        await showToast({
          style: Toast.Style.Success,
          title: "Diagram generated from clipboard",
        });
      } else {
        throw new Error("Clipboard is empty");
      }
    } catch (error) {
      await showFailureToast(error, {
        title: "Failed to use clipboard",
      });
    } finally {
      setIsLoading(false);
    }
  }

  async function processMermaidCode() {
    if (isProcessingRef.current) return;
    isProcessingRef.current = true;

    try {
      setIsLoading(true);
      setError(null);

      let mermaidCode: string | undefined;
      let sourceType: "selected" | "clipboard" | null = null;

      // Step 1: Try to get selected text first (higher priority)
      try {
        const selectedText = await getSelectedText();
        // More robust check for selected text
        if (selectedText && selectedText.trim().length > 0) {
          mermaidCode = selectedText;
          sourceType = "selected";
          console.log("Selected text found:", selectedText.substring(0, 100) + "...");
          console.log("Selected text length:", selectedText.length);

          await showToast({
            style: Toast.Style.Animated,
            title: "Using selected text...",
          });
        }
      } catch (error) {
        // Selected text not available or error occurred
        console.log("Failed to get selected text:", error);
      }

      // Step 2: If no selected text, fall back to clipboard content
      if (!mermaidCode || !sourceType) {
        try {
          const clipboardText = await Clipboard.readText();
          if (clipboardText && clipboardText.trim().length > 0) {
            mermaidCode = clipboardText;
            sourceType = "clipboard";
            console.log("Clipboard content found:", clipboardText.substring(0, 100) + "...");
            console.log("Clipboard content length:", clipboardText.length);

            await showToast({
              style: Toast.Style.Animated,
              title: "Using clipboard content...",
            });
          } else {
            setError("No selected text or clipboard content. Please select Mermaid code or copy it first.");
            await showFailureToast({
              title: "No Input Found",
              message: "Please select text or copy Mermaid diagram code first.",
            });
            setIsLoading(false);
            return;
          }
        } catch (error: unknown) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          setError("Failed to read input. Please try again.");
          await showFailureToast(error, {
            title: "Input Error",
            message: "Failed to read selected text or clipboard.",
          });
          console.error("Clipboard error details:", errorMessage);
          setIsLoading(false);
          return;
        }
      }

      // Validate that we have mermaid code
      if (!mermaidCode || mermaidCode.trim().length === 0) {
        setError("No valid input found. The selected text or clipboard appears to be empty.");
        await showFailureToast({
          title: "Empty Input",
          message: "The selected text or clipboard content is empty.",
        });
        setIsLoading(false);
        return;
      }

      // Log the source and first part of the code for debugging
      console.log(`Using ${sourceType} as source`);
      console.log("Mermaid code preview:", mermaidCode.substring(0, 200));
      console.log("Mermaid code includes 'sequenceDiagram':", mermaidCode.includes("sequenceDiagram"));
      console.log("Mermaid code includes 'graph':", mermaidCode.includes("graph"));

      // Update toast to show generation progress
      await showToast({
        style: Toast.Style.Animated,
        title: "Generating diagram...",
        message: `Source: ${sourceType}`,
      });

      // Generate the diagram
      const outputPath = await generateMermaidDiagram(mermaidCode, tempFileRef);
      setImagePath(outputPath);

      await showToast({
        style: Toast.Style.Success,
        title: "Diagram generated successfully",
        message: `Generated from ${sourceType} text`,
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
    processMermaidCode(); // Process input on component mount
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
- Select text containing Mermaid syntax or copy it to clipboard
- Ensure your Mermaid syntax is valid
- Check that your diagram starts with a proper declaration (like \`graph TD\` or \`sequenceDiagram\`)
- Make sure Mermaid CLI is properly installed
- If selection doesn't work, try copying the text to clipboard

**Input Priority:** Selected text > Clipboard content

### Troubleshooting:
- Some applications may not support text selection properly
- Try using the copy function if selection fails
- Ensure there are no special characters that might cause issues

[View Mermaid Syntax Documentation](https://mermaid.js.org/syntax/flowchart.html)`}
        actions={
          <ActionPanel>
            <Action
              title="Try Again"
              icon={Icon.ArrowClockwise}
              shortcut={{ modifiers: ["cmd"], key: "r" }}
              onAction={() => processMermaidCode()}
            />
            <Action
              title="Use Clipboard Only"
              icon={Icon.Clipboard}
              shortcut={{ modifiers: ["cmd", "shift"], key: "v" }}
              onAction={generateFromClipboardOnly}
            />
          </ActionPanel>
        }
      />
    );
  }

  if (imagePath) {
    return <ImagePreview imagePath={imagePath} format={preferences.outputFormat} />;
  }

  // Fallback state - initial screen
  return (
    <Detail
      markdown={`# Ready to generate diagram

Select text containing Mermaid code or copy it to your clipboard, then press the Generate button.

**Input Priority:** Selected text > Clipboard content

## Example Mermaid syntax:
\`\`\`mermaid
graph TD
    A[Start] --> B{Is it working?}
    B -->|Yes| C[Great!]
    B -->|No| D[Debug]
    D --> B
\`\`\`

## Tips:
- If text selection doesn't work in your application, use copy instead
- Make sure to select/copy the entire Mermaid code including the diagram type declaration
- Some applications may have limitations with text selection

*Note: Make sure your text contains valid Mermaid syntax.*`}
      actions={
        <ActionPanel>
          <Action
            title="Generate Diagram"
            icon={Icon.Wand}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
            onAction={() => processMermaidCode()}
          />
          <Action
            title="Generate from Clipboard Only"
            icon={Icon.Clipboard}
            shortcut={{ modifiers: ["cmd", "shift"], key: "v" }}
            onAction={generateFromClipboardOnly}
          />
        </ActionPanel>
      }
    />
  );
}
