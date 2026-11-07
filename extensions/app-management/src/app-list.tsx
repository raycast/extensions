// The App Management list (SPEC.md §4, §6, §7, §8, §9). One flat List: optional status rows, then one row per app with
// its window rows directly beneath, then the Utilities section (the Trash row) when it is shown. Three independent
// loads on mount (configuration, window helper, badge helper); nothing is awaited jointly. Every rule about rows,
// visibility, search, order, and the primary action lives in src/lib/rows.ts, src/lib/sort.ts, and
// src/lib/utilities.ts; this file only renders and wires actions.
import {
  Action,
  ActionPanel,
  Alert,
  Clipboard,
  closeMainWindow,
  confirmAlert,
  Color,
  environment,
  getPreferenceValues,
  Icon,
  Image,
  Keyboard,
  launchCommand,
  type LaunchProps,
  LaunchType,
  List,
  open,
  PopToRootType,
  showToast,
  Toast,
} from "@raycast/api";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { basename, join } from "node:path";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ConfigureApps } from "./configure-app-management.tsx";
import { ACCESSIBILITY_SETTINGS_URL, readDock } from "./dock.ts";
import type { RowState } from "./lib/badge/badge.ts";
import { addApp } from "./lib/badge/config.ts";
import { REASONS } from "./lib/badge/helper-output.ts";
import { otherView, togglePin, VIEW_TITLES, type ListView } from "./lib/badge/views.ts";
import {
  appId,
  badgeLabel,
  buildRows,
  emptyKind,
  frontBundleId,
  matchAccessory,
  primaryAction,
  rowAfterClose,
  visibleItems,
  type AppItem,
  type AppRow,
  type BadgesRead,
  type Expansion,
  type ListConfig,
  type ListItem,
  type WindowsRead,
} from "./lib/rows.ts";
import { otherSort, SORT_TITLES } from "./lib/sort.ts";
import { EMPTY_TRASH_COMMAND, toggleUtilityPin, TRASH_ITEM_ID, trashVisible, type UtilityId } from "./lib/utilities.ts";
import type { LabelTier, WindowView } from "./lib/window/model.ts";
import { plural } from "./lib/window/model.ts";
import { failureText } from "./lib/window/run-helper.ts";
import {
  clearSelection,
  loadAppsAndPins,
  loadConfig,
  readActionableSelection,
  recordRecent,
  saveApps,
  saveFilter,
  saveListState,
  savePins,
  saveSelection,
  saveSort,
  saveUtilityPins,
  showConfigNotices,
} from "./storage.ts";
import { pidsForBundle } from "./running.ts";
import { quitTarget } from "./lib/selection.ts";
import { closeAppWindow, quitApplication, switchToWindow } from "./switch-action.ts";
import { listWindows, quitApp } from "./window-helper.ts";

// ---------- shortcuts (SPEC.md §4.2; Configure keeps ⌘⇧C, so Diagnostic Info moves to ⌘⇧D) ----------

// In-list quit shortcuts (fixed; the hotkey commands Quit Selected App / Quit Other Apps are the configurable route).
const QUIT_SHORTCUT: Keyboard.Shortcut = { modifiers: ["ctrl"], key: "q" };
const QUIT_OTHERS_SHORTCUT: Keyboard.Shortcut = { modifiers: ["ctrl", "shift"], key: "q" };
const REFRESH_WINDOWS_SHORTCUT: Keyboard.Shortcut = { modifiers: ["cmd", "shift"], key: "r" };
const REFRESH_BADGES_SHORTCUT: Keyboard.Shortcut = { modifiers: ["cmd", "opt"], key: "r" };
const FILTER_SHORTCUT: Keyboard.Shortcut = { modifiers: ["cmd", "shift"], key: "v" };
const SORT_SHORTCUT: Keyboard.Shortcut = { modifiers: ["cmd", "shift"], key: "s" };
const DIAGNOSTICS_SHORTCUT: Keyboard.Shortcut = { modifiers: ["cmd", "shift"], key: "d" };
const COLLAPSE_SHORTCUT: Keyboard.Shortcut = { modifiers: ["opt"], key: "arrowLeft" };
const EXPAND_SHORTCUT: Keyboard.Shortcut = { modifiers: ["opt"], key: "arrowRight" };
const COLLAPSE_ALL_SHORTCUT: Keyboard.Shortcut = { modifiers: ["opt", "shift"], key: "arrowLeft" };
const EXPAND_ALL_SHORTCUT: Keyboard.Shortcut = { modifiers: ["opt", "shift"], key: "arrowRight" };

// A square pin image so the icon slot measures 16 px like the blank and warning icons (Icon.Pin measures 12 px).
const PIN_ACCESSORY: List.Item.Accessory = {
  icon: { source: "pin.png", tintColor: Color.SecondaryText },
  tooltip: "Pinned: always shown in All Apps and Pinned + Badged",
};
const TRASH_PIN_ACCESSORY: List.Item.Accessory = {
  icon: { source: "pin.png", tintColor: Color.SecondaryText },
  tooltip: "Pinned: shown at the end of All Apps and Pinned + Badged",
};

/** Desktop labels are off for good (owner, 2026-09-30): the list reaches other-Desktop windows without tagging them. */
const TIER: LabelTier = 0;

// ---------- accessories ----------

/** Badge project's accessory per state, verbatim (`badge-list.tsx accessory()`). */
function badgeAccessory(state: RowState): List.Item.Accessory[] {
  switch (state.kind) {
    case "numeric":
      return [
        { tag: { value: padBadge(badgeLabel(state.text)), color: Color.Red }, tooltip: `Dock badge: ${state.text}` },
      ];
    case "zero":
      return [{ tag: { value: padBadge(state.text), color: Color.SecondaryText }, tooltip: "Dock badge shows 0" }];
    case "nonNumeric":
      return [
        { tag: { value: padBadge(state.text), color: Color.Orange }, tooltip: "Dock badge text, not a plain number" },
      ];
    case "noBadge":
      // A muted dash instead of the words, so the badge column keeps one width (owner feedback, 2026-09-30).
      return [
        {
          tag: { value: padBadge("−"), color: Color.SecondaryText },
          tooltip: "No badge: app is in the Dock with no badge",
        },
      ];
    case "notInDock":
      return [{ text: "Not in Dock", tooltip: "App is not running and not pinned, so there is no badge to read" }];
    case "notInstalled":
      return [{ text: "Not installed", tooltip: "App was not found at its saved location" }];
    case "unavailable":
      return [{ icon: { source: Icon.Warning, tintColor: Color.Yellow }, text: "Unavailable", tooltip: state.reason }];
    case "loading":
      return [];
  }
}

