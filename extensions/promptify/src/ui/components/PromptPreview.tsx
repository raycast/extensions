import { Detail } from "@raycast/api";
import React from "react";

interface PromptPreviewProps {
  input: string;
  output: string | null;
  isLoading: boolean;
  error?: string;
  presetName?: string;
  actions?: React.ReactNode;
}

export function PromptPreview({ input, output, isLoading, error, presetName, actions }: PromptPreviewProps) {
  const markdown = React.useMemo(() => {
    if (error) {
      return `# ❌ Error\n\n${error}\n\n---\n\n## Original Input\n\n${input}`;
    }

    if (isLoading) {
      return `# ⏳ Processing...\n\nEnhancing your prompt${presetName ? ` with ${presetName} preset` : ""}...\n\n---\n\n## Input\n\n${input}`;
    }

    if (!output) {
      return `# 📝 Input\n\n${input}\n\n---\n\n*Use one of the actions below to enhance this prompt.*`;
    }

    return `# ✨ Enhanced Prompt\n\n${output}\n\n---\n\n## Original Input\n\n${input}`;
  }, [input, output, isLoading, error, presetName]);

  return (
    <Detail
      markdown={markdown}
      isLoading={isLoading}
      actions={actions}
      metadata={
        <Detail.Metadata>
          {presetName && <Detail.Metadata.Label title="Preset" text={presetName} />}
          {input && <Detail.Metadata.Label title="Input Length" text={`${input.length} characters`} />}
          {output && <Detail.Metadata.Label title="Output Length" text={`${output.length} characters`} />}
        </Detail.Metadata>
      }
    />
  );
}
