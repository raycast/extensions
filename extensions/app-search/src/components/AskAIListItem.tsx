/**
 * List item component for triggering AI search
 */

import { List, ActionPanel, Action, Icon } from "@raycast/api";
import { useTranslations } from "../lib/i18n";

interface AskAIListItemProps {
  onTriggerAI: () => void;
}

export function AskAIListItem({ onTriggerAI }: AskAIListItemProps) {
  const t = useTranslations();

  return (
    <List.Item
      title={t.askAITitle}
      subtitle={t.askAISubtitle}
      icon={Icon.Stars}
      accessories={[{ text: t.askAIAccessory, tooltip: t.searchWithAI }]}
      actions={
        <ActionPanel>
          <Action title={t.searchWithAI} icon={Icon.Stars} onAction={onTriggerAI} />
        </ActionPanel>
      }
    />
  );
}
