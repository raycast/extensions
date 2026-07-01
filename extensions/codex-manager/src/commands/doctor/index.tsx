import {
  Action,
  ActionPanel,
  Icon,
  List,
  Toast,
  Clipboard,
  getPreferenceValues,
  showInFinder,
  showToast,
} from "@raycast/api";
import { useEffect, useState } from "react";
import type { ValidationIssue } from "@/types";
import { expandTilde, pathExists } from "@/lib/paths";
import { readTomlConfig } from "@/lib/toml";
import { detectMcpBlockKey, getMcpServers } from "@/lib/mcp";
import { listSkills } from "@/lib/skills";
import { validateMcpServer, validateSkills } from "@/lib/validate";
import { openInEditor } from "@/lib/editor";

function buildReport(issues: ValidationIssue[]): string {
  if (issues.length === 0) {
    return "No issues found.";
  }
  return issues
    .map((issue) => {
      const detail = issue.detail ? ` - ${issue.detail}` : "";
      return `[${issue.severity.toUpperCase()}] ${issue.title}${detail}`;
    })
    .join("\n");
}

export default function DoctorCommand() {
  const preferences = getPreferenceValues<Preferences>();
  const configPath = expandTilde(preferences.configPath);
  const skillsDir = expandTilde(preferences.skillsDir);

  const [issues, setIssues] = useState<ValidationIssue[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  async function runDoctor() {
    setIsLoading(true);
    const nextIssues: ValidationIssue[] = [];

    const configExists = await pathExists(configPath);
    if (!configExists) {
      nextIssues.push({
        id: "config-missing",
        title: "config.toml not found",
        detail: configPath,
        severity: "error",
        action: "openConfig",
      });
    } else {
      try {
        const { doc } = await readTomlConfig(configPath);
        const blockKey = detectMcpBlockKey(doc);
        if (!blockKey) {
          nextIssues.push({
            id: "mcp-block-missing",
            title: "No MCP block found",
            detail: "Expected mcp_servers, mcp, or mcpServers",
            severity: "warning",
            action: "openConfig",
          });
        } else {
          const servers = getMcpServers(doc);
          for (const [name, server] of Object.entries(servers)) {
            const errors = validateMcpServer(name, server);
            for (const error of errors) {
              nextIssues.push({
                id: `mcp-${name}-${error}`,
                title: `MCP ${name}`,
                detail: error,
                severity: "error",
                action: "openConfig",
              });
            }
          }
        }
      } catch (error) {
        nextIssues.push({
          id: "toml-invalid",
          title: "Invalid TOML",
          detail: error instanceof Error ? error.message : "Unknown error",
          severity: "error",
          action: "openConfig",
        });
      }
    }

    const skillsExists = await pathExists(skillsDir);
    if (!skillsExists) {
      nextIssues.push({
        id: "skills-missing",
        title: "Skills folder not found",
        detail: skillsDir,
        severity: "warning",
        action: "openSkills",
      });
    } else {
      const skills = await listSkills(skillsDir);
      const skillErrors = validateSkills(skills);
      for (const error of skillErrors) {
        nextIssues.push({
          id: `skill-${error}`,
          title: "Skill issue",
          detail: error,
          severity: error.includes("Duplicate") ? "warning" : "error",
          action: "openSkills",
        });
      }
      for (const skill of skills) {
        if (!skill.hasSkillFile) {
          continue;
        }
        const description = skill.metadata?.description;
        if (typeof description !== "string" || description.trim().length === 0) {
          nextIssues.push({
            id: `skill-description-${skill.name}`,
            title: `Skill ${skill.name}`,
            detail: "Frontmatter description is empty.",
            severity: "warning",
            action: "openSkills",
          });
        }
      }
    }

    setIssues(nextIssues);
    setIsLoading(false);
  }

  useEffect(() => {
    runDoctor().catch(async (error) => {
      await showToast({
        style: Toast.Style.Failure,
        title: "Doctor failed",
        message: error instanceof Error ? error.message : "Unknown error",
      });
      setIsLoading(false);
    });
  }, [configPath, skillsDir]);

  async function handleCopyReport() {
    const report = buildReport(issues);
    await Clipboard.copy(report);
    await showToast({ style: Toast.Style.Success, title: "Report copied" });
  }

  async function handleOpenConfig() {
    await openInEditor(configPath, preferences.editorPreference);
  }

  async function handleOpenSkills() {
    await showInFinder(skillsDir);
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search issues">
      {issues.length === 0 ? (
        <List.EmptyView
          title="No issues found"
          actions={
            <ActionPanel>
              <Action title="Copy Report" onAction={handleCopyReport} />
            </ActionPanel>
          }
        />
      ) : (
        issues.map((issue) => (
          <List.Item
            key={issue.id}
            title={issue.title}
            subtitle={issue.detail}
            icon={issue.severity === "error" ? Icon.XmarkCircle : Icon.ExclamationMark}
            accessories={[{ tag: issue.severity.toUpperCase() }]}
            actions={
              <ActionPanel>
                {issue.action === "openConfig" && <Action title="Open Config.toml" onAction={handleOpenConfig} />}
                {issue.action === "openSkills" && <Action title="Open Skills Folder" onAction={handleOpenSkills} />}
                <Action title="Copy Report" onAction={handleCopyReport} />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}
