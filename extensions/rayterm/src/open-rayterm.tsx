import { Action, ActionPanel, List, LocalStorage, Toast, showToast } from "@raycast/api";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import { readConfig } from "./config";
import { requestDaemon } from "./rayterm-client";
import { buildTerminalSvgMarkdown, getSvgTerminalSize } from "./render-terminal-svg";
import { DEFAULT_THEME_ID, THEMES, ThemeId, getTheme } from "./themes";
import { DaemonState, RaytermConfig, TerminalTab } from "./types";

const REFRESH_INTERVAL_MS = 80;
const IDLE_STATUS_REFRESH_MS = 1000;
const THEME_STORAGE_KEY = "rayterm-theme";
const SCALE_STORAGE_KEY = "rayterm-scale";
const MIN_TEXT_SCALE = 0.55;
const MAX_TEXT_SCALE = 1.8;

function getPageScrollRows(rows: number) {
  return Math.max(1, Math.floor(rows / 2));
}

export default function Command() {
  const config = useMemo(() => {
    return readConfig();
  }, []);
  const [tabs, setTabs] = useState<TerminalTab[]>([]);
  const [selectedTabId, setSelectedTabId] = useState<string>();
  const [input, setInput] = useState("");
  const [isLoadingDaemon, setIsLoadingDaemon] = useState(true);
  const [isStoredSettingsLoaded, setIsStoredSettingsLoaded] = useState(false);
  const [daemonError, setDaemonError] = useState<string>();
  const [scale, setScale] = useState(1);
  const [scrollOffset, setScrollOffset] = useState(0);
  const [themeId, setThemeId] = useState<ThemeId>(DEFAULT_THEME_ID);
  const [showScaleIndicator, setShowScaleIndicator] = useState(false);
  const revisionRef = useRef(0);
  const lastAppliedRevisionRef = useRef<number | undefined>(undefined);
  const lastForcedStatusRefreshAtRef = useRef(0);
  const scaleIndicatorTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const terminalSize = useMemo(
    () => getSvgTerminalSize(scale, config.terminalColumns),
    [config.terminalColumns, scale],
  );
  const daemonConfig = useMemo(
    () => ({ ...config, visibleTerminalLines: terminalSize.rows, terminalColumns: terminalSize.columns }),
    [config, terminalSize.columns, terminalSize.rows],
  );
  const theme = useMemo(() => getTheme(themeId), [themeId]);

  const applyDaemonState = useCallback((state: DaemonState) => {
    setDaemonError(state.ok === false ? state.error || "RayTerm daemon is unavailable." : undefined);
    const nextRevision = state.revision ?? revisionRef.current;
    const now = Date.now();
    const shouldApply =
      lastAppliedRevisionRef.current === undefined ||
      nextRevision !== lastAppliedRevisionRef.current ||
      now - lastForcedStatusRefreshAtRef.current >= IDLE_STATUS_REFRESH_MS;

    revisionRef.current = nextRevision;
    if (!shouldApply) return revisionRef.current;

    setTabs(state.tabs);
    setSelectedTabId((current) =>
      current && state.tabs.some((tab) => tab.id === current) ? current : (state.selectedId ?? state.tabs[0]?.id),
    );
    lastAppliedRevisionRef.current = nextRevision;
    lastForcedStatusRefreshAtRef.current = now;
    return revisionRef.current;
  }, []);

  useEffect(() => {
    if (!isStoredSettingsLoaded) return;
    let cancelled = false;

    async function refresh() {
      if (cancelled) return;
      try {
        applyDaemonState(await requestDaemon(daemonConfig, { command: "state" }));
      } catch {
        // Keep the interval alive; the next tick will retry and restart the daemon if needed.
      } finally {
        setIsLoadingDaemon(false);
      }
    }

    void refresh();
    const interval = setInterval(() => void refresh(), REFRESH_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(interval);
      if (scaleIndicatorTimeoutRef.current) clearTimeout(scaleIndicatorTimeoutRef.current);
    };
  }, [applyDaemonState, daemonConfig, isStoredSettingsLoaded]);

  useEffect(() => {
    let cancelled = false;

    async function loadStoredSettings() {
      const [storedThemeId, storedScale] = await Promise.all([
        LocalStorage.getItem<string>(THEME_STORAGE_KEY),
        LocalStorage.getItem<string>(SCALE_STORAGE_KEY),
      ]);
      if (cancelled) return;
      if (storedThemeId && THEMES.some((item) => item.id === storedThemeId)) setThemeId(storedThemeId as ThemeId);
      const parsedScale = Number.parseFloat(storedScale || "");
      if (Number.isFinite(parsedScale)) setScale(clampScale(parsedScale));
      setIsStoredSettingsLoaded(true);
    }

    void loadStoredSettings();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!isStoredSettingsLoaded) return;
    void requestDaemon(daemonConfig, {
      command: "resize",
      rows: terminalSize.rows,
      columns: terminalSize.columns,
    }).then(applyDaemonState);
  }, [applyDaemonState, daemonConfig, isStoredSettingsLoaded, terminalSize.columns, terminalSize.rows]);

  useEffect(() => {
    if (!isStoredSettingsLoaded) return;
    void requestDaemon(daemonConfig, { command: "theme", theme }).then(applyDaemonState);
  }, [applyDaemonState, daemonConfig, isStoredSettingsLoaded, theme]);

  const selectedTab = tabs.find((tab) => tab.id === selectedTabId) ?? tabs[0];
  const send = useTerminalSender(daemonConfig, applyDaemonState);
  const handleSearchTextChange = useCallback((value: string) => {
    setInput(value);
  }, []);

  const sendInputWithEnter = useCallback(
    async (tab: TerminalTab) => {
      const currentInput = input;
      setInput("");
      setScrollOffset(0);
      if (currentInput) {
        await send(tab, currentInput, false, currentInput);
      }
      await send(tab, "\r");
    },
    [input, send],
  );

  const sendInputOnly = useCallback(
    async (tab: TerminalTab) => {
      const currentInput = input;
      setInput("");
      setScrollOffset(0);
      if (currentInput) await send(tab, currentInput, false, currentInput);
    },
    [input, send],
  );

  const sendEnterOnly = useCallback(
    async (tab: TerminalTab) => {
      setInput("");
      setScrollOffset(0);
      await send(tab, "\r");
    },
    [send],
  );

  const newTab = useCallback(async () => {
    const state = await requestDaemon(daemonConfig, { command: "new" });
    applyDaemonState(state);
  }, [applyDaemonState, daemonConfig]);

  const closeTab = useCallback(
    async (tab: TerminalTab) => {
      if (tabs.length <= 1) {
        void showToast({ style: Toast.Style.Failure, title: "Cannot close the last terminal tab" });
        return;
      }
      const state = await requestDaemon(daemonConfig, { command: "close", tabId: tab.id });
      applyDaemonState(state);
    },
    [applyDaemonState, daemonConfig, tabs.length],
  );

  const restartTab = useCallback(
    async (tab: TerminalTab) => {
      const state = await requestDaemon(daemonConfig, { command: "restart", tabId: tab.id });
      applyDaemonState(state);
    },
    [applyDaemonState, daemonConfig],
  );

  const resetAll = useCallback(async () => {
    const state = await requestDaemon(daemonConfig, { command: "reset" });
    applyDaemonState(state);
  }, [applyDaemonState, daemonConfig]);

  const selectRelativeTab = useCallback(
    (direction: 1 | -1) => {
      if (!selectedTab) return;
      const currentIndex = tabs.findIndex((tab) => tab.id === selectedTab.id);
      const nextIndex = (currentIndex + direction + tabs.length) % tabs.length;
      setSelectedTabId(tabs[nextIndex]?.id);
    },
    [selectedTab, tabs],
  );

  const selectTheme = useCallback((nextThemeId: ThemeId) => {
    setThemeId(nextThemeId);
    void LocalStorage.setItem(THEME_STORAGE_KEY, nextThemeId);
  }, []);

  return (
    <List
      navigationTitle="RayTerm"
      isShowingDetail
      isLoading={!isStoredSettingsLoaded || isLoadingDaemon}
      filtering={false}
      searchText={input}
      onSearchTextChange={handleSearchTextChange}
      searchBarPlaceholder="Type terminal input"
      selectedItemId={selectedTab?.id}
      onSelectionChange={(id) => id && setSelectedTabId(id)}
    >
      {tabs.length === 0 && !isLoadingDaemon ? (
        <List.EmptyView
          title={daemonError ? "RayTerm Daemon Unavailable" : "Starting RayTerm"}
          description={daemonError || "Launching the background terminal daemon."}
        />
      ) : null}
      {tabs.map((tab) => (
        <List.Item
          key={tab.id}
          id={tab.id}
          title={tab.title}
          detail={
            <List.Item.Detail
              markdown={buildTerminalSvgMarkdown(
                tab,
                terminalSize.rows,
                terminalSize.columns,
                scale,
                showScaleIndicator,
                theme,
                scrollOffset,
              )}
            />
          }
          actions={
            <ActionPanel>
              <ActionPanel.Section title="Input">
                <Action title={input ? "Send Text and Enter" : "Send Enter"} onAction={() => sendInputWithEnter(tab)} />
                <Action
                  title="Send Text Only"
                  onAction={() => sendInputOnly(tab)}
                  shortcut={{ modifiers: ["opt"], key: "enter" }}
                />
                <Action
                  title="Send Enter Only"
                  onAction={() => sendEnterOnly(tab)}
                  shortcut={{ modifiers: ["shift"], key: "enter" }}
                />
              </ActionPanel.Section>
              <ActionPanel.Section title="Terminal Keys">
                <Action
                  title="Send up Arrow"
                  onAction={() => send(tab, "\u001b[A")}
                  shortcut={{ modifiers: ["opt"], key: "arrowUp" }}
                />
                <Action
                  title="Send Down Arrow"
                  onAction={() => send(tab, "\u001b[B")}
                  shortcut={{ modifiers: ["opt"], key: "arrowDown" }}
                />
                <Action
                  title="Send Right Arrow"
                  onAction={() => send(tab, "\u001b[C")}
                  shortcut={{ modifiers: ["opt"], key: "arrowRight" }}
                />
                <Action
                  title="Send Left Arrow"
                  onAction={() => send(tab, "\u001b[D")}
                  shortcut={{ modifiers: ["opt"], key: "arrowLeft" }}
                />
                <Action
                  title="Send Tab"
                  onAction={() => send(tab, "\t")}
                  shortcut={{ modifiers: ["shift"], key: "tab" }}
                />
                <Action
                  title="Send Backspace"
                  onAction={() => send(tab, "\u007f")}
                  shortcut={{ modifiers: ["shift"], key: "backspace" }}
                />
                <Action
                  title="Send Escape"
                  onAction={() => send(tab, "\u001b")}
                  shortcut={{ modifiers: ["shift"], key: "escape" }}
                />
                <Action
                  title="Send Ctrl-C"
                  onAction={() => send(tab, "\u0003")}
                  shortcut={{ modifiers: ["ctrl"], key: "c" }}
                />
                <Action
                  title="Send Ctrl-D"
                  onAction={() => send(tab, "\u0004")}
                  shortcut={{ modifiers: ["ctrl"], key: "d" }}
                />
              </ActionPanel.Section>
              <ActionPanel.Section title="Viewport">
                <Action
                  title="Scroll up"
                  onAction={() => setScrollOffset((current) => current + getPageScrollRows(terminalSize.rows))}
                  shortcut={{ modifiers: ["cmd"], key: "arrowUp" }}
                />
                <Action
                  title="Scroll Down"
                  onAction={() =>
                    setScrollOffset((current) => Math.max(0, current - getPageScrollRows(terminalSize.rows)))
                  }
                  shortcut={{ modifiers: ["cmd"], key: "arrowDown" }}
                />
                <Action
                  title="Jump to Bottom"
                  onAction={() => setScrollOffset(0)}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "arrowDown" }}
                />
                <Action
                  title="Increase Text Scale"
                  onAction={() => {
                    setScale((current) => persistScale(clampScale(Number((current + 0.08).toFixed(2)))));
                    setScrollOffset(0);
                    showScaleIndicatorTemporarily(setShowScaleIndicator, scaleIndicatorTimeoutRef);
                  }}
                  shortcut={{ modifiers: ["cmd"], key: "=" }}
                />
                <Action
                  title="Decrease Text Scale"
                  onAction={() => {
                    setScale((current) => persistScale(clampScale(Number((current - 0.08).toFixed(2)))));
                    setScrollOffset(0);
                    showScaleIndicatorTemporarily(setShowScaleIndicator, scaleIndicatorTimeoutRef);
                  }}
                  shortcut={{ modifiers: ["cmd"], key: "-" }}
                />
                <Action
                  title="Reset Text Scale"
                  onAction={() => {
                    setScale(persistScale(1));
                    setScrollOffset(0);
                    showScaleIndicatorTemporarily(setShowScaleIndicator, scaleIndicatorTimeoutRef);
                  }}
                  shortcut={{ modifiers: ["cmd"], key: "0" }}
                />
              </ActionPanel.Section>
              <ActionPanel.Section title="Appearance">
                <ActionPanel.Submenu title="Change Theme">
                  {THEMES.map((item) => (
                    <Action
                      key={item.id}
                      title={item.id === theme.id ? `${item.name} (Current)` : item.name}
                      onAction={() => selectTheme(item.id)}
                    />
                  ))}
                </ActionPanel.Submenu>
              </ActionPanel.Section>
              <ActionPanel.Section title="Tabs">
                <Action title="New Terminal Tab" onAction={newTab} shortcut={{ modifiers: ["cmd"], key: "n" }} />
                <Action
                  title="Next Terminal Tab"
                  onAction={() => selectRelativeTab(1)}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "]" }}
                />
                <Action
                  title="Previous Terminal Tab"
                  onAction={() => selectRelativeTab(-1)}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "[" }}
                />
                <Action title="Close Terminal Tab" style={Action.Style.Destructive} onAction={() => closeTab(tab)} />
              </ActionPanel.Section>
              <ActionPanel.Section title="Session">
                <Action
                  title="Restart This Tab"
                  onAction={() => restartTab(tab)}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
                />
                <Action
                  title="Clear Terminal"
                  onAction={() => send(tab, "clear\n")}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "k" }}
                />
                <Action title="Reset All Background Terminals" style={Action.Style.Destructive} onAction={resetAll} />
                <Action.CopyToClipboard title="Copy Terminal Text" content={tab.text} />
              </ActionPanel.Section>
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

function useTerminalSender(config: RaytermConfig, applyDaemonState: (state: DaemonState) => number) {
  return useCallback(
    async (tab: TerminalTab, data: string, filterEcho = false, submittedTitle?: string) => {
      const state = await requestDaemon(config, { command: "send", tabId: tab.id, data, filterEcho, submittedTitle });
      applyDaemonState(state);
    },
    [applyDaemonState, config],
  );
}

function showScaleIndicatorTemporarily(
  setShowScaleIndicator: Dispatch<SetStateAction<boolean>>,
  timeoutRef: React.MutableRefObject<NodeJS.Timeout | undefined>,
) {
  setShowScaleIndicator(true);
  if (timeoutRef.current) clearTimeout(timeoutRef.current);
  timeoutRef.current = setTimeout(() => setShowScaleIndicator(false), 1200);
}

function clampScale(value: number) {
  return Math.max(MIN_TEXT_SCALE, Math.min(MAX_TEXT_SCALE, value));
}

function persistScale(value: number) {
  void LocalStorage.setItem(SCALE_STORAGE_KEY, String(value));
  return value;
}