/** Empty 16×16 icon so every row ends with an icon slot and the tags line up (owner feedback, 2026-09-30). */
const BLANK_ICON: List.Item.Accessory = { icon: "blank.png" };
/** Empty 40×16 placeholder as wide as a small badge pill, so the badge column keeps its width on rows without one. */
// Raycast scales accessory images into a 16×16 box and draws a tag's pill even for a transparent colour (both
// measured/seen), so the badge placeholder is plain text made of non-breaking spaces sized like a one-digit pill.
// Eight non-breaking spaces plus a thin space measure the same as a one-digit pill (a ninth NBSP was 1 px wide).
const BLANK_BADGE: List.Item.Accessory = { text: "\u00A0".repeat(8) + "\u2009" };

/**
 * A pill's width follows its text, so it is kept to one glyph: counts of ten or more become a red dot (badgeLabel), and
 * the narrow "1" is padded to a digit's width so every badge pill has the same footprint as the blank placeholder.
 * Raycast trims a tag's value, so the padding starts with a zero-width word joiner (U+2060, not whitespace) followed by
 * non-breaking spaces; figure spaces (U+2007) were dropped entirely (measured). Glyph widths are the system font's at
 * the list's size (measured: digits, the dot, and the minus 9 px; "1" 5 px; a non-breaking space 4.1 px).
 */
const BADGE_TARGET_PX = 9;
const NBSP_PX = 4.1;
function glyphWidth(ch: string): number {
  return ch === "1" ? 5 : 9;
}
function padBadge(text: string): string {
  const width = [...text].reduce((sum, ch) => sum + glyphWidth(ch), 0);
  const spaces = Math.max(0, Math.round((BADGE_TARGET_PX - width) / NBSP_PX));
  return spaces ? "\u2060" + "\u00A0".repeat(spaces) + text : text;
}
const FACT_COLOR = Color.SecondaryText;

/** Window titles can be very long (browser tabs); keep rows the same width and leave the full title to the tooltip. */
const TITLE_MAX = 64;
function clip(text: string, max = TITLE_MAX): string {
  return text.length > max ? text.slice(0, max - 1).trimEnd() + "…" : text;
}

/**
 * Accessory layout (SPEC.md §4.2 as revised by the owner on 2026-09-30, twice): window facts first, then the badge,
 * then one icon slot at the far right that is always present (pin, warnings, or a blank), so the tags and badges of
 * neighbouring rows line up. A one-window app shows its window's title as the subtitle, so `1 window` is not repeated
 * and its minimized state reads `Minimized` like a window row.
 */
function appAccessories(item: AppItem, tier: LabelTier, windowFailureTitle?: string): List.Item.Accessory[] {
  const { row } = item;
  const out: List.Item.Accessory[] = [];
  const icons: List.Item.Accessory[] = [];
  const n = row.windows.length;
  if (row.windowsState === "ok") {
    // Window facts are pills like the state tags. An app with no windows shows nothing here (owner revision): the
    // absence is plain from the empty slot, and the row is only listed because it is pinned or badged.
    if (n >= 2) out.push({ tag: { value: plural(n, "window"), color: FACT_COLOR } });
  } else if (row.windowsState === "failed") {
    icons.push({
      icon: { source: Icon.Warning, tintColor: Color.Yellow },
      tooltip: `Windows unknown: ${windowFailureTitle ?? "window read failed"}`,
    });
  }
  if (row.isHidden) out.push({ tag: { value: "Hidden", color: Color.Orange }, tooltip: "App is hidden (⌘H)" });
  // Per-window state on the app row only for a one-window app; a group's window rows carry their own tags.
  if (n === 1 && row.minimizedCount > 0)
    out.push({ tag: { value: "Minimized", color: Color.Blue }, tooltip: "Minimized (⌘M)" });
  const match = matchAccessory(item);
  if (match) out.push({ text: match });
  if (item.collapsed) out.push({ text: "▸", tooltip: "Windows collapsed" });
  // Badge slot: always present, so the window facts before it end in one column. Untracked rows get a blank, never a
  // badge fact (J-8); loading rows get a blank until the read lands.
  const badge = row.badge.kind === "notTracked" ? [] : badgeAccessory(row.badge);
  out.push(...(badge.length ? badge : [BLANK_BADGE]));
  if (row.unresolvedCount > 0 || row.warnings.length > 0) {
    icons.push({
      icon: { source: Icon.ExclamationMark, tintColor: Color.Yellow },
      tooltip:
        [
          row.unresolvedCount > 0
            ? `${plural(row.unresolvedCount, "window")} could not be read (title unavailable)`
            : "",
          ...row.warnings,
        ]
          .filter(Boolean)
          .join(". ") || undefined,
    });
  }
  if (row.pinned) icons.push(PIN_ACCESSORY);
  if (icons.length === 0) icons.push(BLANK_ICON);
  return [...out, ...icons];
}

function windowAccessories(w: WindowView): List.Item.Accessory[] {
  const out: List.Item.Accessory[] = [];
  if (w.isMinimized) out.push({ tag: { value: "Minimized", color: Color.Blue } });
  if (w.appHidden) out.push({ tag: { value: "Hidden", color: Color.Orange } });
  if (w.isFullscreen) out.push({ tag: { value: "Full Screen", color: Color.Green } });
  if (!w.resolved) {
    out.push({
      icon: { source: Icon.ExclamationMark, tintColor: Color.Yellow },
      tooltip: "The helper found this window but could not read it; switching may not be confirmed",
    });
    out.push(BLANK_ICON);
  } else {
    out.push(BLANK_BADGE, BLANK_ICON);
  }
  return out;
}

function appIcon(row: AppRow): Image.ImageLike {
  return row.path ? { fileIcon: row.path } : Icon.AppWindow;
}

function appSubtitle(item: AppItem): string | undefined {
  const { row, match } = item;
  if (match.kind === "single") return clip(match.window.title);
  if (row.windowsState === "ok" && row.windows.length === 1) return clip(row.windows[0].title);
  if (row.badge.kind === "unavailable") return row.badge.reason;
  return undefined;
}

// ---------- the command ----------

export type StartupAction = "quit-selected" | "quit-others";

