import {
  Action,
  ActionPanel,
  Alert,
  Application,
  Color,
  Icon,
  LaunchProps,
  LaunchType,
  List,
  LocalStorage,
  confirmAlert,
  getFrontmostApplication,
  getPreferenceValues,
  getSelectedFinderItems,
  launchCommand,
} from "@raycast/api";
// Note: useNavigation and Form are no longer needed. The Choose
// Folder flow now opens the native macOS picker directly instead of
// pushing a Raycast Form view.
import {
  showFailureToast,
  useCachedPromise,
  useLocalStorage,
} from "@raycast/utils";
import { execFile } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";
import { useEffect, useMemo, useRef, useState } from "react";
import { promisify } from "node:util";
import { DEFAULT_TERMINAL } from "./constants";
import {
  RecentProject,
  STORAGE_KEY,
  recordSeenBatch,
  removeRecent,
} from "./recents";
import { fetchServers, findProjectRoot } from "./servers";
import { toolColor, toolLabel } from "./tool-display";
import { DevServer } from "./types";

const execFileAsync = promisify(execFile);

// One-time discoverability nudge for the autoOpenInBrowser pref. The
// Start command pre-decides whether to surface the CTA (so the counter
// is consistent regardless of whether the user lands on a confirm or
// goes straight to spawn), then passes the decision through launchContext
// for the dashboard to render on its toast.
const AUTO_OPEN_HINT_MAX = 3;
const AUTO_OPEN_HINT_KEY = "auto-open-hint-shown";

// Decide whether to surface the one-time "Auto-open in Browser?" CTA and, if
// so, consume one of its remaining showings, in a single storage read/write
// rather than a separate should-show check followed by a bump.
async function maybeConsumeAutoOpenHint(): Promise<boolean> {
  const raw = await LocalStorage.getItem<string>(AUTO_OPEN_HINT_KEY);
  const count = raw ? parseInt(raw, 10) : 0;
  if (!Number.isFinite(count) || count >= AUTO_OPEN_HINT_MAX) return false;
  await LocalStorage.setItem(AUTO_OPEN_HINT_KEY, String(count + 1));
  return true;
}

// Best-guess framework for a project, read from package.json dependencies.
// UI tag only. Process inspection is still the source of truth for a
// running server.
function guessFramework(cwd: string): string | undefined {
  try {
    const pkg = JSON.parse(
      fs.readFileSync(path.join(cwd, "package.json"), "utf8"),
    ) as {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };
    const deps = {
      ...(pkg.dependencies ?? {}),
      ...(pkg.devDependencies ?? {}),
    };
    if ("next" in deps) return "next";
    if ("@sveltejs/kit" in deps) return "sveltekit";
    if ("svelte" in deps) return "svelte";
    if ("astro" in deps) return "astro";
    if ("nuxt" in deps || "nuxt3" in deps) return "nuxt";
    if ("@remix-run/dev" in deps) return "remix";
    if ("gatsby" in deps) return "gatsby";
    if ("vite" in deps) return "vite";
    if ("webpack" in deps) return "webpack";
    if ("parcel" in deps) return "parcel";
    if ("turbo" in deps) return "turbo";
    if ("esbuild" in deps) return "esbuild";
    return undefined;
  } catch {
    return undefined;
  }
}

function formatLastSeen(ts: number): string {
  const seconds = Math.floor((Date.now() - ts) / 1000);
  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  const days = Math.floor(seconds / 86400);
  return days === 1 ? "yesterday" : `${days}d ago`;
}

interface Target {
  cwd: string;
  projectName: string;
}

function resolveTarget(rawPath: string): Target | null {
  const cwd = findProjectRoot(rawPath);
  if (!cwd) return null;
  return { cwd, projectName: path.basename(cwd) };
}

// Hand the spawn request off to the dashboard. The dashboard owns
// confirms, kill+spawn, and the toast lifecycle; this command only
// resolves the target list and navigates. Faster perceived flow for
// the user (dashboard appears immediately instead of waiting on a
// blank Start view).
async function launchSpawn(
  targets: Array<{ cwd: string; name: string }>,
  options: { autoOpen: boolean; confirmMulti: boolean },
): Promise<void> {
  const showAutoOpenHint =
    !options.autoOpen && (await maybeConsumeAutoOpenHint());
  try {
    await launchCommand({
      name: "index",
      type: LaunchType.UserInitiated,
      context: {
        spawn: {
          targets,
          autoOpen: options.autoOpen,
          confirmMulti: options.confirmMulti,
          showAutoOpenHint,
        },
      },
    });
  } catch (err) {
    await showFailureToast(err, { title: "Couldn't open the dashboard" });
  }
}

