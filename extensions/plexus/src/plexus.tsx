import { ActionPanel, Action, Icon, List, Color, showToast, Toast, confirmAlert, closeMainWindow } from "@raycast/api";
import { useCachedState } from "@raycast/utils";
import { useCallback, useEffect, useRef, useState } from "react";
import { LocalhostItem } from "./types/LocalhostItem";
import { streamLocalhostItems } from "./services/localhostService";
import { useServiceIcon } from "./utils/webHooks";
import { getProjectName } from "./utils/projectUtils";
import { execFile } from "child_process";

const byPort = (a: LocalhostItem, b: LocalhostItem) => parseInt(a.port) - parseInt(b.port);

const isWindows = process.platform === "win32";

// A color per framework so each server carries an at-a-glance identity — used both for the
// framework tag and to tint the fallback globe when a server has no favicon of its own.
const FRAMEWORK_COLORS: Record<string, Color> = {
  Laravel: Color.Red,
  Vite: Color.Purple,
  "Next.js": Color.PrimaryText,
  Nuxt: Color.Green,
  "Create React App": Color.Blue,
  "Webpack Dev Server": Color.Blue,
  Express: Color.Yellow,
  Nodemon: Color.Green,
  Django: Color.Green,
  Flask: Color.SecondaryText,
  Uvicorn: Color.Orange,
  Gunicorn: Color.Orange,
  Rails: Color.Red,
  PHP: Color.Purple,
  Nginx: Color.Green,
};

function frameworkColor(framework: string): Color | undefined {
  return FRAMEWORK_COLORS[framework];
}

export default function Command() {
  const { items, isLoading, revalidate } = useLocalhostServers();
  const [isShowingDetail, setIsShowingDetail] = useState(false);
  const toggleDetail = useCallback(() => setIsShowingDetail((shown) => !shown), []);

  return (
    <List isLoading={isLoading} isShowingDetail={isShowingDetail} searchBarPlaceholder="Search local servers...">
      {items.length === 0 && !isLoading ? (
        <List.EmptyView
          icon={Icon.Globe}
          title="No local web servers found"
          description="Start a dev server and it will show up here automatically."
          actions={
            <ActionPanel>
              <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={revalidate} />
            </ActionPanel>
          }
        />
      ) : (
        items.map((item: LocalhostItem) => (
          <LocalhostListItem
            key={item.id}
            item={item}
            isShowingDetail={isShowingDetail}
            onToggleDetail={toggleDetail}
            onActionComplete={revalidate}
          />
        ))
      )}
    </List>
  );
}

// Streams confirmed web servers in as each probe resolves, so the list fills progressively instead
// of blocking on the slowest server. The result is disk-cached (useCachedState) so reopening shows
// the last servers instantly while a fresh scan runs in the background.
function useLocalhostServers() {
  const [items, setItems] = useCachedState<LocalhostItem[]>("localhost-servers", []);
  const [isLoading, setIsLoading] = useState(true);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const revalidate = useCallback(async () => {
    if (mounted.current) setIsLoading(true);
    try {
      const all = await streamLocalhostItems((item) => {
        // Upsert by port (one row per port), keeping the list port-sorted as servers arrive.
        if (!mounted.current) return;
        setItems((prev) => [...prev.filter((i) => i.port !== item.port), item].sort(byPort));
      });
      // Reconcile to the authoritative scan: drops servers that are no longer listening.
      if (mounted.current) setItems(all);
    } catch (error) {
      if (mounted.current) {
        showToast({ style: Toast.Style.Failure, title: (error as Error).message || "Failed to get localhost servers" });
      }
    } finally {
      if (mounted.current) setIsLoading(false);
    }
  }, [setItems]);

  // revalidate is stable (memoized on the stable useCachedState setter), so this runs once on mount.
  useEffect(() => {
    revalidate();
  }, [revalidate]);

  return { items, isLoading, revalidate };
}

function LocalhostListItem({
  item,
  isShowingDetail,
  onToggleDetail,
  onActionComplete,
}: {
  item: LocalhostItem;
  isShowingDetail: boolean;
  onToggleDetail: () => void;
  onActionComplete: () => void;
}) {
  const { favicon } = useServiceIcon(item.url);
  const color = frameworkColor(item.framework);
  const name = item.title || getProjectName(item.projectPath);

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

  const accessories: List.Item.Accessory[] = [];
  if (item.source === "wsl") {
    accessories.push({
      tag: item.distro ? `WSL: ${item.distro}` : "WSL",
      tooltip: item.distro ? `Running in WSL distro ${item.distro}` : "Running in WSL",
    });
  }
  if (item.framework) {
    accessories.push({ tag: { value: item.framework, color }, tooltip: `Framework: ${item.framework}` });
  }
  accessories.push({ tag: { value: item.port, color: Color.Green }, tooltip: `Listening on port ${item.port}` });

  return (
    <List.Item
      key={item.id}
      icon={favicon ? { source: favicon } : { source: Icon.Globe, tintColor: color ?? Color.SecondaryText }}
      title={name}
      subtitle={isShowingDetail ? undefined : item.url}
      accessories={isShowingDetail ? undefined : accessories}
      detail={isShowingDetail ? <ServerDetail item={item} color={color} /> : undefined}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.OpenInBrowser url={item.url} />
            <Action.CopyToClipboard content={item.url} title="Copy URL" />
            <Action.CopyToClipboard content={item.pid} title="Copy Process ID" />
            <Action
              title="Toggle Details"
              icon={Icon.AppWindowSidebarRight}
              onAction={onToggleDetail}
              shortcut={{ modifiers: ["cmd"], key: "y" }}
            />
            <Action
              title="Refresh"
              icon={Icon.ArrowClockwise}
              onAction={onActionComplete}
              shortcut={{ modifiers: ["cmd"], key: "r" }}
            />
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

// Side metadata panel shown when the user toggles details (⌘Y). Surfaces everything we know
// about a server without cramming it into the row.
function ServerDetail({ item, color }: { item: LocalhostItem; color?: Color }) {
  const name = item.title || getProjectName(item.projectPath);
  const source = item.source === "wsl" ? (item.distro ? `WSL · ${item.distro}` : "WSL") : "Host";
  return (
    <List.Item.Detail
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label title="Name" text={name} />
          {item.framework ? (
            <List.Item.Detail.Metadata.TagList title="Framework">
              <List.Item.Detail.Metadata.TagList.Item text={item.framework} color={color} />
            </List.Item.Detail.Metadata.TagList>
          ) : null}
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.Link title="URL" target={item.url} text={item.url} />
          <List.Item.Detail.Metadata.Label title="Port" text={item.port} />
          <List.Item.Detail.Metadata.Label title="Process ID" text={item.pid} />
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.Label title="Source" text={source} />
          {item.projectPath ? <List.Item.Detail.Metadata.Label title="Project Path" text={item.projectPath} /> : null}
          {item.title ? <List.Item.Detail.Metadata.Label title="Page Title" text={item.title} /> : null}
        </List.Item.Detail.Metadata>
      }
    />
  );
}
