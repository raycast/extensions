import React from "react";
import { Detail, ActionPanel, Action, Icon } from "@raycast/api";
import { Command, ThinkingKeyword } from "../types";
import { useCopyToClipboard } from "../hooks/useCopyToClipboard";
import { BUDGET_DISPLAY } from "../utils/constants";

interface CommandDetailProps {
  command: Command;
  thinkingKeyword?: ThinkingKeyword;
}

export function CommandDetail({ command, thinkingKeyword }: CommandDetailProps) {
  const { copyToClipboard } = useCopyToClipboard();

  const isThinkingCategory = command.category === "thinking";

  const getBudgetDisplay = (budget: string) => {
    return BUDGET_DISPLAY[budget as keyof typeof BUDGET_DISPLAY] || { emoji: "", label: "", description: "" };
  };

  const generateMarkdown = () => {
    const sections = [];

    // Title
    sections.push(`# ${command.name}`);

    // Description
    if (command.description) {
      sections.push(`## Description\n${command.description}`);
    }

    // Usage (not for thinking category)
    if (command.usage && !isThinkingCategory) {
      sections.push(`## Usage\n\`\`\`\n${command.usage}\n\`\`\``);
    }

    // Example
    if (command.example && command.example !== command.usage) {
      sections.push(`## Example\n\`\`\`\n${command.example}\n\`\`\``);
    }

    // Thinking Keyword Details
    if (isThinkingCategory && thinkingKeyword) {
      const budgetDisplay = getBudgetDisplay(thinkingKeyword.budget);
      const thinkingDetails = [
        `## Thinking Keyword Details`,
        `- **Budget**: ${budgetDisplay.emoji} ${budgetDisplay.label} (${budgetDisplay.description})`,
        `- **Tokens**: ${thinkingKeyword.tokens}`,
        thinkingKeyword.description ? `- **Description**: ${thinkingKeyword.description}` : null,
      ]
        .filter(Boolean)
        .join("\n");
      sections.push(thinkingDetails);
    }

    // Deprecated
    if (command.deprecated) {
      const alternativeText = command.alternative
        ? `**Alternative**: \`${command.alternative}\``
        : `This command is deprecated and should not be used.`;
      sections.push(`## ⚠️ Deprecated\n${alternativeText}`);
    }

    // Warning
    if (command.warning) {
      sections.push(`## ⚠️ Warning\nUse this command with caution.`);
    }

    // Tags
    if (command.tags && command.tags.length > 0) {
      sections.push(`## Tags\n${command.tags.map(tag => `- ${tag}`).join("\n")}`);
    }

    return sections.join("\n\n");
  };

  return (
    <Detail
      markdown={generateMarkdown()}
      actions={
        <ActionPanel>
          {isThinkingCategory ? (
            <Action
              title="Copy Keyword"
              icon={Icon.Clipboard}
              onAction={() => copyToClipboard(command.name, `Keyword "${command.name}" copied to clipboard`)}
            />
          ) : (
            <Action
              title="Copy Usage"
              icon={Icon.Clipboard}
              onAction={() => copyToClipboard(command.usage, `Usage copied to clipboard`)}
            />
          )}

          {command.example && command.example !== command.usage && (
            <Action
              title="Copy Example"
              icon={Icon.Document}
              onAction={() => copyToClipboard(command.example!, `Example copied to clipboard`)}
            />
          )}

          {command.deprecated && command.alternative && (
            <Action
              title="Copy Alternative"
              icon={Icon.ArrowRight}
              onAction={() => copyToClipboard(command.alternative!, `Alternative copied to clipboard`)}
            />
          )}
        </ActionPanel>
      }
    />
  );
}