// Open the native macOS folder picker via osascript. Skips the Form +
// Form.FilePicker round-trip the API would otherwise require. The user
// gets the OS dialog immediately instead of a Raycast screen they have
// to click through first. Returns the picked POSIX path, or null when
// the user cancels (osascript exits non-zero in that case).
async function pickFolderNative(): Promise<string | null> {
  try {
    const { stdout } = await execFileAsync("osascript", [
      "-e",
      'POSIX path of (choose folder with prompt "Pick a project folder")',
    ]);
    return stdout.trim() || null;
  } catch {
    // User canceled or osascript was unavailable; silently no-op.
    return null;
  }
}

// Handler for the picker's "Choose Folder…" action. Opens the native
// dialog, resolves the pick to a project root, and hands off to the
// dashboard via launchSpawn.
async function chooseFolderAndStart(options: {
  autoOpen: boolean;
}): Promise<void> {
  const raw = await pickFolderNative();
  if (!raw) return;
  const target = resolveTarget(raw);
  if (!target) {
    await showFailureToast(undefined, {
      title: "No package.json found",
      message: "That folder isn't inside a Node project.",
    });
    return;
  }
  await launchSpawn([{ cwd: target.cwd, name: target.projectName }], {
    autoOpen: options.autoOpen,
    confirmMulti: false,
  });
}

interface RowProps {
  recent: RecentProject;
  framework?: string;
  terminalApp: Application;
  autoOpen: boolean;
  onRemove: (cwd: string) => Promise<void>;
}

