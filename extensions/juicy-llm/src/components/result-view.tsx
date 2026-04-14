import { Action, ActionPanel, Detail } from "@raycast/api";
import type React from "react";

interface ResultViewProps {
  originalText: string;
  result: string;
  isLoading: boolean;
  title?: string;
  extraActions?: React.JSX.Element;
}

export function ResultView({
  originalText,
  result,
  isLoading,
  title,
  extraActions,
}: ResultViewProps) {
  const markdown = buildMarkdown(originalText, result, isLoading);

  return (
    <Detail
      isLoading={isLoading}
      navigationTitle={title}
      markdown={markdown}
      actions={
        <ActionPanel>
          {!isLoading && result && (
            <>
              <Action.Paste title="Paste to Active App" content={result} />
              <Action.CopyToClipboard
                title="Copy Result"
                content={result}
                shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
              />
              <Action.CopyToClipboard
                title="Copy Original"
                content={originalText}
                shortcut={{ modifiers: ["cmd", "shift"], key: "o" }}
              />
            </>
          )}
          {extraActions}
        </ActionPanel>
      }
    />
  );
}

function buildMarkdown(
  original: string,
  result: string,
  isLoading: boolean,
): string {
  const parts: string[] = [];

  parts.push("### Original\n");
  parts.push(`\`\`\`\n${original}\n\`\`\`\n`);
  parts.push("---\n");
  parts.push("### Result\n");

  if (result) {
    parts.push(result);
  } else if (isLoading) {
    parts.push("*Processing...*");
  }

  return parts.join("\n");
}
