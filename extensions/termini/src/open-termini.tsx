import {
  Action,
  ActionPanel,
  Alert,
  Color,
  Grid,
  Icon,
  Keyboard,
  Toast,
  closeMainWindow,
  confirmAlert,
  environment,
  showToast,
} from "@raycast/api";
import { showFailureToast, useLocalStorage } from "@raycast/utils";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import { readConfig } from "./config";
import { openInTerminal, requestDaemon } from "./termini-client";
import path from "path";
import { writeFrame } from "./frame-file";
import { buildTerminalSvg, getSvgTerminalSize } from "./render-terminal-svg";
import { DEFAULT_THEME_ID, THEMES, ThemeId, getTheme } from "./themes";
import { DaemonState, TerminiConfig, TerminalTab } from "./types";
import { controlByte } from "./keystrokes";

const WAIT_TIMEOUT_MS = 1000;
const MIN_RENDER_INTERVAL_MS = 50;
const WAIT_RETRY_DELAY_MS = 250;
const BUSY_IDLE_MS = 500;
const THEME_STORAGE_KEY = "termini-theme-v2";
const SCALE_STORAGE_KEY = "termini-scale-v2";
const TAB_STORAGE_KEY = "termini-selected-tab-v2";
const CONTROL_LETTERS = Array.from("abcdefghijklmnopqrstuvwxyz") as Keyboard.KeyEquivalent[];
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
  const [daemonError, setDaemonError] = useState<string>();
  const [scrollOffset, setScrollOffset] = useState(0);
  const [showScaleIndicator, setShowScaleIndicator] = useState(false);
  const storedTheme = useLocalStorage<string>(THEME_STORAGE_KEY, DEFAULT_THEME_ID);
  const storedScale = useLocalStorage<number>(SCALE_STORAGE_KEY, 1);
  const storedTab = useLocalStorage<string>(TAB_STORAGE_KEY);
  const { setValue: setStoredTheme } = storedTheme;
  const { setValue: setStoredScale } = storedScale;
  const { setValue: setStoredTabId } = storedTab;
  // Latched: useLocalStorage revalidates (isLoading → true) after every write, and flipping
  // this would restart the daemon poll loop and re-send resize (SIGWINCH) to every shell.
  const [isStoredSettingsLoaded, setStoredSettingsLoaded] = useState(false);
  const settingsReadNow = !storedTheme.isLoading && !storedScale.isLoading && !storedTab.isLoading;
  useEffect(() => {
    if (settingsReadNow) setStoredSettingsLoaded(true);
  }, [settingsReadNow]);
  const themeId: ThemeId = THEMES.some((item) => item.id === storedTheme.value)
    ? (storedTheme.value as ThemeId)
    : DEFAULT_THEME_ID;
  const scale = clampScale(Number(storedScale.value ?? 1) || 1);
  const changeScale = useCallback(
    (next: number) => {
      void setStoredScale(clampScale(Number(next.toFixed(2))));
      setScrollOffset(0);
      showScaleIndicatorTemporarily(setShowScaleIndicator, scaleIndicatorTimeoutRef);
    },
    [setStoredScale],
  );
  const revisionRef = useRef(-1);
  const lastAppliedRevisionRef = useRef<number | undefined>(undefined);
  const daemonIdRef = useRef<string | undefined>(undefined);
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
      setDaemonError(state.error || "Termini daemon is unavailable.");
      return revisionRef.current;
    }
    setDaemonError(undefined);

    // Revisions restart with a new daemon process; within one daemon, replies arrive over
    // separate sockets, so drop anything not newer than what is already on screen.
    if (state.daemonId && state.daemonId !== daemonIdRef.current) {
      daemonIdRef.current = state.daemonId;
      lastAppliedRevisionRef.current = undefined;
    }
    const nextRevision = state.revision ?? revisionRef.current;
    if (lastAppliedRevisionRef.current !== undefined && nextRevision <= lastAppliedRevisionRef.current) {
      return revisionRef.current;
    }
    revisionRef.current = nextRevision;

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

  // Reopen on the tab used last; a closed tab falls back to the first one.
  const restoredTabRef = useRef(false);
  useEffect(() => {
    if (storedTab.isLoading || restoredTabRef.current) return;
    restoredTabRef.current = true;
    if (storedTab.value) setSelectedTabId((current) => current ?? storedTab.value);
  }, [storedTab.isLoading, storedTab.value]);

  // The daemon outlives Raycast, so hand it the current preferences for sessions started from now on.
  useEffect(() => {
    if (!isStoredSettingsLoaded) return;
    void requestDaemon(daemonConfig, {
      command: "configure",
      config: {
        shellPath: config.shellPath,
        shellArgs: config.shellArgs,
        workingDirectory: config.workingDirectory,
        visibleTerminalLines: terminalSize.rows,
        terminalColumns: terminalSize.columns,
        maxTranscriptLines: config.maxTranscriptLines,
      },
    });
  }, [config, daemonConfig, isStoredSettingsLoaded, terminalSize.columns, terminalSize.rows]);

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
  const persistedTabRef = useRef<string | undefined>(undefined);
  useEffect(() => {
    // Write once per selection change (setValue is not memoized and its value lags a revalidation).
    if (!isStoredSettingsLoaded || !selectedTab?.id || persistedTabRef.current === selectedTab.id) return;
    persistedTabRef.current = selectedTab.id;
    if (selectedTab.id !== storedTab.value) void setStoredTabId(selectedTab.id);
  }, [isStoredSettingsLoaded, selectedTab?.id, setStoredTabId, storedTab.value]);
  // Only the selected tab's detail is shown, so build (and memoize) SVG for it
  // alone. Unrelated re-renders (e.g. typing in the search bar) reuse the cache.
  const selectedFrame = useMemo(() => {
    if (!selectedTab) return undefined;
    const svg = buildTerminalSvg(
      selectedTab,
      terminalSize.rows,
      terminalSize.columns,
      scale,
      showScaleIndicator,
      theme,
      scrollOffset,
      tabs,
    );
    return writeFrame(path.join(environment.supportPath, "frames"), svg);
  }, [selectedTab, terminalSize.rows, terminalSize.columns, scale, showScaleIndicator, theme, scrollOffset, tabs]);
  const send = useTerminalSender(daemonConfig, applyDaemonState);
  const handleSearchTextChange = useCallback((value: string) => {
    setInput(value);
  }, []);

  // Typed input is cleared only once it reached the shell, so a failed send keeps it.
  const clearSentInput = useCallback((sent: string) => setInput((current) => (current === sent ? "" : current)), []);

  const sendInputWithEnter = useCallback(
    async (tab: TerminalTab) => {
      const currentInput = input;
      setScrollOffset(0);
      if (currentInput && !(await send(tab, currentInput, false, currentInput))) return;
      if (await send(tab, "\r")) clearSentInput(currentInput);
    },
    [clearSentInput, input, send],
  );

  const sendInputOnly = useCallback(
    async (tab: TerminalTab) => {
      const currentInput = input;
      setScrollOffset(0);
      if (currentInput && (await send(tab, currentInput, false, currentInput))) clearSentInput(currentInput);
    },
    [clearSentInput, input, send],
  );

  const openTabInTerminal = useCallback(
    async (tab: TerminalTab) => {
      try {
        openInTerminal(config, tab.id, config.terminalApp);
        await closeMainWindow();
      } catch (error) {
        await showFailureToast(error, { title: "Could not open terminal" });
      }
    },
    [config],
  );

  const sendKey = useCallback(
    (tab: TerminalTab, data: string) => {
      setScrollOffset(0);
      return send(tab, data);
    },
    [send],
  );

  const newTab = useCallback(async () => {
    const state = await requestDaemon(daemonConfig, { command: "new" });
    applyDaemonState(state);
    // Select it even if the wait loop already rendered this revision.
    if (state.ok !== false && state.selectedId) setSelectedTabId(state.selectedId);
  }, [applyDaemonState, daemonConfig]);

  const closeTab = useCallback(
    async (tab: TerminalTab) => {
      if (tabs.length <= 1) {
        void showToast({ style: Toast.Style.Failure, title: "Cannot close the last terminal tab" });
        return;
      }
      const confirmed = await confirmDestructive(
        "Close Terminal Tab?",
        `"${tab.title}" and anything running in it will be stopped.`,
        "Close Tab",
      );
      if (!confirmed) return;
      const state = await requestDaemon(daemonConfig, { command: "close", tabId: tab.id });
      applyDaemonState(state);
    },
    [applyDaemonState, daemonConfig, tabs.length],
  );

  const restartTab = useCallback(
    async (tab: TerminalTab) => {
      const confirmed = await confirmDestructive(
        "Restart Terminal Tab?",
        `"${tab.title}" and anything running in it will be stopped, then a fresh shell starts.`,
        "Restart",
      );
      if (!confirmed) return;
      const state = await requestDaemon(daemonConfig, { command: "restart", tabId: tab.id });
      applyDaemonState(state);
    },
    [applyDaemonState, daemonConfig],
  );

  const resetAll = useCallback(async () => {
    const confirmed = await confirmDestructive(
      "Reset All Terminals?",
      "Every tab and everything running in them will be stopped.",
      "Reset All",
    );
    if (!confirmed) return;
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

  const selectTheme = useCallback((nextThemeId: ThemeId) => void setStoredTheme(nextThemeId), [setStoredTheme]);

  const tab = selectedTab;
  // One full-width 16:9 cell holds the terminal; tabs live in the strip drawn on top of it
  // and in the dropdown beside the search bar.
  return (
    <Grid
      columns={1}
      aspectRatio="16/9"
      fit={Grid.Fit.Fill}
      inset={Grid.Inset.Zero}
      isLoading={!isStoredSettingsLoaded || isLoadingDaemon || isBusy}
      filtering={false}
      searchText={input}
      onSearchTextChange={handleSearchTextChange}
      searchBarPlaceholder="Type terminal input"
      searchBarAccessory={
        <Grid.Dropdown tooltip="Terminal Tabs" value={tab?.id ?? ""} onChange={(id) => id && setSelectedTabId(id)}>
          {tabs.map((item, index) => (
            <Grid.Dropdown.Item
              key={item.id}
              value={item.id}
              title={`${index + 1}  ${item.title}`}
              icon={{ source: Icon.Terminal, tintColor: item.status === "running" ? Color.Blue : Color.Purple }}
            />
          ))}
        </Grid.Dropdown>
      }
    >
      {tabs.length === 0 && !isLoadingDaemon ? (
        <Grid.EmptyView
          title={daemonError ? "Termini Daemon Unavailable" : "Starting Termini"}
          description={daemonError || "Launching the background terminal daemon."}
        />
      ) : null}
      {tab && selectedFrame ? (
        <Grid.Item
          id="terminal"
          content={{ source: selectedFrame }}
          actions={
            <ActionPanel>
              <ActionPanel.Section title="Input">
                <Action
                  title={input ? "Send Text and Enter" : "Send Enter"}
                  icon={Icon.Terminal}
                  onAction={() => sendInputWithEnter(tab)}
                />
                <Action
                  title="Send Text Only"
                  icon={Icon.Text}
                  onAction={() => sendInputOnly(tab)}
                  shortcut={{ modifiers: ["opt"], key: "enter" }}
                />
                <Action
                  title="Open in Terminal"
                  icon={Icon.Window}
                  onAction={() => openTabInTerminal(tab)}
                  shortcut={Keyboard.Shortcut.Common.Open}
                />
              </ActionPanel.Section>
              <ActionPanel.Section title="Terminal Keys">
                <Action
                  title="Send up Arrow"
                  icon={Icon.ArrowUp}
                  onAction={() => sendKey(tab, "\u001b[A")}
                  shortcut={{ modifiers: ["cmd", "opt"], key: "arrowUp" }}
                />
                <Action
                  title="Send Down Arrow"
                  icon={Icon.ArrowDown}
                  onAction={() => sendKey(tab, "\u001b[B")}
                  shortcut={{ modifiers: ["cmd", "opt"], key: "arrowDown" }}
                />
                <Action
                  title="Send Right Arrow"
                  icon={Icon.ArrowRight}
                  onAction={() => sendKey(tab, "\u001b[C")}
                  shortcut={{ modifiers: ["cmd", "opt"], key: "arrowRight" }}
                />
                <Action
                  title="Send Left Arrow"
                  icon={Icon.ArrowLeft}
                  onAction={() => sendKey(tab, "\u001b[D")}
                  shortcut={{ modifiers: ["cmd", "opt"], key: "arrowLeft" }}
                />
                <Action
                  title="Send Tab"
                  icon={Icon.ChevronRight}
                  onAction={() => sendKey(tab, "\t")}
                  shortcut={{ modifiers: ["shift"], key: "tab" }}
                />
                <Action
                  title="Send Backspace"
                  icon={Icon.ChevronLeft}
                  onAction={() => sendKey(tab, "\u007f")}
                  shortcut={{ modifiers: ["shift"], key: "backspace" }}
                />
                <Action
                  title="Send Escape"
                  icon={Icon.XMarkCircle}
                  onAction={() => sendKey(tab, "\u001b")}
                  shortcut={{ modifiers: ["shift"], key: "escape" }}
                />
              </ActionPanel.Section>
              <ActionPanel.Section title="Control Keys">
                {CONTROL_LETTERS.map((letter) => (
                  <Action
                    key={letter}
                    title={`Send Ctrl-${letter.toUpperCase()}`}
                    icon={Icon.Keyboard}
                    onAction={() => sendKey(tab, controlByte(letter))}
                    shortcut={{ modifiers: ["ctrl"], key: letter }}
                  />
                ))}
              </ActionPanel.Section>
              <ActionPanel.Section title="Viewport">
                <Action
                  title="Scroll up"
                  icon={Icon.ChevronUp}
                  onAction={() => setScrollOffset((current) => current + getPageScrollRows(terminalSize.rows))}
                  shortcut={{ modifiers: ["cmd"], key: "arrowUp" }}
                />
                <Action
                  title="Scroll Down"
                  icon={Icon.ChevronDown}
                  onAction={() =>
                    setScrollOffset((current) => Math.max(0, current - getPageScrollRows(terminalSize.rows)))
                  }
                  shortcut={{ modifiers: ["cmd"], key: "arrowDown" }}
                />
                <Action
                  title="Jump to Bottom"
                  icon={Icon.ArrowDownCircle}
                  onAction={() => setScrollOffset(0)}
                  shortcut={{ modifiers: ["cmd"], key: "j" }}
                />
                <Action
                  title="Increase Text Scale"
                  icon={Icon.Plus}
                  onAction={() => changeScale(scale + 0.08)}
                  shortcut={{ modifiers: ["cmd"], key: "=" }}
                />
                <Action
                  title="Decrease Text Scale"
                  icon={Icon.Minus}
                  onAction={() => changeScale(scale - 0.08)}
                  shortcut={{ modifiers: ["cmd"], key: "-" }}
                />
                <Action
                  title="Reset Text Scale"
                  icon={Icon.Undo}
                  onAction={() => changeScale(1)}
                  shortcut={{ modifiers: ["cmd"], key: "0" }}
                />
              </ActionPanel.Section>
              <ActionPanel.Section title="Appearance">
                <ActionPanel.Submenu title="Change Theme">
                  {THEMES.map((item) => (
                    <Action
                      key={item.id}
                      title={item.id === theme.id ? `${item.name} (Current)` : item.name}
                      icon={Icon.Brush}
                      onAction={() => selectTheme(item.id)}
                    />
                  ))}
                </ActionPanel.Submenu>
              </ActionPanel.Section>
              <ActionPanel.Section title="Tabs">
                <Action
                  title="New Terminal Tab"
                  icon={Icon.PlusCircle}
                  onAction={newTab}
                  shortcut={Keyboard.Shortcut.Common.New}
                />
                {tabs.slice(0, 9).map((item, index) => (
                  <Action
                    key={item.id}
                    title={`Go to Tab ${index + 1}`}
                    icon={Icon.Terminal}
                    onAction={() => setSelectedTabId(item.id)}
                    shortcut={{ modifiers: ["cmd"], key: String(index + 1) as Keyboard.KeyEquivalent }}
                  />
                ))}
                <Action
                  title="Next Terminal Tab"
                  icon={Icon.Forward}
                  onAction={() => selectRelativeTab(1)}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "]" }}
                />
                <Action
                  title="Previous Terminal Tab"
                  icon={Icon.Rewind}
                  onAction={() => selectRelativeTab(-1)}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "[" }}
                />
                <Action
                  title="Close Terminal Tab"
                  icon={Icon.XMarkCircle}
                  style={Action.Style.Destructive}
                  onAction={() => closeTab(tab)}
                />
              </ActionPanel.Section>
              <ActionPanel.Section title="Session">
                <Action
                  title="Restart This Tab"
                  icon={Icon.ArrowClockwise}
                  style={Action.Style.Destructive}
                  onAction={() => restartTab(tab)}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
                />
                <Action
                  title="Clear Terminal"
                  icon={Icon.Eraser}
                  onAction={() => sendKey(tab, "clear\n")}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "k" }}
                />
                <Action
                  title="Reset All Background Terminals"
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  onAction={resetAll}
                />
                <Action.CopyToClipboard title="Copy Terminal Text" icon={Icon.CopyClipboard} content={tab.text} />
              </ActionPanel.Section>
            </ActionPanel>
          }
        />
      ) : null}
    </Grid>
  );
}

function useTerminalSender(config: TerminiConfig, applyDaemonState: (state: DaemonState) => number) {
  // One socket per request, so chain them: keystrokes must reach the PTY in order.
  const queueRef = useRef<Promise<unknown>>(Promise.resolve());
  return useCallback(
    /** Resolves to whether the input reached the shell. */
    (tab: TerminalTab, data: string, filterEcho = false, submittedTitle?: string): Promise<boolean> => {
      const next = queueRef.current.then(async () => {
        const state = await requestDaemon(config, { command: "send", tabId: tab.id, data, filterEcho, submittedTitle });
        applyDaemonState(state);
        return state.ok !== false;
      });
      queueRef.current = next.catch(() => undefined);
      return next;
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

function confirmDestructive(title: string, message: string, primary: string) {
  return confirmAlert({ title, message, primaryAction: { title: primary, style: Alert.ActionStyle.Destructive } });
}