/** The list; `startup` runs one action on the stored selection once the first window scan is in (hotkey commands). */
export function AppList(props: { fallbackText?: string; startup?: StartupAction; selectId?: string }) {
  const tier = TIER;
  const expandByDefault = getPreferenceValues<Preferences>().expandByDefault !== false;

  const [config, setConfig] = useState<ListConfig>();
  /** Set when the first settings read fails, so the list shows the reason and a Retry instead of spinning. */
  const [configError, setConfigError] = useState<string>();
  const configRef = useRef<ListConfig | undefined>(undefined);
  // Utility pins (§9) live beside the app configuration, never in it, so nothing about app rows depends on them.
  const [utilityPins, setUtilityPins] = useState<UtilityId[]>();
  const utilityPinsRef = useRef<UtilityId[]>([]);
  const [windows, setWindows] = useState<WindowsRead>({ kind: "loading" });
  const [windowsRunning, setWindowsRunning] = useState(true);
  const windowsRaw = useRef<string>("");
  const [badges, setBadges] = useState<BadgesRead>({ kind: "loading" });
  const [badgesRunning, setBadgesRunning] = useState(true);
  // Root-search fallback text (and the ?fallbackText= deeplink used in verification) pre-fills the search.
  const [query, setQuery] = useState(props.fallbackText ?? "");
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(new Set());
  const [collapsed, setCollapsed] = useState<ReadonlySet<string>>(new Set());
  // A relaunch's selectId is handed to Raycast only once its row is listed (pendingSelect below): Raycast applies
  // selectedItemId when the value changes, so one set at mount, before the rows load, never took effect (observed).
  const [selectedItemId, setSelectedItemId] = useState<string | undefined>();
  const selectedRef = useRef<string | null>(props.selectId ?? null);
  /**
   * A relaunch's selectId until its row is listed (owner, 2026-10-08). Raycast reports the first row as selected while
   * the rows load (observed: the stored selection became the top app while the list showed the requested window row),
   * so reports of other rows are ignored until then, and the stored selection stays cleared: a hotkey press meanwhile
   * refuses instead of acting on the top row.
   */
  const pendingSelect = useRef(props.selectId);
  const previousItems = useRef<ListItem[]>([]);
  const mounted = useRef(false);
  const started = useRef(false);
  const windowSeq = useRef(0);
  const badgeSeq = useRef(0);
  // List.Dropdown reports its first item through onChange when it mounts (badge project V6); ignore that first report.
  const dropdownShownAt = useRef(0);
  const dropdownReported = useRef(false);

  const updateConfig = useCallback((next: ListConfig) => {
    configRef.current = next;
    setConfig(next);
  }, []);

  const refreshWindows = useCallback(async () => {
    const seq = ++windowSeq.current;
    setWindowsRunning(true);
    const { parsed, raw } = await listWindows();
    if (!mounted.current || seq !== windowSeq.current) return;
    windowsRaw.current = raw;
    const at = Date.now();
    if (parsed.ok) {
      setWindows({ kind: "ok", list: parsed.value, at });
      // §8.2 frontAt: the app owning the front-most on-screen window at scan time. Stored and applied together.
      const front = frontBundleId(parsed.value);
      if (front) {
        const recent = await recordRecent(front, "frontAt", at);
        if (mounted.current && configRef.current) updateConfig({ ...configRef.current, recent });
      }
    } else {
      setWindows({ kind: "failed", failure: parsed.failure, at });
    }
    setWindowsRunning(false);
  }, [updateConfig]);

  const refreshBadges = useCallback(async () => {
    const seq = ++badgeSeq.current;
    setBadgesRunning(true);
    const read = await readDock();
    if (!mounted.current || seq !== badgeSeq.current) return;
    setBadges({ kind: "done", read, at: Date.now() });
    setBadgesRunning(false);
    if (!read.ok) {
      await showToast({
        style: Toast.Style.Failure,
        title: read.reason,
        message: read.failure === "permission" ? "Turn on Raycast in Device Control and Data Access" : undefined,
      });
    }
  }, []);

  const refreshBoth = useCallback(async () => {
    await Promise.all([refreshWindows(), refreshBadges()]);
  }, [refreshWindows, refreshBadges]);

  /** Return from Configure (onPop): configuration only, no helper run (§6.4). */
  const reloadAppsAndPins = useCallback(async () => {
    const loaded = await loadAppsAndPins();
    if (!mounted.current || !configRef.current) return;
    updateConfig({ ...configRef.current, apps: loaded.apps, pins: loaded.pins });
    utilityPinsRef.current = loaded.utilityPins;
    setUtilityPins(loaded.utilityPins);
    await showConfigNotices({ appsNotice: loaded.appsNotice });
  }, [updateConfig]);

  /** First settings read of this mount (and Retry after a failure). */
  const loadInitialConfig = useCallback(async () => {
    setConfigError(undefined);
    try {
      const loaded = await loadConfig();
      if (!mounted.current) return;
      dropdownShownAt.current = Date.now();
      updateConfig(loaded.config);
      utilityPinsRef.current = loaded.utilityPins;
      setUtilityPins(loaded.utilityPins);
      await showConfigNotices(loaded);
    } catch (error) {
      if (mounted.current) setConfigError(String(error));
    }
  }, [updateConfig]);

  const mountId = useRef(`${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);
  const startup = useRef<StartupAction | undefined>(props.startup);
  // Read the previous list's selection before this mount's own first selection can overwrite it (observed: the new
  // list's first row was persisted first and the startup action then acted on the wrong row).
  const startupSelection = useRef(props.startup ? readActionableSelection() : Promise.resolve(undefined));
  useEffect(() => {
    mounted.current = true;
    void saveListState(true, mountId.current);
    if (pendingSelect.current && !props.startup) void clearSelection();
    if (!started.current) {
      started.current = true;
      if (startup.current === "quit-selected") {
        // No scans here: quit straight from the stored selection (pids from the previous list's last scan, or the
        // system for a windowless app), then hand the window to app-list, which does the one visible reload.
        void (async () => {
          const selection = await startupSelection.current;
          startup.current = undefined;
          if (!selection) {
            await showToast({ style: Toast.Style.Failure, title: "Select an app first, then press the hotkey" });
            await launchCommand({ name: "app-list", type: LaunchType.UserInitiated });
            return;
          }
          const pids =
            selection.pids.length > 0
              ? selection.pids
              : selection.bundleId
                ? await pidsForBundle(selection.bundleId)
                : [];
          const target = quitTarget(selection);
          const noRefresh = async () => {};
          let selectId = appId(selection.key);
          if (target.kind === "window") {
            // A window row of an app with other windows: close just that window (owner, 2026-10-08).
            const name = selection.name;
            const outcome = await closeAppWindow({ ...target, name, bundleId: selection.bundleId }, noRefresh, () => {
              if (selection.afterClose) selectId = selection.afterClose;
            });
            // The app's save prompt is now in front and Raycast is closed: do not reopen the list over it.
            if (outcome === "asking") return;
          } else if (pids.length === 0) {
            await showToast({ style: Toast.Style.Failure, title: `${selection.name} is not running` });
          } else {
            for (const pid of pids) {
              const outcome = await quitApplication(
                { pid, name: selection.name, bundleId: selection.bundleId },
                noRefresh,
              );
              // The app's save prompt is now in front and Raycast is closed: do not reopen the list over it.
              if (outcome === "asking") return;
            }
          }
          await launchCommand({ name: "app-list", type: LaunchType.UserInitiated, context: { selectId } });
        })();
        return () => {
          mounted.current = false;
        };
      }
      void loadInitialConfig();
      void refreshWindows();
      void refreshBadges();
    }
    return () => {
      mounted.current = false;
      void saveListState(false, mountId.current);
    };
  }, [refreshWindows, refreshBadges, loadInitialConfig]);

  const rows = useMemo(
    () => (config ? buildRows(windows, badges, config, tier, existsSync) : []),
    [config, windows, badges, tier],
  );
  const expansion = useMemo<Expansion>(
    () => ({ expandByDefault, expanded, collapsed }),
    [expandByDefault, expanded, collapsed],
  );
  const items = useMemo<ListItem[]>(
    () => (config ? visibleItems({ rows, config, query, expansion, windows, badges }) : []),
    [rows, config, query, expansion, windows, badges],
  );
  // The Trash row waits for both reads, so it never renders alone first and takes the initial selection from the top
  // app row (the first row stays the one Return acts on). Refreshes keep the previous read, so it does not flicker.
  const trashShown =
    config !== undefined &&
    utilityPins !== undefined &&
    windows.kind !== "loading" &&
    badges.kind !== "loading" &&
    trashVisible(utilityPins.includes("trash"), config.filter, query);
  const empty = config
    ? emptyKind({ rows, config, query, expansion, windows, badges }, items.filter((i) => i.kind !== "status").length)
    : undefined;

  const itemsRef = useRef<ListItem[]>([]);
  itemsRef.current = items;
  /** The hotkey commands (Quit Selected App, Quit Other Apps) act on this. */
  const persistSelection = useCallback((id: string | null) => {
    if (startup.current) return; // not until the startup action has consumed the stored selection
    // No selection (a search that matches nothing) or not an app (Trash, status rows): forget the previous app, so a
    // hotkey quit refuses instead of quitting an app that is no longer selected.
    if (id === null || id === TRASH_ITEM_ID || id.startsWith("status:")) {
      void clearSelection();
      return;
    }
    const item = itemsRef.current.find((i) => i.id === id);
    if (!item || item.kind === "status") {
      // A row that is no longer listed: nothing to act on, so the hotkey quit refuses.
      void clearSelection();
      return;
    }
    const { row } = item;
    const base = {
      key: row.key,
      name: row.name,
      bundleId: row.bundleId,
      pids: row.pids,
      windowCount: row.windows.length,
    };
    if (item.kind === "window") {
      const { pid, wid } = item.window;
      void saveSelection({ ...base, window: { pid, wid }, afterClose: rowAfterClose(itemsRef.current, id) });
    } else {
      void saveSelection(base);
    }
  }, []);

  // §7.4 selection stability: when the selected id disappears, move once to the nearest survivor.
  useEffect(() => {
    const prev = previousItems.current;
    previousItems.current = items;
    const pending = pendingSelect.current;
    if (pending) {
      if (items.some((i) => i.id === pending)) {
        // The requested row is listed: it is the selection, whether or not Raycast reports it.
        pendingSelect.current = undefined;
        selectedRef.current = pending;
        setSelectedItemId(pending);
        persistSelection(pending);
        return;
      }
      // Still loading: wait. Scan done without that row: give up, and the survivor rule below picks a row.
      if (windows.kind === "loading") return;
      pendingSelect.current = undefined;
    }
    const sel = selectedRef.current;
    if (!sel) return;
    if (sel === TRASH_ITEM_ID && trashShown) return; // outside the app rows, and still there
    if (items.some((i) => i.id === sel)) {
      // Same row, possibly new facts (pids after a scan): keep the stored selection current for the hotkey commands.
      persistSelection(sel);
      return;
    }
    let next: string | undefined;
    if (sel.startsWith("win:")) {
      const owner = prev.find((i) => i.id === sel);
      if (owner && owner.kind === "window" && items.some((i) => i.id === owner.row.id)) next = owner.row.id;
    }
    if (!next) {
      const index = prev.findIndex((i) => i.id === sel);
      for (let i = index - 1; i >= 0 && !next; i--) if (items.some((x) => x.id === prev[i].id)) next = prev[i].id;
    }
    if (!next) next = items.find((i) => i.kind === "app")?.id;
    if (next) {
      selectedRef.current = next;
      setSelectedItemId(next);
      persistSelection(next);
    } else if (prev.some((i) => i.id === sel)) {
      // The selected row was listed and no row survived (a search that matches nothing): clear the stored app even if
      // Raycast reports no selection change, so a hotkey quit refuses instead of quitting the app selected before the
      // search. Not while the first rows are still loading (nothing listed yet), which keeps a relaunch's selectId.
      selectedRef.current = null;
      persistSelection(null);
    }
  }, [items, persistSelection, trashShown, windows.kind]);

  // Only track the selection here. `selectedItemId` is set solely by the survivor fallback above and released on the
  // next change: mirroring every selection into it made Raycast scroll the clicked or arrowed row to the top
  // (observed by the owner as the list "sliding up" on a single click).
  const onSelectionChange = useCallback(
    (id: string | null) => {
      if (pendingSelect.current && id !== pendingSelect.current) return;
      pendingSelect.current = undefined;
      selectedRef.current = id;
      persistSelection(id);
      setSelectedItemId((current) => (current === undefined ? current : undefined));
    },
    [persistSelection],
  );

  // ---------- configuration actions (never run a helper) ----------

  const changeFilter = useCallback(
    async (next: ListView) => {
      const current = configRef.current;
      if (!current || next === current.filter) return;
      updateConfig({ ...current, filter: next });
      try {
        await saveFilter(next);
      } catch (error) {
        await showToast({ style: Toast.Style.Failure, title: "Could not save the filter", message: String(error) });
      }
    },
    [updateConfig],
  );

  const onDropdownChange = useCallback(
    (value: string) => {
      const first = !dropdownReported.current;
      dropdownReported.current = true;
      if (first && Date.now() - dropdownShownAt.current < 1500) return;
      void changeFilter(value as ListView);
    },
    [changeFilter],
  );

  const toggleSort = useCallback(async () => {
    const current = configRef.current;
    if (!current) return;
    const next = otherSort(current.sort);
    updateConfig({ ...current, sort: next });
    try {
      await saveSort(next);
    } catch (error) {
      await showToast({ style: Toast.Style.Failure, title: "Could not save the sort order", message: String(error) });
    }
  }, [updateConfig]);

  /** §5.4: pin on a tracked app toggles; pin on an untracked app tracks it (at the end) and pins it in one save. */
  const togglePinned = useCallback(
    async (row: AppRow) => {
      const current = configRef.current;
      if (!current || !row.bundleId) return;
      try {
        if (row.tracked) {
          const pins = togglePin(current.pins, row.bundleId);
          updateConfig({ ...current, pins });
          await savePins(pins);
        } else {
          const apps = addApp(current.apps, { bundleId: row.bundleId, path: row.path ?? "", name: row.name });
          const pins = [...current.pins, row.bundleId];
          updateConfig({ ...current, apps, pins });
          await saveApps(apps);
          await savePins(pins);
          await showToast({ style: Toast.Style.Success, title: `Added ${row.name} to badge tracking and pinned it` });
        }
      } catch (error) {
        await showToast({ style: Toast.Style.Failure, title: "Could not save pins", message: String(error) });
      }
    },
    [updateConfig],
  );

  const toggleTrashPinned = useCallback(async () => {
    const next = toggleUtilityPin(utilityPinsRef.current, "trash");
    utilityPinsRef.current = next;
    setUtilityPins(next);
    try {
      await saveUtilityPins(next);
    } catch (error) {
      await showToast({ style: Toast.Style.Failure, title: "Could not save pins", message: String(error) });
    }
  }, []);

  const setGroup = useCallback((key: string, state: "expanded" | "collapsed") => {
    setExpanded((s) => {
      const n = new Set(s);
      if (state === "expanded") n.add(key);
      else n.delete(key);
      return n;
    });
    setCollapsed((s) => {
      const n = new Set(s);
      if (state === "collapsed") n.add(key);
      else n.delete(key);
      return n;
    });
  }, []);
  const setAll = useCallback(
    (state: "expanded" | "collapsed") => {
      const keys = rows.filter((r) => r.windows.length >= 2).map((r) => r.key);
      setExpanded(state === "expanded" ? new Set(keys) : new Set());
      setCollapsed(state === "collapsed" ? new Set(keys) : new Set());
    },
    [rows],
  );

  // ---------- helper-backed actions ----------

  const switchTo = useCallback(
    (w: WindowView) =>
      switchToWindow(w, refreshWindows, async () => {
        const recent = await recordRecent(w.bundleId, "switchedAt", Date.now());
        if (configRef.current) updateConfig({ ...configRef.current, recent });
      }),
    [refreshWindows, updateConfig],
  );

  /** ⌃Q on a window row of a multi-window app: close that window, then select a sibling window (rowAfterClose). */
  const closeWin = useCallback(
    async (item: Extract<ListItem, { kind: "window" }>) => {
      const { row, window: w } = item;
      const next = rowAfterClose(itemsRef.current, item.id);
      await closeAppWindow({ pid: w.pid, wid: w.wid, name: row.name, bundleId: w.bundleId }, refreshWindows, () => {
        if (!next) return;
        selectedRef.current = next;
        setSelectedItemId(next);
      });
    },
    [refreshWindows],
  );

  const openApp = useCallback(async (row: AppRow) => {
    if (!row.path || !existsSync(row.path)) {
      await showToast({ style: Toast.Style.Failure, title: `${row.name} was not found`, message: row.path });
      return;
    }
    try {
      await open(row.path);
      await recordRecent(row.bundleId, "switchedAt", Date.now());
      await closeMainWindow({ popToRootType: PopToRootType.Immediate });
    } catch (error) {
      await showToast({ style: Toast.Style.Failure, title: `Could not open ${row.name}`, message: String(error) });
    }
  }, []);

  /** §9: Finder opens its Trash window for the folder; no Raycast command, so no external-launch prompt. */
  const openTrash = useCallback(async () => {
    try {
      await open(join(homedir(), ".Trash"), "com.apple.finder");
      await closeMainWindow({ popToRootType: PopToRootType.Immediate });
    } catch (error) {
      await showToast({ style: Toast.Style.Failure, title: "Could not open the Trash", message: String(error) });
    }
  }, []);

  /**
   * §9: always our own confirmation first (Raycast's warning can be switched off), then Raycast's built-in Empty Trash
   * does the erasing. Raycast may still ask to run the command (first external launch) and show its own warning.
   */
  const emptyTrash = useCallback(async () => {
    const ok = await confirmAlert({
      icon: Icon.Trash,
      title: "Empty Trash?",
      message: "Permanently erases every item in the Trash. This cannot be undone.",
      primaryAction: { title: "Empty Trash", style: Alert.ActionStyle.Destructive },
    });
    if (!ok) return;
    try {
      await launchCommand({ ...EMPTY_TRASH_COMMAND, type: LaunchType.UserInitiated });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Raycast's Empty Trash command is not available",
        message: `Nothing was erased. Check that System Actions → Empty Trash is enabled. ${String(error)}`,
      });
    }
  }, []);

  /** The row's pids, or, for an app running without windows (absent from the helper's list), the system's answer. */
  const livePids = useCallback(async (row: AppRow) => {
    if (row.pids.length > 0 || !row.bundleId) return row.pids;
    return pidsForBundle(row.bundleId);
  }, []);

  /** Quit every running app in the list except the selected one (owner request). Normal quits, one rescan after. */
  const quitOthers = useCallback(
    async (keep: AppRow, refresh: () => Promise<void> = refreshWindows) => {
      const candidates = rows.filter((r) => r.key !== keep.key && r.bundleId !== "com.apple.finder");
      const others = (await Promise.all(candidates.map(async (r) => ({ ...r, pids: await livePids(r) })))).filter(
        (r) => r.pids.length > 0,
      );
      if (others.length === 0) {
        await showToast({ style: Toast.Style.Success, title: "No other apps to quit" });
        return;
      }
      const ok = await confirmAlert({
        title: `Quit ${plural(others.length, "other app")}?`,
        message: `Keeps ${keep.name}. Apps with unsaved changes will ask to save.\n${others.map((r) => r.name).join(", ")}`,
        primaryAction: { title: "Quit Others", style: Alert.ActionStyle.Destructive },
      });
      if (!ok) return;
      const toast = await showToast({ style: Toast.Style.Animated, title: "Quitting…" });
      let quit = 0;
      const stillRunning: string[] = [];
      for (const r of others) {
        for (const pid of r.pids) {
          const result = await quitApp(pid, r.bundleId);
          if (result.ok && result.value.quit) quit++;
          else stillRunning.push(r.name);
        }
      }
      toast.style = stillRunning.length ? Toast.Style.Failure : Toast.Style.Success;
      toast.title = `Quit ${plural(quit, "app")}`;
      toast.message = stillRunning.length ? `Still running: ${[...new Set(stillRunning)].join(", ")}` : undefined;
      await refresh();
    },
    [rows, refreshWindows, livePids],
  );

  const quit = useCallback(
    async (row: AppRow, refresh: () => Promise<void> = refreshWindows) => {
      const pids = await livePids(row);
      if (pids.length === 0) {
        await showToast({ style: Toast.Style.Failure, title: `${row.name} is not running` });
        return;
      }
      // Several pids under one key: each is asked in turn with its bundle guard and reports on its own.
      for (const pid of pids) {
        if ((await quitApplication({ pid, name: row.name, bundleId: row.bundleId }, refresh)) === "asking") return;
      }
    },
    [refreshWindows, livePids],
  );

  // Quit Other Apps mounts this list with a startup action; it runs once, after the first window scan (it needs the
  // other rows), on the row the previous list had selected. Quit Selected App is handled at mount without any scan.
  useEffect(() => {
    const action = startup.current;
    if (action !== "quit-others" || windows.kind !== "ok" || !config) return;
    void (async () => {
      const selection = await startupSelection.current;
      startup.current = undefined;
      if (!selection) {
        await showToast({ style: Toast.Style.Failure, title: "Select an app first, then press the hotkey" });
        return;
      }
      const row = rows.find((r) => r.key === selection.key);
      if (!row) {
        await showToast({ style: Toast.Style.Failure, title: `${selection.name} is not in the list` });
        return;
      }
      selectedRef.current = row.id;
      setSelectedItemId(row.id);
      void saveSelection({ key: row.key, name: row.name, bundleId: row.bundleId, pids: row.pids });
      await quitOthers(row, async () => {});
      // Hand the window back to app-list: a second press of the hotkey then re-mounts this action instead of
      // toggling the already-showing hotkey command's window closed. app-list rescans on mount.
      await launchCommand({ name: "app-list", type: LaunchType.UserInitiated, context: { selectId: row.id } });
    })();
  }, [windows, config, rows, quitOthers]);

  const copyDiagnostics = useCallback(async () => {
    const info = {
      extension: "app-management",
      raycast: environment.raycastVersion,
      filter: configRef.current?.filter,
      sort: configRef.current?.sort,
      windows:
        windows.kind === "loading"
          ? { state: "loading" }
          : {
              state: windows.kind,
              at: new Date(windows.at).toISOString(),
              failure: windows.kind === "failed" ? windows.failure : null,
              helperOutput: windowsRaw.current,
            },
      badges:
        badges.kind === "loading"
          ? { state: "loading" }
          : {
              state: badges.read.ok ? "ok" : "failed",
              at: new Date(badges.at).toISOString(),
              ...(badges.read.ok
                ? { items: badges.read.apps }
                : { failure: badges.read.failure, reason: badges.read.reason, diagnostic: badges.read.diagnostic }),
            },
    };
    // Concealed: it holds window titles and badge text, which stay out of Raycast's Clipboard History.
    await Clipboard.copy(JSON.stringify(info, null, 2), { concealed: true });
    await showToast({
      style: Toast.Style.Success,
      title: "Diagnostic info copied",
      message: "Includes window titles and badge text",
    });
  }, [windows, badges]);

  // ---------- shared action groups ----------

  const windowFailure = windows.kind === "failed" ? failureText(windows.failure) : undefined;
  const badgeFailure = badges.kind === "done" && !badges.read.ok ? badges.read : undefined;
  const permissionProblem =
    (windows.kind === "failed" && windows.failure.kind === "not-trusted") || badgeFailure?.failure === "permission";

  const configureAction = (
    <Action.Push
      title="Manage Pinned Apps"
      icon={Icon.Gear}
      shortcut={Keyboard.Shortcut.Common.Copy}
      target={<ConfigureApps />}
      onPop={() => void reloadAppsAndPins()}
    />
  );
  const filterAction = config ? (
    <Action
      title={`Show ${VIEW_TITLES[otherView(config.filter)]}`}
      icon={Icon.Filter}
      shortcut={FILTER_SHORTCUT}
      onAction={() => void changeFilter(otherView(config.filter))}
    />
  ) : null;
  const sortAction = config ? (
    <Action
      title={`Sort: ${SORT_TITLES[otherSort(config.sort)]}`}
      icon={Icon.ChevronUpDown}
      shortcut={SORT_SHORTCUT}
      onAction={() => void toggleSort()}
    />
  ) : null;
  const commonActions = (
    <>
      <ActionPanel.Section>
        <Action
          title="Refresh"
          icon={Icon.ArrowClockwise}
          shortcut={Keyboard.Shortcut.Common.Refresh}
          onAction={refreshBoth}
        />
        <Action
          title="Refresh Windows"
          icon={Icon.AppWindowList}
          shortcut={REFRESH_WINDOWS_SHORTCUT}
          onAction={refreshWindows}
        />
        <Action title="Refresh Badges" icon={Icon.Circle} shortcut={REFRESH_BADGES_SHORTCUT} onAction={refreshBadges} />
      </ActionPanel.Section>
      <ActionPanel.Section>
        {filterAction}
        {sortAction}
        {configureAction}
        <Action
          title="Copy Diagnostic Info"
          icon={Icon.Bug}
          shortcut={DIAGNOSTICS_SHORTCUT}
          onAction={copyDiagnostics}
        />
        {permissionProblem ? (
          <Action.Open title="Open Accessibility Settings" icon={Icon.Lock} target={ACCESSIBILITY_SETTINGS_URL} />
        ) : null}
      </ActionPanel.Section>
    </>
  );

  const groupActions = (row: AppRow, isCollapsed: boolean) =>
    row.windows.length >= 2 ? (
      <>
        {isCollapsed ? (
          <Action
            title="Expand Windows"
            icon={Icon.ChevronDown}
            shortcut={EXPAND_SHORTCUT}
            onAction={() => setGroup(row.key, "expanded")}
          />
        ) : (
          <Action
            title="Collapse Windows"
            icon={Icon.ChevronUp}
            shortcut={COLLAPSE_SHORTCUT}
            onAction={() => setGroup(row.key, "collapsed")}
          />
        )}
        <Action
          title="Expand All"
          icon={Icon.ChevronDown}
          shortcut={EXPAND_ALL_SHORTCUT}
          onAction={() => setAll("expanded")}
        />
        <Action
          title="Collapse All"
          icon={Icon.ChevronUp}
          shortcut={COLLAPSE_ALL_SHORTCUT}
          onAction={() => setAll("collapsed")}
        />
      </>
    ) : null;

  /** `quitShortcut` false on a window row whose ⌃Q closes the window instead; Quit stays in the panel without a key. */
  const quitAction = (row: AppRow, quitShortcut = true) => (
    <>
      {row.pids.length > 0 || row.tracked ? (
        <Action
          title={`Quit ${row.name}`}
          icon={Icon.XMarkCircle}
          style={Action.Style.Destructive}
          shortcut={quitShortcut ? QUIT_SHORTCUT : undefined}
          onAction={() => void quit(row)}
        />
      ) : null}
      <Action
        title="Quit Other Apps"
        icon={Icon.XMarkCircleFilled}
        style={Action.Style.Destructive}
        shortcut={QUIT_OTHERS_SHORTCUT}
        onAction={() => void quitOthers(row)}
      />
    </>
  );

  const pinAction = (row: AppRow) =>
    row.bundleId ? (
      <Action
        title={row.pinned ? "Unpin App" : "Pin App"}
        icon={row.pinned ? Icon.PinDisabled : Icon.Pin}
        shortcut={Keyboard.Shortcut.Common.Pin}
        onAction={() => void togglePinned(row)}
      />
    ) : null;

  // ---------- rendering ----------

  const emptyActions = (
    <ActionPanel>
      {empty === "no-apps-configured" || empty === "nothing" ? configureAction : null}
      {commonActions}
    </ActionPanel>
  );

  function emptyView() {
    if (!config && configError) {
      return (
        <List.EmptyView
          icon={{ source: Icon.Warning, tintColor: Color.Yellow }}
          title="Could not load your settings"
          description={configError}
          actions={
            <ActionPanel>
              <Action title="Retry" icon={Icon.ArrowClockwise} onAction={() => void loadInitialConfig()} />
            </ActionPanel>
          }
        />
      );
    }
    switch (empty) {
      case undefined:
        return null;
      case "reading":
        return (
          <List.EmptyView
            title="Reading…"
            description="Scanning windows and reading Dock badges"
            actions={emptyActions}
          />
        );
      case "no-match":
        return <List.EmptyView icon={Icon.MagnifyingGlass} title="No app or window matches" actions={emptyActions} />;
      case "no-apps-configured":
        return (
          <List.EmptyView
            icon={Icon.Gear}
            title="No apps in badge tracking"
            description="Open Manage Pinned Apps (⌘⇧C) to choose which Dock badges to show"
            actions={emptyActions}
          />
        );
      case "nothing":
        return (
          <List.EmptyView icon={Icon.Window} title="No windows and nothing pinned or badged" actions={emptyActions} />
        );
      case "noneBadged":
        return (
          <List.EmptyView
            icon={Icon.CheckCircle}
            title="No badge-tracked app has a badge"
            description="Badges were read from the Dock just now"
            actions={emptyActions}
          />
        );
      case "nonePinnedOrBadged":
        return (
          <List.EmptyView
            icon={Icon.Pin}
            title="No pinned apps and no badges"
            description="Pin apps in Manage Pinned Apps (⌘⇧C) to always show them"
            actions={emptyActions}
          />
        );
      case "failed":
      case "badges-failed":
        return (
          <List.EmptyView
            icon={{ source: Icon.Warning, tintColor: Color.Yellow }}
            title={badgeFailure?.reason ?? REASONS["helper-error"]}
            description="Badges could not be read, so this view cannot tell which apps have badges"
            actions={emptyActions}
          />
        );
      case "windows-failed":
        return (
          <List.EmptyView
            icon={{ source: Icon.ExclamationMark, tintColor: Color.Red }}
            title={windowFailure?.title ?? "Window helper failed"}
            description={windowFailure?.description}
            actions={emptyActions}
          />
        );
      case "both-failed":
        return (
          <List.EmptyView
            icon={{ source: Icon.ExclamationMark, tintColor: Color.Red }}
            title="Windows and badges unavailable"
            description={`${windowFailure?.title ?? ""}. ${badgeFailure?.reason ?? ""}`}
            actions={emptyActions}
          />
        );
    }
  }

  function renderStatus(item: Extract<ListItem, { kind: "status" }>) {
    if (item.id === "status:windows") {
      return (
        <List.Item
          key={item.id}
          id={item.id}
          icon={{ source: Icon.ExclamationMark, tintColor: Color.Red }}
          title={windowFailure?.title ?? "Windows unavailable"}
          subtitle={windowFailure?.description}
          accessories={[{ tag: { value: "Windows unavailable", color: Color.Red } }]}
          actions={
            <ActionPanel>
              <Action
                title="Refresh Windows"
                icon={Icon.AppWindowList}
                shortcut={REFRESH_WINDOWS_SHORTCUT}
                onAction={refreshWindows}
              />
              <Action
                title="Copy Diagnostic Info"
                icon={Icon.Bug}
                shortcut={DIAGNOSTICS_SHORTCUT}
                onAction={copyDiagnostics}
              />
              {windows.kind === "failed" && windows.failure.kind === "not-trusted" ? (
                <Action.Open title="Open Accessibility Settings" icon={Icon.Lock} target={ACCESSIBILITY_SETTINGS_URL} />
              ) : null}
              {commonActions}
            </ActionPanel>
          }
        />
      );
    }
    return (
      <List.Item
        key={item.id}
        id={item.id}
        icon={{ source: Icon.Warning, tintColor: Color.Yellow }}
        title={badgeFailure?.reason ?? "Badges unavailable"}
        subtitle="Badges could not be read"
        accessories={[{ tag: { value: "Badges unavailable", color: Color.Yellow } }]}
        actions={
          <ActionPanel>
            <Action
              title="Refresh Badges"
              icon={Icon.Circle}
              shortcut={REFRESH_BADGES_SHORTCUT}
              onAction={refreshBadges}
            />
            <Action
              title="Copy Diagnostic Info"
              icon={Icon.Bug}
              shortcut={DIAGNOSTICS_SHORTCUT}
              onAction={copyDiagnostics}
            />
            {badgeFailure?.failure === "permission" ? (
              <Action.Open title="Open Accessibility Settings" icon={Icon.Lock} target={ACCESSIBILITY_SETTINGS_URL} />
            ) : null}
            {commonActions}
          </ActionPanel>
        }
      />
    );
  }

  function renderApp(item: AppItem) {
    const { row } = item;
    const primary = primaryAction(item);
    return (
      <List.Item
        key={item.id}
        id={item.id}
        icon={appIcon(row)}
        title={row.name}
        subtitle={appSubtitle(item)}
        keywords={[row.bundleId ?? "", row.path ? basename(row.path, ".app") : ""].filter(Boolean)}
        accessories={appAccessories(item, tier, windowFailure?.title)}
        actions={
          <ActionPanel>
            <ActionPanel.Section>
              {primary.kind === "switch" ? (
                <Action title={primary.label} icon={Icon.Window} onAction={() => void switchTo(primary.window)} />
              ) : null}
              {primary.kind === "show-windows" ? (
                <Action title="Show Windows" icon={Icon.AppWindowList} onAction={() => setGroup(row.key, "expanded")} />
              ) : null}
              {primary.kind === "open-app" ? (
                <Action title="Open App" icon={Icon.AppWindow} onAction={() => void openApp(row)} />
              ) : null}
              {primary.kind !== "show-windows" ? groupActions(row, item.collapsed) : null}
            </ActionPanel.Section>
            <ActionPanel.Section>
              {pinAction(row)}
              {quitAction(row)}
            </ActionPanel.Section>
            {commonActions}
          </ActionPanel>
        }
      />
    );
  }

  function renderWindow(item: Extract<ListItem, { kind: "window" }>) {
    const { row, window: w } = item;
    return (
      <List.Item
        key={item.id}
        id={item.id}
        icon={{ source: Icon.Window, tintColor: Color.SecondaryText }}
        title={{ value: `↳ ${clip(w.title)}`, tooltip: `${w.title} (window ID ${w.wid}, pid ${w.pid})` }}
        subtitle={w.duplicate ? `${w.duplicate.index} of ${w.duplicate.count} with this title` : undefined}
        accessories={windowAccessories(w)}
        actions={
          <ActionPanel>
            <ActionPanel.Section>
              <Action title="Switch to Window" icon={Icon.Window} onAction={() => void switchTo(w)} />
              <Action.CopyToClipboard
                title="Copy Window Title"
                content={w.rawTitle}
                shortcut={Keyboard.Shortcut.Common.CopyName}
              />
              {groupActions(row, false)}
            </ActionPanel.Section>
            <ActionPanel.Section>
              {pinAction(row)}
              {row.windows.length >= 2 ? (
                // Same ⌃Q as Quit on an app row and the same rule as Quit Selected App: close only this window.
                <Action
                  title="Close Window"
                  icon={Icon.XMarkCircle}
                  style={Action.Style.Destructive}
                  shortcut={QUIT_SHORTCUT}
                  onAction={() => void closeWin(item)}
                />
              ) : null}
              {quitAction(row, row.windows.length < 2)}
            </ActionPanel.Section>
            {commonActions}
          </ActionPanel>
        }
      />
    );
  }

  function renderTrash() {
    const pinned = utilityPins?.includes("trash") ?? false;
    return (
      <List.Item
        key={TRASH_ITEM_ID}
        id={TRASH_ITEM_ID}
        icon={Icon.Trash}
        title="Trash"
        // Same trailing slots as an app row (badge, then one icon), so the pin lines up with the app pins above.
        accessories={[BLANK_BADGE, pinned ? TRASH_PIN_ACCESSORY : BLANK_ICON]}
        actions={
          <ActionPanel>
            <ActionPanel.Section>
              <Action title="Open Trash" icon={Icon.Trash} onAction={() => void openTrash()} />
              <Action
                title="Empty Trash…"
                icon={Icon.Trash}
                style={Action.Style.Destructive}
                onAction={() => void emptyTrash()}
              />
            </ActionPanel.Section>
            <ActionPanel.Section>
              <Action
                title={pinned ? "Unpin Trash" : "Pin Trash"}
                icon={pinned ? Icon.PinDisabled : Icon.Pin}
                shortcut={Keyboard.Shortcut.Common.Pin}
                onAction={() => void toggleTrashPinned()}
              />
            </ActionPanel.Section>
            {commonActions}
          </ActionPanel>
        }
      />
    );
  }

  if (props.startup === "quit-selected") return <List isLoading navigationTitle="Quitting…" />;

  return (
    <List
      navigationTitle="Apps"
      searchBarPlaceholder="Search apps and window titles"
      isLoading={(config === undefined && !configError) || windowsRunning || badgesRunning}
      filtering={false}
      searchText={query}
      onSearchTextChange={setQuery}
      selectedItemId={selectedItemId}
      onSelectionChange={onSelectionChange}
      searchBarAccessory={
        config ? (
          <List.Dropdown tooltip="Filter (⌘P)" value={config.filter} onChange={onDropdownChange}>
            <List.Dropdown.Item title={VIEW_TITLES.allApps} value="allApps" icon={Icon.AppWindowList} />
            <List.Dropdown.Item title={VIEW_TITLES.pinnedAndBadged} value="pinnedAndBadged" icon={Icon.Pin} />
            <List.Dropdown.Item title={VIEW_TITLES.badgedOnly} value="badgedOnly" icon={Icon.Filter} />
          </List.Dropdown>
        ) : undefined
      }
    >
      {trashShown ? null : emptyView()}
      {items.map((item) =>
        item.kind === "status" ? renderStatus(item) : item.kind === "app" ? renderApp(item) : renderWindow(item),
      )}
      {trashShown ? <List.Section title="Utilities">{renderTrash()}</List.Section> : null}
    </List>
  );
}

export default function Command(props: LaunchProps<{ launchContext?: { selectId?: string } }>) {
  return <AppList fallbackText={props.fallbackText} selectId={props.launchContext?.selectId} />;
}