function RecentRow({
  recent,
  framework,
  terminalApp,
  autoOpen,
  onRemove,
}: RowProps) {
  async function start() {
    await launchSpawn([{ cwd: recent.cwd, name: recent.projectName }], {
      autoOpen,
      confirmMulti: false,
    });
  }

  async function remove() {
    const ok = await confirmAlert({
      title: `Remove ${recent.projectName} from recents?`,
      message:
        "The project files stay where they are; only the recents entry is removed.",
      primaryAction: {
        title: "Remove",
        style: Alert.ActionStyle.Destructive,
      },
    });
    if (!ok) return;
    await onRemove(recent.cwd);
  }

  const tool = framework;
  const accessories: List.Item.Accessory[] = [
    {
      text: formatLastSeen(recent.lastSeen),
      tooltip: `Last seen ${new Date(recent.lastSeen).toLocaleString()}`,
    },
  ];
  if (tool) {
    accessories.push({
      tag: { value: toolLabel(tool), color: toolColor(tool) },
    });
  }

  const branchSubtitle = recent.branch
    ? { value: recent.branch, tooltip: `Branch: ${recent.branch}` }
    : undefined;

  // Prefer the cached favicon for projects we've seen running. The
  // dashboard persists this onto the recents entry, so even stopped
  // projects display their real icon.
  const icon = recent.favicon
    ? { source: recent.favicon, fallback: Icon.Folder }
    : {
        source: Icon.Folder,
        tintColor: tool ? toolColor(tool) : Color.SecondaryText,
      };

  return (
    <List.Item
      icon={icon}
      title={recent.projectName}
      subtitle={branchSubtitle}
      keywords={[recent.cwd, recent.branch].filter((v): v is string =>
        Boolean(v),
      )}
      accessories={accessories}
      actions={
        <ActionPanel>
          <Action title="Start Dev Server" icon={Icon.Play} onAction={start} />
          <ActionPanel.Section>
            <Action.Open
              title={`Open in ${terminalApp.name}`}
              icon={Icon.Terminal}
              target={recent.cwd}
              application={terminalApp}
              shortcut={{ modifiers: ["cmd"], key: "t" }}
            />
            <Action.ShowInFinder
              path={recent.cwd}
              shortcut={{ modifiers: ["cmd", "shift"], key: "f" }}
            />
            <Action.CopyToClipboard
              title="Copy Path"
              content={recent.cwd}
              shortcut={{ modifiers: ["cmd"], key: "c" }}
            />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action
              title="Remove from Recents"
              icon={Icon.Trash}
              style={Action.Style.Destructive}
              shortcut={{ modifiers: ["ctrl"], key: "x" }}
              onAction={remove}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

interface PickerProps {
  autoOpen: boolean;
  terminalApp: Application;
}

// Picker view shown when there's no Finder selection. Lists recent
// projects (excluding currently-running ones, which live in the
// dashboard) and an always-present "Choose Folder…" entry for one-off
// picks.
function PickerView({ autoOpen, terminalApp }: PickerProps) {
  // Passive migration: every mount triggers an empty recordSeenBatch
  // which canonicalizes any non-symlink-resolved entries left over from
  // earlier builds, so the running-server filter below matches reliably.
  useEffect(() => {
    void recordSeenBatch([]).catch(() => {});
  }, []);

  const {
    value: recents,
    isLoading: isLoadingRecents,
    setValue: setRecents,
  } = useLocalStorage<RecentProject[]>(STORAGE_KEY, []);
  const { data: running = [], isLoading: isLoadingRunning } = useCachedPromise(
    fetchServers,
    [],
    { keepPreviousData: true },
  );

  const runningByCwd = useMemo(() => {
    const m = new Map<string, DevServer>();
    for (const s of running) m.set(s.cwd, s);
    return m;
  }, [running]);

  // Framework detection reads each project's package.json from disk. Run it
  // off the render path (in a cached promise keyed by the recents' cwds)
  // rather than synchronously in a useMemo, so opening the picker with a
  // full recents list doesn't block the first paint on up to MAX_RECENTS
  // synchronous file reads. keepPreviousData holds the tags steady while a
  // refreshed list resolves.
  const recentCwds = useMemo(
    () => (recents ?? []).map((r) => r.cwd),
    [recents],
  );
  const { data: frameworkByCwd } = useCachedPromise(
    async (cwds: string[]): Promise<Record<string, string>> => {
      const out: Record<string, string> = {};
      for (const cwd of cwds) {
        const fw = guessFramework(cwd);
        if (fw) out[cwd] = fw;
      }
      return out;
    },
    [recentCwds],
    { keepPreviousData: true, initialData: {} },
  );

  // Hide entries that are currently running (the dashboard owns them) or
  // whose folder no longer exists on disk. We keep them in storage so a
  // remounted external drive or stopped server reappears.
  //
  // The existence check is intentionally synchronous despite running on the
  // render path. It's bounded (≤ MAX_RECENTS = 30 stats), runs only when the
  // recents/running sets change (this view doesn't poll on an interval), and a
  // local-disk stat is sub-millisecond. Keeping it sync avoids the alternative's
  // flash: an async check would paint all rows first, then pop out the dead
  // ones a beat later. Unlike guessFramework (moved off-render because it parses
  // package.json), this is a single cheap metadata syscall, so the tradeoff
  // favors no flash over shaving microseconds.
  const visible = useMemo(() => {
    return (recents ?? [])
      .filter((r) => {
        if (runningByCwd.has(r.cwd)) return false;
        try {
          return fs.statSync(r.cwd).isDirectory();
        } catch {
          return false;
        }
      })
      .sort((a, b) => b.lastSeen - a.lastSeen);
  }, [recents, runningByCwd]);

  // Delete via removeRecent, which reads fresh from storage and drops only
  // the targeted entry. Filtering the hook's in-memory `recents` instead
  // would clobber any entries written out-of-band since the hook last read:
  // the dashboard's recordSeenBatch poll and this command's own mount-time
  // migration both write directly to LocalStorage, and useLocalStorage does
  // not re-read on those external writes. We then feed the freshly-written
  // list back through setRecents so the hook's state matches storage (same
  // value, so no re-clobber).
  async function handleRemove(targetCwd: string) {
    await setRecents(await removeRecent(targetCwd));
  }

  const isLoading = isLoadingRecents || isLoadingRunning;
  const hasRecents = visible.length > 0;

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Filter recent projects..."
    >
      <List.Section title="Browse">
        <List.Item
          icon={Icon.NewFolder}
          title="Choose Folder…"
          subtitle="Pick a project that isn't in your recents"
          actions={
            <ActionPanel>
              <Action
                title="Choose Folder…"
                icon={Icon.NewFolder}
                onAction={() => chooseFolderAndStart({ autoOpen })}
              />
            </ActionPanel>
          }
        />
      </List.Section>
      {hasRecents && (
        <List.Section title="Recent Projects" subtitle={`${visible.length}`}>
          {visible.map((r) => (
            <RecentRow
              key={r.cwd}
              recent={r}
              framework={frameworkByCwd[r.cwd]}
              terminalApp={terminalApp}
              autoOpen={autoOpen}
              onRemove={handleRemove}
            />
          ))}
        </List.Section>
      )}
    </List>
  );
}

// Unified command entry point. This command is now a pure launcher: it
// resolves the Finder selection (if any) into a target list and hands
// off to the dashboard, which owns the confirms, kill+spawn, and toast
// lifecycle. The user lands on the dashboard immediately rather than
// waiting on a blank Start view for slow pre-spawn work.
//
//   ┌─ forcePicker (launched from the dashboard's ⌘N / empty state)?
//   │      ├─ Yes → render the picker directly, skip the Finder probe.
//   │      └─ No  → ┌─ Is Finder the frontmost app?
//   │              │      ├─ No  → render the picker (recents + "Choose Folder…").
//   │              │      └─ Yes → ┌─ Finder selection resolves to a project?
//   │              │              │      ├─ Yes → launchCommand to dashboard with
//   │              │              │      │        spawn details in launchContext.
//   │              │              │      └─ No  → render the picker.
//
// The frontmost-app gate is the key UX safeguard. `getSelectedFinderItems`
// returns Finder's *persisted* selection regardless of what's actually in
// focus, so a folder selected an hour ago to start one server would otherwise
// be silently re-resolved as a target the next time the command runs from,
// say, the browser — surfacing a baffling "already running, restart?" when the
// user only meant to open the picker to start a *different* project. Honoring
// the selection only when Finder is genuinely frontmost matches the user's
// mental model ("I'm not in Finder, so don't act on its selection") and still
// preserves the one-keystroke "select in Finder and run" flow. forcePicker is
// the narrower dashboard-initiated shortcut: there the user is explicitly
// choosing what to start, so we skip the probe entirely.
export default function Command(
  props: LaunchProps<{ launchContext?: { forcePicker?: boolean } }>,
) {
  const prefs = getPreferenceValues<Preferences.Start>();
  const autoOpen = prefs.autoOpenInBrowser ?? false;
  const confirmMulti = prefs.confirmMultiStart ?? true;
  const terminalApp = prefs.terminalApp ?? DEFAULT_TERMINAL;
  const forcePicker = props.launchContext?.forcePicker ?? false;

  const [phase, setPhase] = useState<"checking" | "picker">(
    forcePicker ? "picker" : "checking",
  );
  // Guard against React's StrictMode double-invocation of effects in
  // development, which would otherwise probe Finder twice.
  const probedRef = useRef(false);

  useEffect(() => {
    // Dashboard-initiated launch: go straight to the picker, no Finder probe.
    if (forcePicker) return;
    if (probedRef.current) return;
    probedRef.current = true;
    void (async () => {
      // Only honor a Finder selection when Finder is the active app. The
      // selection persists in Finder indefinitely, so without this gate a
      // stale pick gets silently turned into a spawn target (see the header
      // comment for the full rationale). If we can't determine the frontmost
      // app, fall back to the picker rather than risk acting on a stale
      // selection.
      try {
        const frontmost = await getFrontmostApplication();
        const isFinder =
          frontmost.bundleId === "com.apple.finder" ||
          frontmost.name === "Finder";
        if (!isFinder) {
          setPhase("picker");
          return;
        }
      } catch {
        setPhase("picker");
        return;
      }

      let selection: Array<{ path: string }>;
      try {
        selection = await getSelectedFinderItems();
      } catch {
        setPhase("picker");
        return;
      }
      if (selection.length === 0) {
        setPhase("picker");
        return;
      }

      // Resolve each Finder item to a project root, dedup by cwd.
      const seen = new Set<string>();
      const targets: Target[] = [];
      for (const item of selection) {
        const t = resolveTarget(item.path);
        if (!t || seen.has(t.cwd)) continue;
        seen.add(t.cwd);
        targets.push(t);
      }
      if (targets.length === 0) {
        await showFailureToast(undefined, {
          title: "No package.json in selection",
          message: "Pick a project from your recents instead.",
        });
        setPhase("picker");
        return;
      }

      // Hand off to the dashboard. No fetchServers, no confirms, no
      // spawn here; the dashboard handles all of it from its own
      // lifecycle, so the user sees the dashboard within a few hundred
      // ms instead of waiting on this view.
      await launchSpawn(
        targets.map((t) => ({ cwd: t.cwd, name: t.projectName })),
        { autoOpen, confirmMulti },
      );
    })();
  }, [autoOpen, confirmMulti, forcePicker]);

  if (phase === "picker") {
    return <PickerView autoOpen={autoOpen} terminalApp={terminalApp} />;
  }

  // Minimal placeholder while we resolve the Finder selection. Just the
  // loading bar; the dashboard is right behind it.
  return <List isLoading={true} searchBarPlaceholder="Starting dev server…" />;
}
