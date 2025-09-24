import { ActionPanel, Action, Icon, List, showToast, Toast, getPreferenceValues } from "@raycast/api";
import { useEffect, useState } from "react";
import { LocalhostItem } from "./types/LocalhostItem";
import { getLocalhostItems } from "./services/localhostService";
import { useServiceIcon, usePageTitle } from "./utils/webHooks";
import { createDisplayName, getProjectName } from "./utils/projectUtils";

const preferences: Preferences = getPreferenceValues();
const { openProjectsWithApp } = preferences;

export default function Command() {
  const [items, setItems] = useState<LocalhostItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadLocalhostProcesses() {
      setLoading(true);

      try {
        const localhostItems = await getLocalhostItems();
        // Sort items by port number (ascending)
        const sortedItems = localhostItems.sort((a, b) => parseInt(a.port) - parseInt(b.port));
        setItems(sortedItems);
      } catch (error) {
        showToast({
          style: Toast.Style.Failure,
          title: error instanceof Error ? error.message : "Failed to get localhost processes",
        });
        setItems([]);
      } finally {
        setLoading(false);
      }
    }

    loadLocalhostProcesses();
  }, []);

  return (
    <List isLoading={loading} searchBarPlaceholder="Search local servers...">
      {items.length === 0 && !loading ? (
        <List.EmptyView title="No local Node.js servers found" />
      ) : (
        items.map((item: LocalhostItem) => <LocalhostListItem key={item.id} item={item} />)
      )}
    </List>
  );
}

function LocalhostListItem({ item }: { item: LocalhostItem }) {
  const { favicon } = useServiceIcon(item.url);
  const { title } = usePageTitle(item.url);

  return (
    <List.Item
      key={item.id}
      icon={favicon ? { source: favicon } : Icon.Globe}
      title={createDisplayName(title || getProjectName(item.projectPath), item.framework)}
      subtitle={item.url}
      accessories={[{ tag: item.port }]}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser url={item.url} />
          <Action.CopyToClipboard content={item.url} title="Copy URL" />
          <Action.CopyToClipboard content={item.pid} title="Copy Process ID" />
          {openProjectsWithApp ? (
            <Action.Open
              title={`Open in ${openProjectsWithApp.name}`}
              icon={{ fileIcon: openProjectsWithApp.path }}
              target={item.projectPath}
              application={openProjectsWithApp.path}
              shortcut={{ modifiers: ["opt"], key: "o" }}
            />
          ) : (
            <Action.OpenWith path={item.projectPath} shortcut={{ modifiers: ["opt"], key: "o" }} title="Open with" />
          )}
        </ActionPanel>
      }
    />
  );
}
