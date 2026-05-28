import { List, ActionPanel, Action, Icon, Color } from "@raycast/api";
import { buildFixCommand } from "../lib/fix-commands";
import { copyToClipboard, openInEditor } from "../lib/actions";
import { join } from "node:path";
import type { HealthIssue } from "../lib/types";

function iconFor(sev: HealthIssue["severity"]) {
  if (sev === "error")
    return { source: Icon.XMarkCircle, tintColor: Color.Red };
  if (sev === "warning")
    return { source: Icon.Warning, tintColor: Color.Yellow };
  return { source: Icon.Info, tintColor: Color.SecondaryText };
}

export function IssueListItem({ issue }: { issue: HealthIssue }) {
  const primaryPath = issue.affectedPaths[0];
  return (
    <List.Item
      icon={iconFor(issue.severity)}
      title={issue.skillName}
      subtitle={issue.message}
      accessories={[{ tag: issue.check }]}
      actions={
        <ActionPanel>
          <Action
            title="Copy Fix Command"
            icon={Icon.WrenchScrewdriver}
            onAction={() =>
              copyToClipboard(buildFixCommand(issue), "Fix command copied")
            }
          />
          {primaryPath && (
            <Action
              title="Open in Editor"
              icon={Icon.Code}
              shortcut={{ modifiers: ["cmd"], key: "o" }}
              onAction={() => openInEditor(join(primaryPath, "SKILL.md"))}
            />
          )}
          {primaryPath && (
            <Action.ShowInFinder
              path={primaryPath}
              shortcut={{ modifiers: ["cmd", "shift"], key: "f" }}
            />
          )}
        </ActionPanel>
      }
    />
  );
}
