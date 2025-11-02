/**
 * List item component for app suggestions (uninstalled apps)
 */

import { List, ActionPanel, Action, Icon } from "@raycast/api";
import { AppSuggestion } from "../types";
import { useTranslations } from "../lib/i18n";

interface SuggestionListItemProps {
  suggestion: AppSuggestion;
  index: number;
}

export function SuggestionListItem({ suggestion, index }: SuggestionListItemProps) {
  const t = useTranslations();

  return (
    <List.Item
      key={`${suggestion.name}-${index}`}
      title={suggestion.name}
      subtitle={suggestion.category}
      accessories={[{ text: suggestion.description }]}
      icon={Icon.Download}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser title={t.searchOnWeb} url={suggestion.searchUrl} icon={Icon.MagnifyingGlass} />
          {suggestion.officialUrl && (
            <Action.OpenInBrowser
              title={t.visitOfficialWebsite}
              url={suggestion.officialUrl}
              icon={Icon.Globe}
              shortcut={{ modifiers: ["cmd"], key: "o" }}
            />
          )}
          <Action.CopyToClipboard
            title={t.copyAppName}
            content={suggestion.name}
            shortcut={{ modifiers: ["cmd"], key: "c" }}
          />
        </ActionPanel>
      }
    />
  );
}
