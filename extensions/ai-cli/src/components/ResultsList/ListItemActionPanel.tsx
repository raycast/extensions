import { Action, ActionPanel, Icon } from "@raycast/api";
import { FormattingVariant } from "@/types";
import { messages } from "@/locale/en/messages";
import { SHORTCUTS } from "@/components/shared/utils/action-builders";
import { JSX } from "react";

interface ListItemActionPanelProps {
  variant: FormattingVariant;
  searchPhrase?: string;
  onShowPrompt?: () => JSX.Element;
  onGenerate?: () => void;
}

/**
 * ActionPanel component for individual result list items in the ResultsList.
 *
 * Provides context-specific actions for each formatting variant including:
 * - Copy variant content with appropriate keyboard shortcuts (Cmd+Enter for first, Cmd+1-5 for numbered variants)
 * - Generate additional variants when available
 * - Regenerate current variant when available
 * - View full prompt details
 */
export function ListItemActionPanel({ variant, onShowPrompt, onGenerate }: ListItemActionPanelProps) {
  return (
    <ActionPanel title="Actions">
      {onGenerate ? (
        <Action
          icon={Icon.Stars}
          title={messages.actions.askFollowUpQuestion}
          shortcut={SHORTCUTS.GENERATE}
          onAction={onGenerate}
        />
      ) : (
        <Action.CopyToClipboard title={messages.actions.copyAnswer} content={variant.content} />
      )}

      {onShowPrompt && (
        <Action.Push
          title={messages.actions.showFullPrompt}
          icon={Icon.Document}
          shortcut={SHORTCUTS.VIEW_PROMPT}
          target={onShowPrompt()}
        />
      )}
    </ActionPanel>
  );
}
