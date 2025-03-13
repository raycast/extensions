import React, { useEffect, useState, useRef } from "react";
import { showToast, Toast, Detail, Icon, ActionPanel, Action } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { ImagePreview } from "./components/ImagePreview";
import { getSelectedText } from "./utils/clipboard";
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

  async function processMermaidCode(useSelection = false) {
    if (isProcessingRef.current) return;
    isProcessingRef.current = true;

    try {
      setIsLoading(true);
      setError(null);

      let mermaidCode;

      if (useSelection) {
        // Try to get selected text
        mermaidCode = await getSelectedText();
        if (!mermaidCode) {
          setError("No text was selected.");
          setIsLoading(false);
          await showFailureToast({
            title: "Failed to generate diagram",
            message: "No text was selected. Please select Mermaid diagram code first.",
          });
          return;
        }
      } else {
        // Use clipboard content
        try {
          mermaidCode = await Clipboard.readText();
          if (!mermaidCode) {
            setError("Clipboard is empty.");
            setIsLoading(false);
            await showFailureToast({
              title: "Failed to generate diagram",
              message: "Clipboard is empty. Please copy a Mermaid diagram code first.",
            });
            return;
          }
        } catch (error: unknown) {
          console.error("Failed to read clipboard:", error);
          const errorMessage = error instanceof Error ? error.message : String(error);
          setError(`Failed to read clipboard: ${errorMessage}`);
          setIsLoading(false);
          await showFailureToast({
            title: "Failed to read clipboard",
            message: errorMessage,
          });
          return;
        }
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
      console.error("Error details:", error);
      setError(String(error));
      await showFailureToast({
        title: "Diagram generation failed",
        message: String(error),
      });
    } finally {
      setIsLoading(false);
      isProcessingRef.current = false;
    }
  }

  useEffect(() => {
    processMermaidCode(false); // Default to using clipboard content
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
        markdown={`# Diagram generation failed\n\n${error}`}
        actions={
          <ActionPanel>
            <Action
              title="Generate from Clipboard"
              icon={Icon.Clipboard}
              shortcut={{ modifiers: ["cmd"], key: "r" }}
              onAction={() => processMermaidCode(false)}
            />
            <Action
              title="Generate from Selection"
              icon={Icon.Text}
              shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
              onAction={() => processMermaidCode(true)}
            />
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
      markdown="# Ready to generate diagram\n\nCopy Mermaid diagram code to your clipboard and press the Generate button.\n\n*Note: Make sure your clipboard contains valid Mermaid syntax.*"
      actions={
        <ActionPanel>
          <Action
            title="Generate from Clipboard"
            icon={Icon.Clipboard}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
            onAction={() => processMermaidCode(false)}
          />
          <Action
            title="Generate from Selection"
            icon={Icon.Text}
            shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
            onAction={() => processMermaidCode(true)}
          />
        </ActionPanel>
      }
    />
  );
}
