import {
  AI,
  Action,
  ActionPanel,
  Alert,
  confirmAlert,
  environment,
  Icon,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";

import { deleteBrainstorm } from "../brainstorm-data";
import { Brainstorm } from "../brainstorm-types";
import { createIssue } from "../issue-data";
import { IssuePriority } from "../issue-types";
import { BrainstormForm } from "./brainstorm-form";

interface BrainstormActionsProps {
  brainstorm: Brainstorm;
  projectName?: string;
  onRefresh: () => void;
  onCreateNew: (projectPath?: string) => void;
  onToggleDetail: () => void;
}

export function BrainstormActions({
  brainstorm,
  projectName,
  onRefresh,
  onCreateNew,
  onToggleDetail,
}: BrainstormActionsProps) {
  const { push } = useNavigation();

  async function handleGenerateIssues() {
    if (!environment.canAccess(AI)) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Raycast Pro required",
        message: "AI features require a Raycast Pro subscription",
      });
      return;
    }

    const toast = await showToast({ style: Toast.Style.Animated, title: "Analyzing brainstorm…" });

    const prompt = `You are a project management assistant. Analyze this brainstorm note and extract clear, actionable tasks from it.

Return ONLY a valid JSON array (no markdown fences, no explanation) with this exact structure:
[
  {
    "title": "Short, actionable issue title",
    "description": "Optional detail or context",
    "priority": "urgent" | "high" | "medium" | "low" | "no-priority"
  }
]

Rules:
- Each item must have a clear, actionable title
- Default priority is "medium" when unclear
- Extract 1–6 issues maximum
- Focus on concrete deliverables, not vague ideas
- Description is optional; omit if nothing meaningful to add

Brainstorm title: ${brainstorm.title}

Content:
${brainstorm.content || "(no content)"}`;

    try {
      const raw = await AI.ask(prompt, {
        creativity: "low",
        model: AI.Model["OpenAI_GPT-4o_mini"],
      });

      // Strip possible markdown code fences
      const cleaned = raw
        .replace(/^```(?:json)?\n?/m, "")
        .replace(/\n?```$/m, "")
        .trim();
      const parsed = JSON.parse(cleaned) as Array<{ title?: string; description?: string; priority?: string }>;

      if (!Array.isArray(parsed) || parsed.length === 0) {
        throw new Error("AI returned no issues");
      }

      const validPriorities = new Set<string>(["urgent", "high", "medium", "low", "no-priority"]);
      let count = 0;

      for (const item of parsed) {
        if (!item.title?.trim()) continue;
        createIssue({
          title: item.title.trim(),
          description: item.description?.trim() || undefined,
          status: "backlog",
          priority: validPriorities.has(item.priority ?? "") ? (item.priority as IssuePriority) : "medium",
          labels: [],
          projectPath: brainstorm.projectPath,
        });
        count++;
      }

      toast.style = Toast.Style.Success;
      toast.title = `Created ${count} issue${count !== 1 ? "s" : ""} from brainstorm`;
      onRefresh();
    } catch (err) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to generate issues";
      toast.message = String(err);
    }
  }

  async function handleDelete() {
    const confirmed = await confirmAlert({
      title: "Delete Brainstorm?",
      message: `"${brainstorm.title}" will be permanently deleted.`,
      primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
    });
    if (confirmed) {
      deleteBrainstorm(brainstorm.id);
      onRefresh();
    }
  }

  return (
    <ActionPanel title={brainstorm.title}>
      <ActionPanel.Section>
        <Action
          title="Generate Issues with AI"
          icon={Icon.Stars}
          shortcut={{ modifiers: ["cmd", "shift"], key: "g" }}
          onAction={() => void handleGenerateIssues()}
        />
        <Action
          title="Edit Brainstorm"
          icon={Icon.Pencil}
          onAction={() => push(<BrainstormForm brainstorm={brainstorm} onSave={onRefresh} />)}
        />
        <Action
          title="New Brainstorm for This Project"
          icon={Icon.Plus}
          shortcut={{ modifiers: ["cmd"], key: "n" }}
          onAction={() => onCreateNew(brainstorm.projectPath)}
        />
        <Action
          title="New Brainstorm"
          icon={Icon.Plus}
          shortcut={{ modifiers: ["cmd", "shift"], key: "n" }}
          onAction={() => onCreateNew()}
        />
      </ActionPanel.Section>
      <ActionPanel.Section>
        <Action title="Toggle Detail" icon={Icon.Eye} onAction={onToggleDetail} />
        <Action.CopyToClipboard
          title="Copy Content"
          content={brainstorm.content}
          shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
        />
        <Action.CopyToClipboard title="Copy Title" content={brainstorm.title} />
        {projectName ? <Action.CopyToClipboard title="Copy Project Name" content={projectName} /> : null}
      </ActionPanel.Section>
      <ActionPanel.Section>
        <Action
          title="Delete Brainstorm"
          icon={Icon.Trash}
          style={Action.Style.Destructive}
          shortcut={{ modifiers: ["ctrl", "shift"], key: "x" }}
          onAction={() => void handleDelete()}
        />
      </ActionPanel.Section>
    </ActionPanel>
  );
}
