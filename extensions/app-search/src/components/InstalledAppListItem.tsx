/**
 * List item component for installed applications
 */

import { List, ActionPanel, Action } from "@raycast/api";
import { AppSearchResult } from "../types";
import { useTranslations } from "../lib/i18n";

interface InstalledAppListItemProps {
  result: AppSearchResult;
}

export function InstalledAppListItem({ result }: InstalledAppListItemProps) {
  const t = useTranslations();

  return (
    <List.Item
      key={result.app.bundleId || result.app.path}
      title={result.app.name}
      subtitle={result.matchReason}
      accessories={[
        { text: `${result.matchScore}%`, tooltip: t.matchScoreTooltip },
        result.app.bundleId ? { text: result.app.bundleId, tooltip: t.bundleIdTooltip } : {},
      ]}
      icon={{ fileIcon: result.app.path }}
      actions={
        <ActionPanel>
          <Action.Open title={t.launchApplication} target={result.app.path} />
          <Action.ShowInFinder title={t.showInFinder} path={result.app.path} />
          <Action.CopyToClipboard
            title={t.copyPath}
            content={result.app.path}
            shortcut={{ modifiers: ["cmd"], key: "c" }}
          />
          {result.app.bundleId && (
            <Action.CopyToClipboard
              title={t.copyBundleId}
              content={result.app.bundleId}
              shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
            />
          )}
        </ActionPanel>
      }
    />
  );
}
