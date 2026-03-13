import { ActionPanel, Action, Icon, List, showToast, Toast, confirmAlert, closeMainWindow } from "@raycast/api";
import { useEffect, useState } from "react";
import { LocalhostItem } from "./types/LocalhostItem";
import { getLocalhostItems } from "./services/localhostService";
import { useServiceIcon, usePageTitle } from "./utils/webHooks";
import { createDisplayName, getProjectName } from "./utils/projectUtils";
import { execFile } from "child_process";

export default function Command() {
  const [items, setItems] = useState<LocalhostItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    async function loadLocalhostProcesses() {
      setLoading(true);

      try {
        const localhostItems = await getLocalhostItems();
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
  }, [refresh]);

  return (
    <List isLoading={loading} searchBarPlaceholder="Search local servers...">
      {items.length === 0 && !loading ? (
        <List.EmptyView title="No local Node.js servers found" />
      ) : (
        items.map((item: LocalhostItem) => (
          <LocalhostListItem key={item.id} item={item} onActionComplete={() => setRefresh((r) => r + 1)} />
        ))
      )}
    </List>
  );
}

function LocalhostListItem({ item, onActionComplete }: { item: LocalhostItem; onActionComplete: () => void }) {
  const { favicon } = useServiceIcon(item.url);
  const { title } = usePageTitle(item.url);

  async function handleKillProcess() {
    if (
      await confirmAlert({
        title: `Kill Process ${item.pid}?`,
        message: `This will terminate the process running on port ${item.port}.`,
        icon: Icon.XMarkCircle,
        primaryAction: {
          title: "Kill Process",
        },
      })
    ) {
      const toast = await showToast({
        style: Toast.Style.Animated,
        title: `Terminating process ${item.pid}...`,
      });

      execFile(`kill`, [item.pid], (error) => {
        if (error) {
          toast.style = Toast.Style.Failure;
          toast.title = `Failed to kill process ${item.pid}`;
          toast.message = error.message;
        } else {
          toast.style = Toast.Style.Success;
          toast.title = `Process ${item.pid} terminated successfully`;
          setTimeout(() => {
            onActionComplete();
            closeMainWindow();
          }, 1000);
        }
      });
    }
  }

  return (
    <List.Item
      key={item.id}
      icon={favicon ? { source: favicon } : Icon.Globe}
      title={createDisplayName(title || getProjectName(item.projectPath), item.framework)}
      subtitle={item.url}
      accessories={[{ tag: item.port }]}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.OpenInBrowser url={item.url} />
            <Action.CopyToClipboard content={item.url} title="Copy URL" />
            <Action.CopyToClipboard content={item.pid} title="Copy Process ID" />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action
              title="Kill Process"
              icon={Icon.XMarkCircle}
              style={Action.Style.Destructive}
              onAction={handleKillProcess}
              shortcut={{ modifiers: ["ctrl"], key: "x" }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
