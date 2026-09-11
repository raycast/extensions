import { Action, ActionPanel, List, LocalStorage, Toast, showToast, Keyboard } from "@raycast/api";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import { readConfig } from "./config";
import { requestDaemon } from "./rayterm-client";
import { buildTerminalSvgMarkdown, getSvgTerminalSize } from "./render-terminal-svg";
import { DEFAULT_THEME_ID, THEMES, ThemeId, getTheme } from "./themes";
import { DaemonState, RaytermConfig, TerminalTab } from "./types";

const WAIT_TIMEOUT_MS = 1000;
const MIN_RENDER_INTERVAL_MS = 50;
const WAIT_RETRY_DELAY_MS = 250;
const BUSY_IDLE_MS = 500;
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
  const [isBusy, setIsBusy] = useState(false);
  const [isStoredSettingsLoaded, setIsStoredSettingsLoaded] = useState(false);
  const [daemonError, setDaemonError] = useState<string>();
  const [scale, setScale] = useState(1);
  const [scrollOffset, setScrollOffset] = useState(0);
  const [themeId, setThemeId] = useState<ThemeId>(DEFAULT_THEME_ID);
  const [showScaleIndicator, setShowScaleIndicator] = useState(false);
  const revisionRef = useRef(-1);
  const lastAppliedRevisionRef = useRef<number | undefined>(undefined);
  const lastAppliedAtRef = useRef(0);
  const busyTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
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
    // A failed request (transient daemon blip) must not wipe the current transcript.
    if (state.ok === false) {
      setDaemonError(state.error || "RayTerm daemon is unavailable.");
      return revisionRef.current;
    }
    setDaemonError(undefined);

    const nextRevision = state.revision ?? revisionRef.current;
    revisionRef.current = nextRevision;
    // Only re-render when the daemon reports an actual change. Identical revisions
    // (e.g. long-poll timeouts) are dropped to avoid a render-without-changes loop.
    if (lastAppliedRevisionRef.current !== undefined && nextRevision === lastAppliedRevisionRef.current) {
      return revisionRef.current;
    }

    setTabs(state.tabs);
    setSelectedTabId((current) =>
      current && state.tabs.some((tab) => tab.id === current) ? current : (state.selectedId ?? state.tabs[0]?.id),
    );
    lastAppliedRevisionRef.current = nextRevision;
    return revisionRef.current;
  }, []);

  // Show the loading indicator while a command is actively producing output.
  // Since the daemon only pushes on real changes, we flip back to idle shortly
  // after output stops.
  const markBusy = useCallback(() => {
    setIsBusy(true);
    if (busyTimeoutRef.current) clearTimeout(busyTimeoutRef.current);
    busyTimeoutRef.current = setTimeout(() => setIsBusy(false), BUSY_IDLE_MS);
  }, []);

  useEffect(() => {
    if (!isStoredSettingsLoaded) return;
    let cancelled = false;

    // Long-poll the daemon: the `wait` command blocks until the revision advances
    // (or a short timeout elapses), so idle terminals cost no renders and active
    // output streams in immediately without a busy 80ms polling loop.
    async function pump() {
      try {
        applyDaemonState(await requestDaemon(daemonConfig, { command: "state" }));
      } catch {
        // The wait loop below will retry and restart the daemon if needed.
      } finally {
        if (!cancelled) setIsLoadingDaemon(false);
      }

      while (!cancelled) {
        // Rate-limit BEFORE polling so heavy bursts stay bounded, while an
        // isolated update after an idle period skips the delay entirely (the
        // gap since the last apply already exceeds the interval) and applies
        // instantly. The snapshot is fetched after the wait, so it is always
        // the freshest available at apply time.
        const sinceLastApply = Date.now() - lastAppliedAtRef.current;
        if (sinceLastApply < MIN_RENDER_INTERVAL_MS) await sleep(MIN_RENDER_INTERVAL_MS - sinceLastApply);
        if (cancelled) return;

        let state: DaemonState;
        try {
          state = await requestDaemon(daemonConfig, {
            command: "wait",
            revision: revisionRef.current,
            timeoutMs: WAIT_TIMEOUT_MS,
          });
        } catch {
          await sleep(WAIT_RETRY_DELAY_MS);
          continue;
        }
        if (cancelled) return;

        const previousRevision = lastAppliedRevisionRef.current;
        applyDaemonState(state);
        lastAppliedAtRef.current = Date.now();
        if (lastAppliedRevisionRef.current !== previousRevision) markBusy();
      }
    }

    void pump();

    return () => {
      cancelled = true;
      if (scaleIndicatorTimeoutRef.current) clearTimeout(scaleIndicatorTimeoutRef.current);
      if (busyTimeoutRef.current) clearTimeout(busyTimeoutRef.current);
    };
  }, [applyDaemonState, daemonConfig, isStoredSettingsLoaded, markBusy]);

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
  // Only the selected tab's detail is shown, so build (and memoize) SVG for it
  // alone. Unrelated re-renders (e.g. typing in the search bar) reuse the cache.
  const selectedDetailMarkdown = useMemo(() => {
    if (!selectedTab) return "";
    return buildTerminalSvgMarkdown(
      selectedTab,
      terminalSize.rows,
      terminalSize.columns,
      scale,
      showScaleIndicator,
      theme,
      scrollOffset,
    );
  }, [selectedTab, terminalSize.rows, terminalSize.columns, scale, showScaleIndicator, theme, scrollOffset]);
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
      navigationTitle={selectedTab?.truncated ? "RayTerm · Scrollback Truncated" : "RayTerm"}
      isShowingDetail
      isLoading={!isStoredSettingsLoaded || isLoadingDaemon || isBusy}
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
          detail={<List.Item.Detail markdown={tab.id === selectedTab?.id ? selectedDetailMarkdown : ""} />}
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
                  shortcut={Keyboard.Shortcut.Common.Remove}
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
                  shortcut={Keyboard.Shortcut.Common.MoveDown}
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
                <Action title="New Terminal Tab" onAction={newTab} shortcut={Keyboard.Shortcut.Common.New} />
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

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function clampScale(value: number) {
  return Math.max(MIN_TEXT_SCALE, Math.min(MAX_TEXT_SCALE, value));
}

function persistScale(value: number) {
  void LocalStorage.setItem(SCALE_STORAGE_KEY, String(value));
  return value;
}
