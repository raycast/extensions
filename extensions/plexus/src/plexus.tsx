import { ActionPanel, Action, Icon, List, showToast, Toast, confirmAlert, closeMainWindow } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { LocalhostItem } from "./types/LocalhostItem";
import { getLocalhostItems } from "./services/localhostService";
import { useServiceIcon, usePageTitle } from "./utils/webHooks";
import { createDisplayName, getProjectName } from "./utils/projectUtils";
import { execFile } from "child_process";

const isWindows = process.platform === "win32";

export default function Command() {
  // useCachedPromise shows the previous result instantly on reopen, then revalidates.
  const {
    data: items = [],
    isLoading,
    revalidate,
  } = useCachedPromise(getLocalhostItems, [], {
    onError: (error) => {
      showToast({ style: Toast.Style.Failure, title: error.message || "Failed to get localhost servers" });
    },
  });

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search local servers...">
      {items.length === 0 && !isLoading ? (
        <List.EmptyView title="No local web servers found" />
      ) : (
        items.map((item: LocalhostItem) => (
          <LocalhostListItem key={item.id} item={item} onActionComplete={revalidate} />
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

      // WSL servers must be killed inside their distro; Windows uses taskkill, macOS uses kill.
      let command: string;
      let args: string[];
      if (item.source === "wsl") {
        command = "wsl.exe";
        args = item.distro ? ["-d", item.distro, "-e", "kill", item.pid] : ["-e", "kill", item.pid];
      } else if (isWindows) {
        command = "taskkill";
        args = ["/PID", item.pid, "/F", "/T"];
      } else {
        command = "kill";
        args = [item.pid];
      }

      execFile(command, args, (error) => {
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

  const accessories =
    item.source === "wsl"
      ? [{ tag: item.distro ? `WSL: ${item.distro}` : "WSL" }, { tag: item.port }]
      : [{ tag: item.port }];

  return (
    <List.Item
      key={item.id}
      icon={favicon ? { source: favicon } : Icon.Globe}
      title={createDisplayName(title || getProjectName(item.projectPath), item.framework)}
      subtitle={item.url}
      accessories={accessories}
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
