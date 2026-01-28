import { Command, ThinkingKeyword } from "../types";
import { BUDGET_DISPLAY } from "./constants";
import { isCommand } from "./index";

export function getBudgetDisplay(budget: string) {
  return BUDGET_DISPLAY[budget as keyof typeof BUDGET_DISPLAY] || { emoji: "", label: "", description: "" };
}

export function generateCommandMarkdown(item: Command | ThinkingKeyword, thinkingKeyword?: ThinkingKeyword): string {
  const command: Command = isCommand(item)
    ? (item as Command)
    : {
        id: `thinking-${(item as ThinkingKeyword).keyword.replace(/\s+/g, "-")}`,
        name: (item as ThinkingKeyword).keyword,
        description: (item as ThinkingKeyword).description,
        usage: "Add to end of prompt",
        example: (item as ThinkingKeyword).example || `Your prompt here ${(item as ThinkingKeyword).keyword}`,
        category: "thinking",
        tags: [`${(item as ThinkingKeyword).budget} budget`, `${(item as ThinkingKeyword).tokens} tokens`],
      };

  const actualThinkingKeyword = thinkingKeyword || (!isCommand(item) ? (item as ThinkingKeyword) : undefined);
  const isThinkingCategory = command.category === "thinking";

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
  if (isThinkingCategory && actualThinkingKeyword) {
    const budgetDisplay = getBudgetDisplay(actualThinkingKeyword.budget);
    const thinkingDetails = [
      `## Thinking Keyword Details`,
      `- **Budget**: ${budgetDisplay.emoji} ${budgetDisplay.label} (${budgetDisplay.description})`,
      `- **Tokens**: ${actualThinkingKeyword.tokens}`,
      actualThinkingKeyword.description ? `- **Description**: ${actualThinkingKeyword.description}` : null,
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
}
