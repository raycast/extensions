import { ActionPanel, Action, Icon, List, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
import { LocalhostItem } from "./types/LocalhostItem";
import { getLocalhostItems } from "./services/localhostService";

export default function Command() {
  const [items, setItems] = useState<LocalhostItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadLocalhostProcesses() {
      setLoading(true);

      try {
        const localhostItems = await getLocalhostItems();
        setItems(localhostItems);
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
        items.map((item: LocalhostItem) => (
          <List.Item
            key={item.id}
            icon={item.favicon ? { source: item.favicon } : Icon.Globe}
            title={item.name}
            subtitle={item.url}
            accessories={[{ text: `Port: ${item.port}` }]}
            actions={
              <ActionPanel>
                <Action.OpenInBrowser url={item.url} />
                <Action.CopyToClipboard content={item.url} title="Copy URL" />
                <Action.CopyToClipboard content={item.pid} title="Copy Process Id" />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}
