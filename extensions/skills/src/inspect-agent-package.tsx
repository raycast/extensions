import { Action, ActionPanel, Detail, Form, Icon, useNavigation } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";

import { inspectLocalPackage, type PackageInspection } from "./utils/package-inspector";

function escapeMarkdown(value: string) {
  return value.replace(/\s+/g, " ").replace(/[\\`*_{}[\]()#+.!|<>-]/g, "\\$&");
}

function packageMarkdown(packageInfo: PackageInspection) {
  const validation = ["claude-plugin", "codex-plugin"].includes(packageInfo.kind)
    ? "Host-specific validation not run"
    : !packageInfo.valid
      ? "Issues found"
      : packageInfo.issues.length
        ? "Passed with warnings"
        : "Passed";
  const lines = [
    `# ${escapeMarkdown(packageInfo.name ?? "Agent Package")}`,
    "",
    `**Format:** ${escapeMarkdown(packageInfo.kind)}  `,
    `**Validation:** ${validation}`,
  ];
  if (packageInfo.description) lines.push("", escapeMarkdown(packageInfo.description));
  if (packageInfo.version) lines.push("", `**Version:** ${escapeMarkdown(packageInfo.version)}`);
  lines.push("", "## Skills");
  if (!packageInfo.skills.length) lines.push("No skills found.");
  for (const skill of packageInfo.skills) {
    lines.push("", `### ${escapeMarkdown(skill.name)} ${skill.valid ? "✓" : "⚠"}`);
    if (skill.description) lines.push(escapeMarkdown(skill.description));
    lines.push(`Path: ${escapeMarkdown(skill.path)}`);
    if (skill.license) lines.push(`License: ${escapeMarkdown(skill.license)}`);
    if (skill.compatibility) lines.push(`Compatibility: ${escapeMarkdown(skill.compatibility)}`);
    if (skill.allowedTools) lines.push(`Allowed tools (experimental): ${escapeMarkdown(skill.allowedTools)}`);
    if (skill.metadata) {
      lines.push(
        "",
        "Metadata:",
        ...Object.entries(skill.metadata).map(([key, value]) => `- ${escapeMarkdown(key)}: ${escapeMarkdown(value)}`),
      );
    }
    if (skill.files.length) lines.push("", "Resources:", ...skill.files.map((file) => `- ${escapeMarkdown(file)}`));
  }
  if (packageInfo.kind === "agent-plugin") {
    lines.push("", "## MCP Servers");
    if (!packageInfo.mcpServers.length) lines.push("No MCP servers found.");
    for (const server of packageInfo.mcpServers) {
      lines.push(
        `- ${escapeMarkdown(server.name)} (${escapeMarkdown(server.type)}): ${server.valid ? "valid" : "invalid"}`,
      );
    }
  }
  if (packageInfo.kind !== "skill") {
    lines.push("", "## Package Entries", ...packageInfo.entries.map((entry) => `- ${escapeMarkdown(entry)}`));
  }
  if (packageInfo.issues.length) {
    lines.push("", "## Validation Issues");
    for (const issue of packageInfo.issues) {
      lines.push(
        `- **${issue.level === "error" ? "Error" : "Warning"}** in ${escapeMarkdown(issue.path)}: ${escapeMarkdown(issue.message)}`,
      );
    }
  }
  lines.push("", "---", "Inspection only. No package code was executed or installed.");
  return lines.join("\n");
}

function PackageDetail({ path }: { path: string }) {
  const { data, error, isLoading, revalidate } = useCachedPromise(inspectLocalPackage, [path]);
  return (
    <Detail
      isLoading={isLoading}
      markdown={
        error
          ? `# Unable to inspect package\n\n${escapeMarkdown(error.message)}`
          : data
            ? packageMarkdown(data)
            : "Loading package..."
      }
      actions={
        <ActionPanel>
          <Action title="Inspect Again" icon={Icon.RotateClockwise} onAction={revalidate} />
          <Action.CopyToClipboard title="Copy Package Path" content={data?.root ?? path} />
        </ActionPanel>
      }
    />
  );
}

export default function Command() {
  const { push } = useNavigation();
  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Inspect Package"
            onSubmit={({ path }: { path: string }) => push(<PackageDetail path={path.trim()} />)}
          />
        </ActionPanel>
      }
    >
      <Form.TextField id="path" title="Package Folder" placeholder="~/path/to/skill-or-plugin" />
      <Form.Description text="Inspect a local Agent Skill or Plugin folder without installing or running it." />
    </Form>
  );
}
