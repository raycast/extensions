import React, { useState, useRef } from "react";
import {
  Form,
  ActionPanel,
  Action,
  showToast,
  Toast,
  Detail,
  Icon,
  getPreferenceValues,
  useNavigation,
} from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { ImagePreview } from "./components/ImagePreview";
import { generateMermaidDiagram } from "./utils/diagram";
import { cleanupTempFile } from "./utils/files";
import { MERMAID_EXAMPLES, validateMermaidCode } from "./utils/mermaid-helpers";
import { Preferences } from "./types";

interface FormValues {
  mermaidCode: string;
}

export default function Command() {
  const [mermaidCode, setMermaidCode] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState(false);
  const tempFileRef = useRef<string | null>(null);
  const preferences = getPreferenceValues<Preferences>();
  const { push } = useNavigation();

  const handleSubmit = async (values: FormValues) => {
    const validationError = validateMermaidCode(values.mermaidCode);
    if (validationError) {
      await showFailureToast({
        title: "Invalid Input",
        message: validationError,
      });
      return;
    }

    setIsGenerating(true);

    try {
      await showToast({
        style: Toast.Style.Animated,
        title: "Generating diagram...",
      });

      const outputPath = await generateMermaidDiagram(values.mermaidCode, tempFileRef);

      await showToast({
        style: Toast.Style.Success,
        title: "Diagram generated successfully",
      });

      // Navigate to the preview
      push(<ImagePreview imagePath={outputPath} format={preferences.outputFormat} showBackAction={true} />);
    } catch (error) {
      console.error("Error generating diagram:", error);

      let userMessage = "An unexpected error occurred.";
      if (error instanceof Error) {
        userMessage = error.message;
      } else if (typeof error === "string") {
        userMessage = error;
      }

      await showFailureToast(error, {
        title: "Diagram Generation Failed",
        message: userMessage,
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const insertExample = (exampleCode: string) => {
    setMermaidCode(exampleCode);
  };

  if (isGenerating) {
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
                if (tempFileRef.current) {
                  cleanupTempFile(tempFileRef.current);
                  tempFileRef.current = null;
                }
                setIsGenerating(false);
                showToast({
                  style: Toast.Style.Success,
                  title: "Operation cancelled",
                });
              }}
            />
          </ActionPanel>
        }
      />
    );
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Generate Diagram"
            icon={Icon.Image}
            shortcut={{ modifiers: ["cmd"], key: "enter" }}
            onSubmit={handleSubmit}
          />
          <ActionPanel.Section title="Examples">
            {MERMAID_EXAMPLES.slice(0, 4).map((example, index) => (
              <Action
                key={index}
                title={`Insert ${example.title}`}
                icon={Icon.Code}
                onAction={() => insertExample(example.code)}
              />
            ))}
          </ActionPanel.Section>
          <ActionPanel.Section title="Help">
            <Action.OpenInBrowser
              title="Mermaid Documentation"
              url="https://mermaid.js.org/syntax/flowchart.html"
              icon={Icon.Book}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="mermaidCode"
        title="Mermaid Code"
        placeholder={`Enter your Mermaid diagram code here...

Example:
graph TD
    A[Start] --> B{Decision}
    B -->|Yes| C[End]
    B -->|No| D[Continue]
    D --> A`}
        value={mermaidCode}
        onChange={setMermaidCode}
        enableMarkdown={false}
      />

      <Form.Description
        title="Tips"
        text="• Start with diagram type (graph, sequenceDiagram, classDiagram, etc.)
• Use the example actions above to get started quickly
• Check the Mermaid documentation for syntax help"
      />
    </Form>
  );
}
