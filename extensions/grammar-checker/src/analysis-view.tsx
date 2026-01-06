import React from "react";
import {
  Action,
  ActionPanel,
  Color,
  Detail,
  Icon,
  useNavigation,
} from "@raycast/api";
import { CheckResult } from "./api";
import CheckGrammar from "./check-grammar";

interface AnalysisViewProps {
  result: CheckResult;
  originalText: string;
}

export default function AnalysisView({
  result,
  originalText,
}: AnalysisViewProps) {
  const { push } = useNavigation();

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case "error":
        return { source: Icon.XMarkCircle, tintColor: Color.Red };
      case "warning":
        return { source: Icon.ExclamationMark, tintColor: Color.Orange };
      case "suggestion":
        return { source: Icon.LightBulb, tintColor: Color.Blue };
      default:
        return Icon.Circle;
    }
  };

  const issuesMarkdown =
    result.issues.length > 0
      ? result.issues
          .map(
            (issue) => `
---
### ${issue.type.toUpperCase()} (${issue.severity})
**Original:** "${issue.original}"
**Correction:** "${issue.correction}"
**Explanation:** ${issue.explanation}
`,
          )
          .join("\n")
      : "\n\n**No issues found! Great job!**";

  const markdown = `
# Corrected Text
${result.corrected}

# Analysis
${issuesMarkdown}

# Original Text
${originalText}
  `;

  return (
    <Detail
      markdown={markdown}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label
            title="Issues Found"
            text={result.issues.length.toString()}
          />
          <Detail.Metadata.Separator />
          {result.issues.map((issue, index) => (
            <Detail.Metadata.Label
              key={index}
              title={issue.type}
              text={issue.severity}
              icon={getSeverityIcon(issue.severity)}
            />
          ))}
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action.CopyToClipboard
            title="Copy Corrected Text"
            content={result.corrected}
            shortcut={{ modifiers: ["cmd"], key: "return" }}
          />
          <Action.Paste
            title="Paste Corrected Text"
            content={result.corrected}
            shortcut={{ modifiers: ["cmd", "shift"], key: "return" }}
          />
          <Action.CopyToClipboard
            title="Copy Original Text"
            content={originalText}
            shortcut={{ modifiers: ["cmd", "opt"], key: "c" }}
          />
          <Action
            title="Re-check Text"
            icon={Icon.Redo}
            onAction={() => push(<CheckGrammar initialText={originalText} />)}
          />
        </ActionPanel>
      }
    />
  );
}
