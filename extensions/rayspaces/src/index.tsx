import {
  List,
  ActionPanel,
  Action,
  Icon,
  Color,
  showToast,
  Toast,
} from "@raycast/api";
import { useEffect, useState, useMemo } from "react";
import {
  listWindows,
  focusWorkspace,
  focusWindow,
  AerospaceWindow,
} from "./utils/aerospace";

interface WorkspaceGroup {
  name: string;
  windows: AerospaceWindow[];
  isFocused: boolean;
  monitorId: number;
  monitorName: string;
  keywords: string[];
}

function renderDetail(group: WorkspaceGroup): string {
  if (!group.windows.length) return `## Space ${group.name}\n\nEmpty`;
  const byApp = new Map<string, AerospaceWindow[]>();
  for (const w of group.windows) {
    if (!byApp.has(w["app-name"])) byApp.set(w["app-name"], []);
    byApp.get(w["app-name"])!.push(w);
  }
  const lines: string[] = [`## Space ${group.name}`];
  for (const [app, ws] of byApp) {
    lines.push(`\n### ${app}`);
    for (const w of ws) {
      lines.push(`- ${w["window-title"] || "untitled"}`);
    }
  }
  return lines.join("\n");
}

function MetadataPanel({ group }: { group: WorkspaceGroup }) {
  return (
    <List.Item.Detail.Metadata>
      <List.Item.Detail.Metadata.Label
        title="Monitor"
        text={group.monitorName}
        icon={Icon.Desktop}
      />
      <List.Item.Detail.Metadata.Label
        title="Monitor ID"
        text={String(group.monitorId)}
      />
      <List.Item.Detail.Metadata.Separator />
      <List.Item.Detail.Metadata.TagList title="Windows">
        <List.Item.Detail.Metadata.TagList.Item
          text={String(group.windows.length)}
          color={Color.Blue}
        />
      </List.Item.Detail.Metadata.TagList>
      {group.windows[0]?.["workspace-root-container-layout"] && (
        <List.Item.Detail.Metadata.Label
          title="Layout"
          text={group.windows[0]["workspace-root-container-layout"].replace(
            /_/g,
            " ",
          )}
          icon={Icon.Sidebar}
        />
      )}
    </List.Item.Detail.Metadata>
  );
}

export default function Command() {
  const [windows, setWindows] = useState<AerospaceWindow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const result = listWindows();
      setWindows(result);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      setError(msg);
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to load windows",
        message: msg,
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  const groups = useMemo(() => {
    const map = new Map<
      string,
      { windows: AerospaceWindow[]; monitorId: number; monitorName: string }
    >();

    for (const w of windows) {
      const ws = w.workspace || "?";
      if (!map.has(ws)) {
        map.set(ws, {
          windows: [],
          monitorId: w["monitor-id"],
          monitorName: w["monitor-name"],
        });
      }
      const entry = map.get(ws)!;
      entry.windows.push(w);
      if (!entry.monitorName) entry.monitorName = w["monitor-name"];
    }

    const result: WorkspaceGroup[] = [];
    const appKeywords = new Map<string, Set<string>>();

    for (const ws of windows) {
      const key = ws.workspace || "?";
      if (!appKeywords.has(key)) appKeywords.set(key, new Set());
      const set = appKeywords.get(key)!;
      set.add(ws["app-name"]);
      if (ws["window-title"]) set.add(ws["window-title"]);
    }

    for (const [name, entry] of map) {
      const kw = Array.from(appKeywords.get(name) || []);
      result.push({
        name,
        windows: entry.windows,
        isFocused: entry.windows.some((w) => w["workspace-is-focused"]),
        monitorId: entry.monitorId,
        monitorName: entry.monitorName,
        keywords: kw,
      });
    }

    result.sort((a, b) => {
      const aNum = parseInt(a.name, 10);
      const bNum = parseInt(b.name, 10);
      if (!isNaN(aNum) && !isNaN(bNum)) return aNum - bNum;
      if (!isNaN(aNum)) return -1;
      if (!isNaN(bNum)) return 1;
      return a.name.localeCompare(b.name);
    });
    return result;
  }, [windows]);

  if (error) {
    return (
      <List>
        <List.EmptyView
          icon={Icon.ExclamationMark}
          title="Could not connect to Aerospace"
          description={error}
        />
      </List>
    );
  }

  return (
    <List
      isLoading={isLoading}
      isShowingDetail
      searchBarPlaceholder="Search apps and windows..."
      throttle
    >
      {groups.map((group) => (
        <List.Item
          key={`${group.monitorId}-${group.name}`}
          title={group.name}
          icon={Icon.Window}
          subtitle={`${group.windows.length} window${group.windows.length !== 1 ? "s" : ""}`}
          keywords={group.keywords}
          accessories={
            group.isFocused
              ? [{ tag: { value: "focused", color: Color.Yellow } }]
              : []
          }
          detail={
            <List.Item.Detail
              markdown={renderDetail(group)}
              metadata={<MetadataPanel group={group} />}
            />
          }
          actions={
            <ActionPanel>
              <Action
                title="Focus Space"
                icon={Icon.Terminal}
                onAction={() => focusWorkspace(group.name)}
              />
              <ActionPanel.Submenu
                title="Focus Window…"
                icon={Icon.Window}
                shortcut={{ modifiers: ["cmd", "shift"], key: "f" }}
              >
                {group.windows.map((w) => (
                  <Action
                    key={w["window-id"]}
                    title={`${w["app-name"]} - ${w["window-title"] || "(untitled)"}`}
                    onAction={() => focusWindow(w["window-id"])}
                  />
                ))}
              </ActionPanel.Submenu>
            </ActionPanel>
          }
        />
      ))}
      {!isLoading && groups.length === 0 && (
        <List.EmptyView
          icon={Icon.Window}
          title="No windows found"
          description="Aerospace is running but no windows were detected."
        />
      )}
    </List>
  );
}
