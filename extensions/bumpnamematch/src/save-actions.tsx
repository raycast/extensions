import { Action, ActionPanel, Icon, Keyboard } from "@raycast/api";
import { addToList, type FavoriteList } from "./lib/api";

/**
 * Save-related actions for a name, rendered inside an ActionPanel in both the
 * search list and the detail view. Without an API key configured, it offers a
 * single action that opens the web page to create one.
 */
export function SaveActions({
  nameId,
  baseUrl,
  apiKey,
  lists,
}: {
  nameId: number;
  baseUrl: string;
  apiKey?: string;
  lists: FavoriteList[];
}) {
  if (!apiKey) {
    return (
      <Action.OpenInBrowser
        title="Connect Account to Save Names"
        icon={Icon.Key}
        url={`${baseUrl}/dashboard/api-keys`}
        shortcut={Keyboard.Shortcut.Common.Save}
      />
    );
  }

  const activeLists = lists.filter((l) => l.isArchived === 0);
  const defaultList = activeLists.find((l) => l.isDefault === 1) ?? activeLists[0];

  return (
    <ActionPanel.Section>
      {defaultList && (
        <Action
          title="Save to Favorites"
          icon={Icon.Star}
          shortcut={Keyboard.Shortcut.Common.Save}
          onAction={() => addToList(baseUrl, apiKey, defaultList.id, nameId, defaultList.name)}
        />
      )}
      {activeLists.length > 0 && (
        <ActionPanel.Submenu title="Add to List…" icon={Icon.PlusCircle} shortcut={Keyboard.Shortcut.Common.Duplicate}>
          {activeLists.map((list) => (
            <Action
              key={list.id}
              title={list.name}
              icon={list.isDefault === 1 ? Icon.Star : Icon.List}
              onAction={() => addToList(baseUrl, apiKey, list.id, nameId, list.name)}
            />
          ))}
        </ActionPanel.Submenu>
      )}
    </ActionPanel.Section>
  );
}
