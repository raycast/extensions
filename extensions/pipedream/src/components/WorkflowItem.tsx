import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { SavedWorkflow, WorkflowError } from "../types";
import { getErrorResolutionStatus } from "../utils/error-resolution";
import { generateWeeklyErrorSummary } from "../utils/error-trending";

export interface WorkflowItemProps {
  workflow: SavedWorkflow;
  errorCount: number;
  currentErrors?: WorkflowError[];
  onEdit?: () => void;
  onViewErrors?: () => void;
  onCustomAction?: () => void;
}

export function WorkflowItem({
  workflow,
  errorCount,
  currentErrors = [],
  onEdit,
  onViewErrors,
  onCustomAction,
}: WorkflowItemProps) {
  const errorResolutionStatus = getErrorResolutionStatus(workflow, currentErrors);

  // Generate error trending summary for trend indicator
  const errorTrendingSummary = generateWeeklyErrorSummary(currentErrors);

  // Build accessories array with error resolution status
  const accessories = [
    { text: `Triggers: ${workflow.triggerCount}` },
    { text: `Steps: ${workflow.stepCount}` },
    { text: `Errors (7d): ${errorCount >= 100 ? "100+" : errorCount}` },
    { icon: workflow.showInMenuBar ? Icon.Eye : Icon.EyeSlash },
  ];

  // Add error trending indicator if there are errors
  if (errorCount > 0) {
    accessories.push({
      text: errorTrendingSummary.trend.indicator,
    });
  }

  // Add error resolution status if applicable
  if (errorResolutionStatus.isMarkedAsFixed) {
    if (errorResolutionStatus.hasNewErrors && errorResolutionStatus.newErrorsCount) {
      accessories.push({
        text: `+${errorResolutionStatus.newErrorsCount} new`,
      });
      accessories.push({
        icon: Icon.ExclamationMark,
      });
    } else {
      accessories.push({
        text: "Fixed",
      });
      accessories.push({
        icon: Icon.Checkmark,
      });
    }
  }

  return (
    <List.Item
      key={workflow.id}
      title={workflow.customName ?? workflow.id}
      subtitle={`ID: ${workflow.id}`}
      accessories={accessories}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            {onCustomAction ? (
              <Action title="View Details" icon={Icon.Info} onAction={onCustomAction} />
            ) : (
              <Action.OpenInBrowser url={workflow.url} title="Open in Browser" icon={Icon.Globe} />
            )}
            <Action.OpenInBrowser url={workflow.url} title="Open in Browser" icon={Icon.Globe} />
            {onEdit && (
              <Action
                title="Edit Workflow"
                icon={Icon.Pencil}
                onAction={onEdit}
                shortcut={{ modifiers: ["cmd"], key: "e" }}
              />
            )}
            {errorCount > 0 && onViewErrors && (
              <Action
                title="View Error Analytics"
                icon={Icon.ExclamationMark}
                onAction={onViewErrors}
                shortcut={{ modifiers: ["cmd"], key: "v" }}
              />
            )}
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
