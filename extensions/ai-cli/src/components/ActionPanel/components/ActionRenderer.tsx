import { Action } from "@raycast/api";
import {
  ActionContext,
  CopyAction,
  DestructiveAction,
  GenerateAction,
  ManagementAction,
  PrimaryAction,
  SecondaryAction,
} from "@/types/actions";

// Common action rendering utilities

interface ActionRendererProps {
  onActionExecuted: (actionId: string) => void;
}

export function renderPrimaryActions(
  actions: PrimaryAction[],
  { onActionExecuted }: ActionRendererProps,
  context?: ActionContext
) {
  return actions.map((action) => {
    // Disable ask-agent action when processing
    const isDisabled = context?.isProcessing && action.id === "ask-agent";

    return (
      <Action
        key={action.id}
        title={action.title}
        icon={action.icon}
        shortcut={action.shortcut}
        data-testid={`action-${action.id}`}
        onAction={() => {
          if (!isDisabled) {
            action.onAction();
            onActionExecuted(action.id);
          }
        }}
      />
    );
  });
}

export function renderCopyActions(actions: CopyAction[], { onActionExecuted }: ActionRendererProps) {
  return actions.map((action) => (
    <Action.CopyToClipboard
      key={action.id}
      title={action.title}
      content={action.content}
      icon={action.icon}
      shortcut={action.shortcut}
      onCopy={() => onActionExecuted(action.id)}
    />
  ));
}

// Renders generate actions with loading state support
export function renderGenerateActions(actions: GenerateAction[], { onActionExecuted }: ActionRendererProps) {
  return actions.map((action) => (
    <Action
      key={action.id}
      title={action.isLoading ? `${action.title}...` : action.title}
      icon={action.icon}
      shortcut={action.shortcut}
      onAction={() => {
        action.onAction();
        onActionExecuted(action.id);
      }}
    />
  ));
}

// Renders secondary actions with Push/Action distinction
export function renderSecondaryActions(actions: SecondaryAction[], { onActionExecuted }: ActionRendererProps) {
  return actions.map((action) => {
    if (action.pushTarget) {
      return (
        <Action.Push
          key={action.id}
          title={action.title}
          icon={action.icon}
          shortcut={action.shortcut}
          target={action.pushTarget}
          onPush={() => onActionExecuted(action.id)}
        />
      );
    }

    return (
      <Action
        key={action.id}
        title={action.title}
        icon={action.icon}
        shortcut={action.shortcut}
        onAction={() => {
          action.onAction?.();
          onActionExecuted(action.id);
        }}
      />
    );
  });
}

export function renderManagementActions(actions: ManagementAction[], { onActionExecuted }: ActionRendererProps) {
  return actions.map((action) => (
    <Action
      key={action.id}
      title={action.title}
      icon={action.icon}
      shortcut={action.shortcut}
      onAction={() => {
        action.onAction();
        onActionExecuted(action.id);
      }}
    />
  ));
}

export function renderDestructiveActions(
  actions: DestructiveAction[],
  { onActionExecuted }: ActionRendererProps,
  handleDestructiveAction: (action: DestructiveAction) => Promise<void>
) {
  return actions.map((action) => (
    <Action
      key={action.id}
      title={action.title}
      icon={action.icon}
      shortcut={action.shortcut}
      style={Action.Style.Destructive}
      onAction={async () => {
        await handleDestructiveAction(action);
        onActionExecuted(action.id);
      }}
    />
  ));
}
