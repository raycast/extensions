import React, { useState, useEffect, useRef, useCallback } from "react";
import { List, Icon, Color, ActionPanel, Action, useNavigation, closeMainWindow, showToast, Toast } from "@raycast/api";
import { DisplayTab, WorkspaceInfo } from "../types";
import {
  subscribeToWorkspaces,
  subscribeToTabs,
  getCurrentWorkspaces,
  getCurrentTabs,
  globalSocket,
  notifyViewReturn,
} from "../context/BrowserStore";
import { cache, getActionShortcut } from "../helpers";

// Disk-persisted workspace stats
const STATS_CACHE_KEY = "workspace_stats_cache";
function loadCachedStats(): Record<string, { tabCount: number; groupCount: number }> {
  try {
    const raw = cache.get(STATS_CACHE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    /* ignored */
  }
  return {};
}
function saveCachedStats(stats: Record<string, { tabCount: number; groupCount: number }>) {
  try {
    cache.set(STATS_CACHE_KEY, JSON.stringify(stats));
  } catch {
    /* ignored */
  }
}

/**
 * V412: Edge Color Mapper
 * Converts dark Edge workspace hexes into their vibrant 'light theme' counterparts.
 */
function ensureReadable(color: string | undefined): string | undefined {
  if (!color || !color.startsWith("#")) return color;
  try {
    let r = parseInt(color.slice(1, 3), 16);
    let g = parseInt(color.slice(3, 5), 16);
    let b = parseInt(color.slice(5, 7), 16);
    const max = Math.max(r, g, b);

    // If it's a pure gray or white, soften it to a pleasant silver
    if (r === g && g === b) {
      return r > 100 ? "#A0A0A0" : "#808080";
    }

    // Boost very dark colors proportionally so they become vibrant jewel tones
    if (max < 160) {
      const factor = 180 / (max || 1);
      r = Math.min(255, Math.round(r * factor));
      g = Math.min(255, Math.round(g * factor));
      b = Math.min(255, Math.round(b * factor));
    }
    // Soften excessively bright neon colors so they don't burn the eyes
    else if (max > 230) {
      const factor = 210 / max;
      r = Math.min(255, Math.round(r * factor));
      g = Math.min(255, Math.round(g * factor));
      b = Math.min(255, Math.round(b * factor));
    }

    return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
  } catch {
    /* ignored */
  }
  return color;
}

interface WorkspaceStat extends WorkspaceInfo {
  tabCount: number;
  groupCount: number;
  isActive: boolean;
  tabs: DisplayTab[];
  lastTabCount: number;
  lastGroupCount: number;
}

export function WorkspacesView() {
  const lastKnownStats = useRef<Record<string, { tabCount: number; groupCount: number }>>(loadCachedStats());
  const prevStatsHash = useRef<string>("");

  const [roster, setRoster] = useState<WorkspaceInfo[]>(() => getCurrentWorkspaces());
  const [workspaceStats, setWorkspaceStats] = useState<WorkspaceStat[]>([]);

  const { pop } = useNavigation();
  const workspacesShortcut = getActionShortcut("workspaces") || { modifiers: ["shift"], key: "w" };

  // Core math function (runs outside of React render cycle)
  const computeStats = useCallback((currentRoster: WorkspaceInfo[], currentTabs: DisplayTab[]) => {
    const stats: Record<string, { tabCount: number; groupIds: Set<string | number>; tabs: DisplayTab[] }> = {};

    currentRoster.forEach((w) => {
      stats[w.name] = { tabCount: 0, groupIds: new Set(), tabs: [] };
    });

    currentTabs.forEach((tab) => {
      if (tab.workspaceName && stats[tab.workspaceName]) {
        const s = stats[tab.workspaceName];
        s.tabCount++;
        s.tabs.push(tab);
        if (tab.groupId && tab.groupId !== -1) {
          s.groupIds.add(tab.groupId);
        }
      }
    });

    let hash = "";
    const result = currentRoster.map((w) => {
      const s = stats[w.name];
      const tabCount = s?.tabCount || 0;
      const groupCount = s?.groupIds.size || 0;
      const isActive = tabCount > 0;

      if (isActive) {
        lastKnownStats.current[w.name] = { tabCount, groupCount };
      }

      const cached = lastKnownStats.current[w.name];
      hash += `${w.name}:${w.guid}:${w.color}:${tabCount}:${groupCount};`;

      return {
        ...w,
        tabCount,
        groupCount,
        isActive,
        tabs: s?.tabs || [],
        lastTabCount: cached?.tabCount ?? 0,
        lastGroupCount: cached?.groupCount ?? 0,
      };
    });

    if (hash !== prevStatsHash.current) {
      prevStatsHash.current = hash;
      saveCachedStats(lastKnownStats.current);
      setWorkspaceStats(result);
    }
  }, []);

  // Initial mount computation
  useEffect(() => {
    computeStats(getCurrentWorkspaces(), getCurrentTabs());
  }, [computeStats]);

  useEffect(() => {
    const rosterRef = { current: getCurrentWorkspaces() };
    const tabsRef = { current: getCurrentTabs() };

    const unsubRoster = subscribeToWorkspaces((newRoster) => {
      rosterRef.current = newRoster;
      setRoster(newRoster);
      computeStats(rosterRef.current, tabsRef.current);
    });

    const unsubTabs = subscribeToTabs((newTabs) => {
      tabsRef.current = newTabs;
      computeStats(rosterRef.current, tabsRef.current);
    });

    return () => {
      unsubRoster();
      unsubTabs();
      // Flush stats to disk on cleanup
      saveCachedStats(lastKnownStats.current);
      // Tell the main tab list to re-render with fresh window data
      notifyViewReturn();
    };
  }, [computeStats]);

  const activateTab = (tab: DisplayTab) => {
    if (globalSocket && globalSocket.readyState === 1) {
      globalSocket.send(JSON.stringify({ type: "ACTIVATE_TAB", tabId: tab.id }));
      closeMainWindow();
    }
  };

  const closeWorkspace = (wsTabs: DisplayTab[]) => {
    const seen = new Set<string>();
    wsTabs.forEach((t) => {
      if (t.windowId) {
        const winIdStr = String(t.windowId);
        if (!seen.has(winIdStr)) {
          seen.add(winIdStr);
          if (globalSocket && globalSocket.readyState === 1) {
            const rawWinId = winIdStr.includes("-") ? winIdStr.split("-").slice(1).join("-") : winIdStr;
            const browser = t.browserType || "edge";
            globalSocket.send(JSON.stringify({ type: "CLOSE_WINDOW", windowId: rawWinId, browser }));
          }
        }
      }
    });
    showToast({ style: Toast.Style.Success, title: "Closing workspace..." });
  };

  return (
    <List
      searchBarPlaceholder="Search workspaces..."
      actions={
        <ActionPanel>
          <Action
            title="Back to Tabs"
            icon={{ source: Icon.ArrowLeft, tintColor: Color.Yellow }}
            shortcut={workspacesShortcut}
            onAction={pop}
          />
        </ActionPanel>
      }
    >
      <List.Section title="Edge Workspaces" subtitle={`${roster.length} found`}>
        {workspaceStats.map((ws) => {
          const subtitle = (() => {
            if (ws.isActive) {
              return `${ws.tabCount} tabs` + (ws.groupCount > 0 ? ` • ${ws.groupCount} groups` : "");
            }
            if (ws.lastTabCount > 0) {
              return `${ws.lastTabCount} tabs` + (ws.lastGroupCount > 0 ? ` • ${ws.lastGroupCount} groups` : "");
            }
            return "Inactive";
          })();

          return (
            <List.Item
              key={ws.name}
              title={ws.name}
              subtitle={subtitle}
              icon={{
                source: Icon.Map,
                tintColor: ensureReadable(ws.color) || (ws.isActive ? Color.Blue : Color.SecondaryText),
              }}
              accessories={[
                ws.isActive
                  ? {
                      icon: { source: Icon.ArrowNe, tintColor: Color.Green },
                      tag: { value: "ACTIVE", color: Color.Green },
                    }
                  : {},
              ]}
              actions={
                <ActionPanel>
                  {ws.isActive ? (
                    <>
                      <Action
                        title="View Workspace Tabs"
                        icon={Icon.Eye}
                        onAction={() => {
                          if (ws.tabs.length > 0) activateTab(ws.tabs[0]);
                        }}
                      />
                      <Action
                        title="Close Workspace"
                        icon={Icon.XMarkCircle}
                        style={Action.Style.Destructive}
                        onAction={() => closeWorkspace(ws.tabs)}
                      />
                    </>
                  ) : (
                    <Action
                      title="Open Workspace"
                      icon={Icon.Globe}
                      onAction={() => {
                        if (!ws.guid) {
                          showToast({
                            style: Toast.Style.Failure,
                            title: `Cannot Open ${ws.name}`,
                            message: "UUID Not Found",
                          });
                          return;
                        }
                        if (globalSocket && globalSocket.readyState === 1) {
                          globalSocket.send(JSON.stringify({ type: "OPEN_WORKSPACE", guid: ws.guid }));
                          showToast({ style: Toast.Style.Success, title: `Opening ${ws.name}...` });
                          setTimeout(() => {
                            if (globalSocket && globalSocket.readyState === 1) {
                              globalSocket.send(JSON.stringify({ type: "REFRESH" }));
                            }
                          }, 1000);
                        } else {
                          showToast({
                            style: Toast.Style.Failure,
                            title: "Connection Error",
                            message: "Not connected to the browser bridge.",
                          });
                        }
                      }}
                    />
                  )}
                  <ActionPanel.Section title="Navigation">
                    <Action
                      title="Back to Tabs"
                      icon={{ source: Icon.ArrowLeft, tintColor: Color.Yellow }}
                      shortcut={workspacesShortcut}
                      onAction={pop}
                    />
                  </ActionPanel.Section>
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>
    </List>
  );
}
