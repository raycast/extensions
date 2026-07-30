import type { CheatsheetItem, CommandExample } from "../types";

function codeBlock(value: string): string {
  return `\`\`\`bash\n${value}\n\`\`\``;
}

function markdownText(value: string): string {
  return value.replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

interface MarkdownOptions {
  examples?: CommandExample[];
  effectiveCommand?: string;
}

export function createItemMarkdown(item: CheatsheetItem, options: MarkdownOptions = {}): string {
  const examples = options.examples ?? item.examples ?? [];
  const effectiveCommand = options.effectiveCommand ?? item.usage;
  const isRefreshContext = item.id === "command-model" && effectiveCommand === "/model --refresh";
  const sections = [
    `# ${markdownText(item.name)}`,
    `## Usage\n${codeBlock(item.usage)}`,
    `## Description\n${markdownText(item.description)}`,
  ];

  if (examples.length) {
    const examplesMarkdown = examples
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
    sections.push(`## Examples\n${examplesMarkdown}`);
  }

  if (item.warning && !isRefreshContext) {
    sections.push(`## ⚠️ Warning\n${markdownText(item.warning)}`);
  }

  return sections.join("\n\n");
}
