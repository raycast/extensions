import { Action, ActionPanel, Icon, List, closeMainWindow, getPreferenceValues, popToRoot } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { openUrlInSearch } from "../lib/browser";
import { SearchEngineId } from "../lib/constants";
import { BrowserSettingsSnapshot } from "../lib/types";
import { buildNavigableUrl } from "../lib/utils";

interface FallbackSearchItemProps {
  query: string;
  browserSettings?: BrowserSettingsSnapshot | null;
}

export function FallbackSearchItem({ query, browserSettings }: FallbackSearchItemProps) {
  const trimmed = query.trim();
  if (!trimmed) return null;

  const preferences = getPreferenceValues<Preferences>();
  const { url, isSearch, engineName } = buildNavigableUrl(
    trimmed,
    preferences.searchEngine as SearchEngineId | undefined,
    browserSettings
  );

  const handleOpen = async () => {
    try {
      await closeMainWindow();
      await openUrlInSearch(url);
      await popToRoot();
    } catch (error) {
      await showFailureToast(error, { title: "Failed to open in Search Browser" });
    }
  };

  return (
    <List.Item
      id={`fallback:${trimmed}`}
      icon={isSearch ? Icon.MagnifyingGlass : Icon.Globe}
      title={isSearch ? `Search ${engineName} for "${trimmed}"` : `Open "${trimmed}" in Search Browser`}
      subtitle={isSearch ? engineName : url}
      actions={
        <ActionPanel>
          <Action
            title={isSearch ? `Search ${engineName} in Search Browser` : "Open URL in Search Browser"}
            icon={isSearch ? Icon.MagnifyingGlass : Icon.Globe}
            onAction={handleOpen}
          />
          <Action.CopyToClipboard title="Copy URL" content={url} />
        </ActionPanel>
      }
    />
  );
}
