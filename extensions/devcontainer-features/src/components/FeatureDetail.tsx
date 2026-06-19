import { Action, ActionPanel, Detail } from "@raycast/api";
import { useFeatureContent } from "../hooks/useFeatureContent";
import type { Feature, FeatureOption, ScriptFile } from "../types";
import {
  getFeatureCollectionName,
  getFeatureGitHubUrl,
} from "../utils/collection";
import { generateFullConfiguration } from "../utils/config";
import {
  convertRelativeImagePaths,
  escapeTableCell,
  formatEnumValues,
  stripFirstH1,
  truncateText,
} from "../utils/markdown";

interface FeatureDetailProps {
  feature: Feature;
}

function formatOptionType(option: FeatureOption): string {
  if (option.enum && option.enum.length > 0) {
    return `enum: ${formatEnumValues(option.enum, 3)}`;
  }
  return option.type;
}

function formatDefaultValue(value: string | boolean | undefined): string {
  if (value === undefined) return "none";
  if (typeof value === "boolean") return value ? "true" : "false";
  return `"${value}"`;
}

function generateOptionsTable(options: Record<string, FeatureOption>): string {
  const entries = Object.entries(options);
  if (entries.length === 0) return "";

  let table = "## Options\n\n";
  table += "| Option | Type | Default | Description |\n";
  table += "|--------|------|---------|-------------|\n";

  for (const [name, option] of entries) {
    const type = formatOptionType(option);
    const defaultVal = formatDefaultValue(option.default);
    const desc = truncateText(escapeTableCell(option.description || "-"), 60);
    table += `| \`${name}\` | ${type} | ${defaultVal} | ${desc} |\n`;
  }

  return table;
}

function generateUsageExample(feature: Feature): string {
  let example = "## Usage\n\n";
  example += "Add to your `devcontainer.json`:\n\n";
  example += "```json\n";
  example += `{\n  "features": {\n    "${feature.reference}": {}\n  }\n}\n`;
  example += "```\n";

  // If there are options, show an example with options
  if (feature.options && Object.keys(feature.options).length > 0) {
    const firstOption = Object.keys(feature.options)[0];
    const optionDef = feature.options[firstOption];
    let exampleValue: string;

    if (optionDef.default !== undefined) {
      exampleValue =
        typeof optionDef.default === "boolean"
          ? String(optionDef.default)
          : `"${optionDef.default}"`;
    } else if (optionDef.enum && optionDef.enum.length > 0) {
      exampleValue = `"${optionDef.enum[0]}"`;
    } else if (optionDef.type === "boolean") {
      exampleValue = "true";
    } else {
      exampleValue = '"value"';
    }

    example += "\nWith options:\n\n";
    example += "```json\n";
    example += `{\n  "features": {\n    "${feature.reference}": {\n      "${firstOption}": ${exampleValue}\n    }\n  }\n}\n`;
    example += "```\n";
  }

  return example;
}

function generateScriptsMarkdown(
  scripts: ScriptFile[],
  isLoading: boolean,
): string {
  if (scripts.length > 0) {
    return (
      scripts
        .map((s) => {
          const lines = s.content.split("\n");
          const lineCount = lines.length;
          // Truncate long scripts for better performance
          const maxLines = 50;
          const preview =
            lineCount > maxLines
              ? lines.slice(0, maxLines).join("\n") +
                `\n\n... (${lineCount - maxLines} more lines)`
              : s.content;
          return `## ${s.name} (${lineCount} lines)\n\n\`\`\`bash\n${preview}\n\`\`\``;
        })
        .join("\n\n---\n\n") + "\n\n---\n\n"
    );
  }
  if (isLoading) {
    return "*Loading scripts...*\n\n---\n\n";
  }
  return "";
}

export function FeatureDetail({ feature }: FeatureDetailProps) {
  const { content, isLoading } = useFeatureContent(feature);
  const collectionName = getFeatureCollectionName(feature);
  const githubUrl = getFeatureGitHubUrl(feature);

  let markdown = `# ${feature.name}\n\n`;

  if (feature.description) {
    markdown += `${feature.description}\n\n`;
  }

  markdown += `**Reference:** \`${feature.reference}\`\n\n`;
  markdown += `**Collection:** [${collectionName}](${githubUrl})\n\n`;

  if (feature.documentationURL) {
    markdown += `**Documentation:** [View Docs](${feature.documentationURL})\n\n`;
  }

  markdown += "---\n\n";

  if (content.readme) {
    // Strip H1 and convert relative image paths
    let readmeBody = stripFirstH1(content.readme);
    readmeBody = convertRelativeImagePaths(
      readmeBody,
      feature.collection.sourceInformation,
      feature.id,
    );
    if (readmeBody) {
      markdown += `## README\n\n${readmeBody}\n\n---\n\n`;
    }
  } else if (isLoading) {
    markdown += "*Loading README...*\n\n---\n\n";
  }

  markdown += generateScriptsMarkdown(content.scripts, isLoading);

  markdown += generateUsageExample(feature);

  if (feature.options && Object.keys(feature.options).length > 0) {
    markdown += "\n---\n\n";
    markdown += generateOptionsTable(feature.options);
  }

  return (
    <Detail
      isLoading={isLoading}
      markdown={markdown}
      navigationTitle={feature.name}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="ID" text={feature.id} />
          <Detail.Metadata.Label title="Collection" text={collectionName} />
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label
            title="Options"
            text={
              feature.options
                ? `${Object.keys(feature.options).length} available`
                : "None"
            }
          />
          {feature.documentationURL && (
            <Detail.Metadata.Link
              title="Documentation"
              text="View Docs"
              target={feature.documentationURL}
            />
          )}
          <Detail.Metadata.Link
            title="Source"
            text="GitHub"
            target={githubUrl}
          />
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.CopyToClipboard
              title="Copy Reference"
              content={`"${feature.reference}"`}
              shortcut={{ modifiers: ["cmd"], key: "c" }}
            />
            <Action.CopyToClipboard
              title="Copy Reference Without Quotes"
              content={feature.reference}
              shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
            />
          </ActionPanel.Section>
          <ActionPanel.Section>
            {feature.documentationURL && (
              <Action.OpenInBrowser
                title="Open Documentation"
                url={feature.documentationURL}
                shortcut={{ modifiers: ["cmd"], key: "o" }}
              />
            )}
            <Action.OpenInBrowser
              title="Open Source Repository"
              url={githubUrl}
              shortcut={{ modifiers: ["cmd", "shift"], key: "o" }}
            />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action.CopyToClipboard
              title="Copy Usage Example"
              content={`{\n  "features": {\n    "${feature.reference}": {}\n  }\n}`}
              shortcut={{ modifiers: ["cmd", "opt"], key: "c" }}
            />
            {feature.options && Object.keys(feature.options).length > 0 && (
              <Action.CopyToClipboard
                title="Copy Full Configuration"
                content={generateFullConfiguration(feature)}
                shortcut={{ modifiers: ["cmd", "opt", "shift"], key: "c" }}
              />
            )}
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
