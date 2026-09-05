import type { CheatsheetItem, CommandExample, StatusBadge } from "../types";

function codeBlock(value: string): string {
  return `\`\`\`bash\n${value}\n\`\`\``;
}

function markdownText(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function bulletList(values: string[]): string {
  return values.map((value) => `- ${markdownText(value)}`).join("\n");
}

const STATUS_DESCRIPTIONS = {
  CAUTION: "Review the warning and command target before running it.",
  PERSISTS: "Changes saved state or configuration beyond the current session.",
  SESSION: "Applies to the current Hermes session.",
  RESTART: "May require a restart before the change takes effect.",
  DEPRECATED: "Kept for compatibility; prefer the documented replacement.",
  NEW: "Recently added to Hermes Agent.",
} as const;

function examplesMarkdown(examples: CommandExample[]): string {
  return examples
    .map((example) =>
      [
        `### ${markdownText(example.title)}`,
        codeBlock(example.command),
        example.description ? markdownText(example.description) : undefined,
      ]
        .filter(Boolean)
        .join("\n\n"),
    )
    .join("\n\n");
}

interface MarkdownOptions {
  examples?: CommandExample[];
  effectiveCommand?: string;
  effectiveStatuses?: StatusBadge[];
  relatedItems?: CheatsheetItem[];
}

export function createItemPreviewMarkdown(item: CheatsheetItem, options: MarkdownOptions = {}): string {
  const effectiveCommand = options.effectiveCommand ?? item.usage;
  const isRefreshContext = item.id === "command-model" && effectiveCommand === "/model --refresh";
  const sections = [`# ${markdownText(item.name)}`, codeBlock(effectiveCommand), markdownText(item.description)];

  if (item.warning && !isRefreshContext) {
    sections.push(`## ⚠️ Warning\n${markdownText(item.warning)}`);
  }

  return sections.join("\n\n");
}

export function createItemMarkdown(item: CheatsheetItem, options: MarkdownOptions = {}): string {
  const examples = options.examples ?? item.examples ?? [];
  const effectiveCommand = options.effectiveCommand ?? item.usage;
  const relatedItems = options.relatedItems ?? [];
  const isRefreshContext = item.id === "command-model" && effectiveCommand === "/model --refresh";
  const statuses = options.effectiveStatuses ?? item.statuses ?? [];
  const sections = [
    `# ${markdownText(item.name)}`,
    `## What it does\n${markdownText(item.description)}`,
    `## Usage\n${codeBlock(item.usage)}`,
  ];

  if (item.details?.whenToUse) {
    sections.push(`## When to use\n${markdownText(item.details.whenToUse)}`);
  }

  if (item.details?.prerequisites?.length) {
    sections.push(`## Before you run it\n${bulletList(item.details.prerequisites)}`);
  }

  if (item.details?.parameters?.length) {
    const parameters = item.details.parameters
      .map((parameter) => `- \`${parameter.name}\` — ${markdownText(parameter.description)}`)
      .join("\n");
    sections.push(`## Arguments and options\n${parameters}`);
  }

  if (examples.length) {
    sections.push(`## Examples\n${examplesMarkdown(examples)}`);
  }

  if (item.details?.workflow?.length) {
    sections.push(`## Recommended workflow\n${examplesMarkdown(item.details.workflow)}`);
  }

  if (statuses.length) {
    sections.push(
      `## Behavior and scope\n${statuses
        .map((status) => `- **${status}** — ${STATUS_DESCRIPTIONS[status]}`)
        .join("\n")}`,
    );
  }

  if (item.warning && !isRefreshContext) {
    sections.push(`## ⚠️ Warning\n${markdownText(item.warning)}`);
  }

  if (item.details?.notes?.length) {
    sections.push(`## Notes\n${bulletList(item.details.notes)}`);
  }

  if (item.platforms?.length) {
    sections.push(`## Available in\n${bulletList(item.platforms)}`);
  }

  if (relatedItems.length) {
    sections.push(
      `## Related commands\n${relatedItems
        .map((relatedItem) => `- \`${relatedItem.usage}\` — ${markdownText(relatedItem.description)}`)
        .join("\n")}`,
    );
  }

  sections.push(`## Official documentation\n[Open the Hermes Agent docs](${item.documentationUrl})`);

  return sections.join("\n\n");
}
