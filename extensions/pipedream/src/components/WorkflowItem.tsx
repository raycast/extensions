import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { SavedWorkflow } from "../types";
import { AIErrorSummaryAction } from "./AIErrorSummary";
import { useUserInfo } from "../hooks/useUserInfo";

export interface WorkflowItemProps {
  workflow: SavedWorkflow;
  errorCount: number;
  onEditName?: () => void;
  onEditFolder?: () => void;
  onToggleMenuBar?: () => void;
  onDelete?: () => void;
  onViewErrors?: () => void;
  onViewDetails?: () => void;
  onExport?: () => void;
  onCustomAction?: () => void;
  customActionTitle?: string;
  customActionIcon?: Icon;
  onActivate?: () => void;
  onDeactivate?: () => void;
}

export function WorkflowItem({
  workflow,
  errorCount,
  onEditName,
  onEditFolder,
  onToggleMenuBar,
  onDelete,
  onViewErrors,
  onViewDetails,
  onExport,
  onCustomAction,
  customActionTitle,
  customActionIcon,
  onActivate,
  onDeactivate,
}: WorkflowItemProps) {
  const { orgId } = useUserInfo();

  return (
    <List.Item
      key={workflow.id}
      title={workflow.customName ?? workflow.id}
      subtitle={`ID: ${workflow.id}`}
      accessories={[
        { text: `Triggers: ${workflow.triggerCount}` },
        { text: `Steps: ${workflow.stepCount}` },
        { text: `Errors (7d): ${errorCount >= 100 ? "100+" : errorCount}` },
        { icon: workflow.showInMenuBar ? Icon.Eye : Icon.EyeSlash },
      ]}
      actions={
        <ActionPanel>
          <ActionPanel.Section title="Workflow Actions">
            {onCustomAction && customActionTitle && customActionIcon ? (
              <Action title={customActionTitle} icon={customActionIcon} onAction={onCustomAction} />
            ) : (
              <Action.OpenInBrowser url={workflow.url} icon={Icon.Globe} />
            )}
            {onEditName && (
              <Action
                title="Edit Name"
                icon={Icon.Pencil}
                onAction={onEditName}
                shortcut={{ modifiers: ["cmd"], key: "e" }}
              />
            )}
            {onEditFolder && (
              <Action
                title="Edit Folder"
                icon={Icon.Folder}
                onAction={onEditFolder}
                shortcut={{ modifiers: ["cmd"], key: "f" }}
              />
            )}
            {onExport && (
              <Action
                title="Export as JSON"
                icon={Icon.Download}
                onAction={onExport}
                shortcut={{ modifiers: ["cmd"], key: "x" }}
              />
            )}
            <Action.CopyToClipboard
              title="Copy Workflow ID"
              content={workflow.id}
              shortcut={{ modifiers: ["cmd"], key: "." }}
              icon={Icon.Clipboard}
            />
            <Action.CopyToClipboard
              title="Copy Workflow URL"
              content={workflow.url}
              shortcut={{ modifiers: ["cmd"], key: "s" }}
              icon={Icon.Link}
            />
          </ActionPanel.Section>

          <ActionPanel.Section title="Status Actions">
            {onActivate && (
              <Action
                title="Activate Workflow"
                icon={Icon.Play}
                onAction={onActivate}
                shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
              />
            )}
            {onDeactivate && (
              <Action
                title="Disable Workflow"
                icon={Icon.Pause}
                onAction={onDeactivate}
                shortcut={{ modifiers: ["cmd", "shift"], key: "o" }}
              />
            )}
            {onViewDetails && (
              <Action
                title="View Workflow Details"
                icon={Icon.BarChart}
                onAction={onViewDetails}
                shortcut={{ modifiers: ["cmd"], key: "r" }}
              />
            )}
            {onViewErrors && (
              <Action
                title="View Errors in Browser"
                icon={Icon.ExclamationMark}
                onAction={onViewErrors}
                shortcut={{ modifiers: ["cmd"], key: "v" }}
              />
            )}
            {!onCustomAction && <Action.OpenInBrowser url={workflow.url} title="Open in Pipedream" icon={Icon.Globe} />}
          </ActionPanel.Section>

          <ActionPanel.Section title="AI Actions">
            {orgId && errorCount > 0 && <AIErrorSummaryAction workflow={workflow} />}
          </ActionPanel.Section>

          <ActionPanel.Section title="Visibility Actions">
            {onToggleMenuBar && (
              <Action
                title={workflow.showInMenuBar ? "Remove From Menu Bar" : "Add to Menu Bar"}
                icon={workflow.showInMenuBar ? Icon.EyeSlash : Icon.Eye}
                onAction={onToggleMenuBar}
                shortcut={{ modifiers: ["cmd"], key: "m" }}
              />
            )}
          </ActionPanel.Section>

          {onDelete && (
            <ActionPanel.Section>
              <Action
                title="Remove From Extension"
                icon={Icon.Trash}
                onAction={onDelete}
                style={Action.Style.Destructive}
                shortcut={{ modifiers: ["cmd"], key: "backspace" }}
              />
            </ActionPanel.Section>
          )}
        </ActionPanel>
      }
    />
  );
}
