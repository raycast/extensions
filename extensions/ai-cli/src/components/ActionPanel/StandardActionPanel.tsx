import { ActionPanel, Alert, confirmAlert, showToast, Toast } from "@raycast/api";
import { ActionContext, ActionGroups, DestructiveAction } from "@/types/actions";
import { hasVisibleActions, useActionVisibility } from "@/hooks/useActionVisibility";
import { messages } from "@/locale/en/messages";
import {
  renderCopyActions,
  renderDestructiveActions,
  renderGenerateActions,
  renderManagementActions,
  renderPrimaryActions,
  renderSecondaryActions,
} from "./components/ActionRenderer";

interface StandardActionPanelProps {
  context: ActionContext;
  actions: ActionGroups;
  onActionExecuted: (actionId: string) => void;
}

// Handles destructive actions with confirmation dialog
async function handleDestructiveAction(action: DestructiveAction): Promise<void> {
  const confirmed = await confirmAlert({
    title: action.confirmationTitle || `Delete ${action.title}?`,
    message: action.confirmationMessage || messages.confirmations.deleteAction,
    primaryAction: {
      title: messages.confirmations.deleteButton,
      style: Alert.ActionStyle.Destructive,
    },
    dismissAction: {
      title: messages.confirmations.cancelButton,
    },
  });

  if (confirmed) {
    try {
      await action.onAction();
      await showToast({
        style: Toast.Style.Success,
        title: messages.confirmations.deletedTitle,
        message: messages.confirmations.deletedMessage.replace("{title}", action.title),
      });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: messages.confirmations.failedTitle,
        message: error instanceof Error ? error.message : messages.confirmations.failedMessage,
      });
    }
  }
}

// StandardActionPanel implements Raycast-compliant action structure with progressive disclosure
export default function StandardActionPanel({ context, actions, onActionExecuted }: StandardActionPanelProps) {
  // Apply progressive disclosure to filter visible actions
  const visibleActions = useActionVisibility(actions, context);

  // Track action execution for analytics
  const handleActionExecuted = (actionId: string) => {
    onActionExecuted(actionId);
  };

  const rendererProps = { onActionExecuted: handleActionExecuted };

  return (
    <ActionPanel>
      {/* PRIMARY ACTIONS: First actions, no section, get automatic shortcuts */}
      {renderPrimaryActions(visibleActions.primary, rendererProps, context)}

      {/* COPY ACTIONS: Grouped clipboard operations */}
      {hasVisibleActions(visibleActions.copy, context) && (
        <ActionPanel.Section title={messages.actions.copyActions}>
          {renderCopyActions(visibleActions.copy, rendererProps)}
        </ActionPanel.Section>
      )}

      {/* GENERATE ACTIONS: Content generation operations */}
      {hasVisibleActions(visibleActions.generate, context) && (
        <ActionPanel.Section title={messages.actions.generateActions}>
          {renderGenerateActions(visibleActions.generate, rendererProps)}
        </ActionPanel.Section>
      )}

      {/* SECONDARY ACTIONS: Enhancement and additional operations */}
      {hasVisibleActions(visibleActions.secondary, context) && (
        <ActionPanel.Section title={messages.actions.additionalActions}>
          {renderSecondaryActions(visibleActions.secondary, rendererProps)}
        </ActionPanel.Section>
      )}

      {/* MANAGEMENT ACTIONS: Administrative operations */}
      {hasVisibleActions(visibleActions.management, context) && (
        <ActionPanel.Section title={messages.actions.managementActions}>
          {renderManagementActions(visibleActions.management, rendererProps)}
        </ActionPanel.Section>
      )}

      {/* DESTRUCTIVE ACTIONS: Dangerous operations with confirmation */}
      {hasVisibleActions(visibleActions.destructive, context) && (
        <ActionPanel.Section title={messages.confirmations.dangerZone}>
          {renderDestructiveActions(visibleActions.destructive, rendererProps, handleDestructiveAction)}
        </ActionPanel.Section>
      )}
    </ActionPanel>
  );
}
