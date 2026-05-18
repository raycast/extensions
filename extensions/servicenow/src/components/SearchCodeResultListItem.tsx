import { Action, ActionPanel, Color, Icon, Keyboard, List } from "@raycast/api";

import CodeMatchDetail from "./CodeMatchDetail";
import Actions from "./Actions";
import FavoriteForm from "./FavoriteForm";

import { CodeSearchHit } from "../types";
import { buildServiceNowUrl } from "../utils/buildServiceNowUrl";
import { getTableIconAndColor } from "../utils/getTableIconAndColor";
import { expandKeywords } from "../utils/expandKeywords";

export default function SearchCodeResultListItem({
  hit,
  tableLabel,
  instanceName,
  favoriteId,
  revalidateSearchResults,
  addUrlToFavorites,
  removeFromFavorites,
  revalidateFavorites,
}: {
  hit: CodeSearchHit;
  tableLabel: string;
  instanceName: string;
  favoriteId: string;
  revalidateSearchResults: () => void;
  addUrlToFavorites: (title: string, url: string, groupId?: string, revalidate?: () => void) => void;
  removeFromFavorites: (id: string, title: string, isGroup: boolean, revalidate?: () => void) => Promise<void>;
  revalidateFavorites: () => void;
}) {
  const recordUrl = `/${hit.className}.do?sys_id=${hit.sysId}`;
  const url = buildServiceNowUrl(instanceName, recordUrl);

  const { icon: iconName, color: colorName } = getTableIconAndColor(hit.className);
  const itemIcon = {
    source: Icon[iconName as keyof typeof Icon] ?? Icon.Info,
    tintColor: Color[colorName as keyof typeof Color] ?? Color.SecondaryText,
  };

  const totalLineMatches = hit.matches.reduce((sum, m) => sum + (m.count ?? 0), 0);

  const keywords = expandKeywords(hit.name, tableLabel, hit.className);

  const accessories: List.Item.Accessory[] = [];
  if (favoriteId) {
    accessories.push({
      icon: { source: Icon.Star, tintColor: Color.Yellow },
      tooltip: "Favorite",
    });
  }
  accessories.push({
    text: totalLineMatches.toString(),
    tooltip: `${totalLineMatches} match${totalLineMatches === 1 ? "" : "es"}`,
  });

  return (
    <List.Item
      key={hit.sysId}
      title={hit.name || "(unnamed)"}
      icon={itemIcon}
      keywords={keywords}
      actions={
        <ActionPanel>
          <ActionPanel.Section title={hit.name}>
            <Action.OpenInBrowser title="Open in ServiceNow" url={url} icon={{ source: "servicenow.svg" }} />
            <Action.Push
              title="Show Matches"
              icon={Icon.Sidebar}
              target={<CodeMatchDetail hit={hit} tableLabel={tableLabel} instanceName={instanceName} />}
            />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action.CopyToClipboard title="Copy URL" content={url} shortcut={Keyboard.Shortcut.Common.CopyPath} />
          </ActionPanel.Section>
          {!favoriteId && (
            <Action
              title="Add Favorite"
              icon={Icon.Star}
              onAction={() => addUrlToFavorites(hit.name, recordUrl)}
              shortcut={{ modifiers: ["shift", "cmd"], key: "f" }}
            />
          )}
          {favoriteId && (
            <>
              <Action.Push
                title="Edit Favorite"
                icon={Icon.Pencil}
                target={<FavoriteForm favoriteId={favoriteId} />}
                shortcut={Keyboard.Shortcut.Common.Edit}
              />
              <Action
                title="Remove Favorite"
                icon={Icon.StarDisabled}
                style={Action.Style.Destructive}
                onAction={() => removeFromFavorites(favoriteId, hit.name, false)}
                shortcut={{ modifiers: ["shift", "cmd"], key: "f" }}
              />
            </>
          )}
          <Actions
            revalidate={() => {
              revalidateFavorites();
              revalidateSearchResults();
            }}
          />
        </ActionPanel>
      }
      accessories={accessories}
    />
  );
}
