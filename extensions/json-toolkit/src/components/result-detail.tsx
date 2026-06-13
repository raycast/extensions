import { Action, ActionPanel, Detail, Icon } from "@raycast/api";
import type { ReactNode } from "react";

import type { FormatResult } from "../lib/format-json";
import { buildCodeBlock, buildFormatResultMarkdown } from "../lib/markdown";

type FormatResultDetailProps = {
  result: FormatResult;
};

export function FormatResultDetail({ result }: FormatResultDetailProps) {
  const displayedText =
    result.kind === "valid" ? result.pretty : result.formatted;
  const language = result.kind === "valid" ? "json" : "text";

  return (
    <Detail
      markdown={buildFormatResultMarkdown(
        displayedText,
        language,
        result.kind === "fallback",
      )}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard
            title={
              result.kind === "valid"
                ? "Copy Pretty JSON"
                : "Copy Formatted Text"
            }
            content={displayedText}
            icon={Icon.Clipboard}
            shortcut={{ modifiers: ["cmd"], key: "c" }}
          />
          {result.kind === "valid" ? (
            <Action.CopyToClipboard
              title="Copy Minified JSON"
              content={result.minified}
              icon={Icon.Clipboard}
              shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
            />
          ) : null}
        </ActionPanel>
      }
    />
  );
}

type TextResultDetailProps = {
  additionalAction?: ReactNode;
  copyTitle: string;
  language?: string;
  text: string;
};

export function TextResultDetail({
  additionalAction,
  copyTitle,
  language = "text",
  text,
}: TextResultDetailProps) {
  return (
    <Detail
      markdown={buildCodeBlock(text, language)}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard
            title={copyTitle}
            content={text}
            icon={Icon.Clipboard}
            shortcut={{ modifiers: ["cmd"], key: "c" }}
          />
          {additionalAction}
        </ActionPanel>
      }
    />
  );
}
