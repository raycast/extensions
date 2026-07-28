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
import {
  directoryExists,
  fetchServers,
  findProjectRoot,
  isShopifyAppRoot,
  isShopifyThemeRoot,
} from "./servers";
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

// Best-guess framework for a project, read from filesystem markers and
// package.json dependencies. UI tag only. Process inspection is still the
// source of truth for a running server.
function guessFramework(cwd: string): string | undefined {
  // Themes first: they have no package.json at all, so nothing below could
  // ever label them.
  if (isShopifyThemeRoot(cwd)) return "shopify-theme";
  let deps: Record<string, string> = {};
  try {
    const pkg = JSON.parse(
      fs.readFileSync(path.join(cwd, "package.json"), "utf8"),
    ) as {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };
    deps = { ...(pkg.dependencies ?? {}), ...(pkg.devDependencies ?? {}) };
  } catch {
    // No readable package.json; the marker checks below still apply.
  }
  // Hydrogen before the app-toml marker: the skeleton ships no
  // shopify.app.toml today, but if a project ever carries both, the dep is
  // the more specific signal. Both before the generic deps chain, since
  // Shopify projects also carry framework deps (Remix, Vite) that would
  // otherwise win and mislabel them.
  if ("@shopify/hydrogen" in deps) return "shopify-hydrogen";
  if (isShopifyAppRoot(cwd)) return "shopify-app";
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
  // Below the bundlers on purpose: a Vite + Wrangler project is a Vite
  // project that deploys to Cloudflare, but a wrangler-only one is a Worker.
  if ("wrangler" in deps) return "wrangler";
  if ("esbuild" in deps) return "esbuild";
  return undefined;
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

// What Finder currently offers this command, if anything.
interface FinderProbe {
  // Selected items resolved to project roots, deduped by cwd. Empty whenever
  // the gate below fails, so callers can treat "nothing to offer" uniformly.
  targets: Target[];
  // True when Finder had a selection that resolved to nothing startable. Only
  // then is "no project in selection" worth saying: with no selection at all,
  // or with Finder in the background, the user never proposed anything.
  sawSelection: boolean;
}

// Resolve Finder's selection into spawn targets, gated on Finder actually
// being the frontmost app.
//
// The gate is the safeguard, not a formality. `getSelectedFinderItems` returns
// Finder's *persisted* selection whatever is in focus, so a folder selected an
// hour ago would otherwise still read as a proposal. Raycast does not count
// itself as frontmost while its window is up, so this reports the app behind
// the window: "Finder" means the user was just there, which is exactly when a
// selection means something. Any failure resolves to an empty probe, so an
// unavailable Finder can never block the picker.
async function probeFinderSelection(): Promise<FinderProbe> {
  const empty: FinderProbe = { targets: [], sawSelection: false };
  try {
    const frontmost = await getFrontmostApplication();
    const isFinder =
      frontmost.bundleId === "com.apple.finder" || frontmost.name === "Finder";
    if (!isFinder) return empty;
  } catch {
    // Can't tell what's in front; treat that like "not Finder" rather than
    // risk acting on a stale selection.
    return empty;
  }

  let selection: Array<{ path: string }>;
  try {
    selection = await getSelectedFinderItems();
  } catch {
    return empty;
  }
  if (selection.length === 0) return empty;

  const seen = new Set<string>();
  const targets: Target[] = [];
  for (const item of selection) {
    const t = resolveTarget(item.path);
    if (!t || seen.has(t.cwd)) continue;
    seen.add(t.cwd);
    targets.push(t);
  }
  return { targets, sawSelection: true };
}

// Identity for one spawn request, unique per call. The dashboard compares it
// against the last request it handled, which is how a start reaches a
// dashboard that is already mounted rather than being silently dropped.
function newRequestId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
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
          // No autoOpen: the dashboard reads that preference itself. It is
          // extension-level, so sending a copy only creates a second value
          // that can disagree with the real one. `options.autoOpen` is still
          // used above, to decide whether the one-time hint is worth showing.
          targets,
          confirmMulti: options.confirmMulti,
          showAutoOpenHint,
          // Fresh per send, so a dashboard that is already mounted can tell
          // this request from the one it handled last.
          requestId: newRequestId(),
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
      title: "No project found",
      message:
        "That folder isn't inside a Node project or a Shopify theme/app.",
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
  editorApp?: Application;
  autoOpen: boolean;
  onRemove: (cwd: string) => Promise<void>;
}

function RecentRow({
  recent,
  framework,
  terminalApp,
  editorApp,
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

  const accessories: List.Item.Accessory[] = [
    {
      text: formatLastSeen(recent.lastSeen),
      tooltip: `Last seen ${new Date(recent.lastSeen).toLocaleString()}`,
    },
  ];
  if (framework) {
    accessories.push({
      tag: { value: toolLabel(framework), color: toolColor(framework) },
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
        tintColor: framework ? toolColor(framework) : Color.SecondaryText,
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
            {editorApp && (
              <Action.Open
                title={`Open in ${editorApp.name}`}
                icon={Icon.Code}
                target={recent.cwd}
                application={editorApp}
                shortcut={{ modifiers: ["cmd"], key: "e" }}
              />
            )}
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
  // Finder's current selection, resolved to project roots. Empty unless
  // Finder was the app behind the Raycast window when this command opened.
  finderTargets: Target[];
  terminalApp: Application;
  editorApp?: Application;
}

// One row standing for everything selected in Finder, at the top of the
// picker. `⌘N` from the dashboard skips the Finder probe on purpose, so
// before this row a Finder selection was simply unreachable from there: the
// user had to go back to root search to act on folders they had already
// picked. Offering it as a row rather than spawning it keeps what the flag
// was defending: a selection sitting behind the Raycast window is proposed,
// visibly and by name, and never acted on until the user says so.
function FinderSelectionRow({
  targets,
  autoOpen,
}: {
  targets: Target[];
  autoOpen: boolean;
}) {
  const names = targets.map((t) => t.projectName);
  const multiple = targets.length > 1;
  const title = multiple
    ? `Start ${targets.length} Selected Folders`
    : `Start ${names[0]}`;

  async function start() {
    await launchSpawn(
      targets.map((t) => ({ cwd: t.cwd, name: t.projectName })),
      // No multi-start confirm, like every other row in this picker. That
      // preference guards the invisible path: from root search a hotkey
      // spawns a Finder selection having shown nothing, and the dialog is
      // the first sight of what is starting. Here the row was that sight,
      // and it named these exact folders, so a confirm could only print the
      // same list again. It is also bound to this snapshot rather than to
      // whatever Finder holds at ↵, so the row cannot misstate what spawns.
      //
      // The already-running confirm is untouched and still fires: whether
      // one of these is up is precisely what the row could not know.
      { autoOpen, confirmMulti: false },
    );
  }

  return (
    <List.Item
      // Bundled rather than an Icon enum value: the checked folder says
      // "the ones you picked", which no built-in glyph does. Light and dark
      // variants are real files because Raycast gives a bundled SVG no color
      // context, the same reason the menu bar ships pairs.
      icon={{
        source: {
          light: "picker-finder-selection.svg",
          dark: "picker-finder-selection@dark.svg",
        },
      }}
      title={title}
      // Names for several, the path for one: with a single folder the title
      // has already said which project, and the path is what distinguishes
      // two worktrees of it.
      subtitle={multiple ? names.join(", ") : targets[0].cwd}
      // Typing a project's name keeps this row rather than filtering it out
      // from under the user.
      keywords={[...names, ...targets.map((t) => t.cwd)]}
      accessories={multiple ? [{ text: `${targets.length} folders` }] : []}
      actions={
        <ActionPanel>
          <Action title={title} icon={Icon.Play} onAction={start} />
        </ActionPanel>
      }
    />
  );
}

// Picker view shown when there's no Finder selection. Lists recent
// projects (excluding currently-running ones, which live in the
// dashboard) and an always-present "Choose Folder…" entry for one-off
// picks.
function PickerView({
  autoOpen,
  finderTargets,
  terminalApp,
  editorApp,
}: PickerProps) {
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
      .filter((r) => !runningByCwd.has(r.cwd) && directoryExists(r.cwd))
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
      // The Finder section's position is the whole point of it: it is what
      // the user was just looking at, so a search query must not demote it
      // below the recents.
      filtering={{ keepSectionOrder: true }}
    >
      {finderTargets.length > 0 && (
        <List.Section title="Selected in Finder">
          <FinderSelectionRow targets={finderTargets} autoOpen={autoOpen} />
        </List.Section>
      )}
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
              editorApp={editorApp}
              autoOpen={autoOpen}
              onRemove={handleRemove}
            />
          ))}
        </List.Section>
      )}
    </List>
  );
}

// Unified command entry point. This command is a pure launcher: it resolves
// the Finder selection (if any) into a target list and hands off to the
// dashboard, which owns the confirms, kill+spawn, and toast lifecycle. The
// user lands on the dashboard immediately rather than waiting on a blank
// Start view for slow pre-spawn work.
//
// Both entry points probe Finder (see probeFinderSelection for the gate).
// What differs is what a resolved selection earns:
//
//   ┌─ forcePicker (launched from the dashboard's ⌘N / empty state)?
//   │      ├─ Yes → render the picker, and offer the selection in it as the
//   │      │        "Selected in Finder" row. Never spawns on its own.
//   │      └─ No  → ┌─ Selection resolves to project roots?
//   │              │      ├─ Yes → launchCommand to dashboard with spawn
//   │              │      │        details in launchContext.
//   │              │      └─ No  → render the picker (recents + "Choose Folder…").
//
// The split is about who proposed the start. From root search, acting on the
// selection *is* the request: the user picked folders in Finder and reached
// for the command. From the dashboard they asked to choose, so the selection
// is a suggestion, named on a row and started only on ↵. That is also why
// forcePicker survives now that the frontmost gate handles staleness: the
// flag no longer decides whether we look at Finder, only whether looking is
// permission to act.
export default function Command(
  props: LaunchProps<{ launchContext?: { forcePicker?: boolean } }>,
) {
  const prefs = getPreferenceValues<Preferences.Start>();
  const autoOpen = prefs.autoOpenInBrowser ?? false;
  const confirmMulti = prefs.confirmMultiStart ?? true;
  const terminalApp = prefs.terminalApp ?? DEFAULT_TERMINAL;
  const editorApp = prefs.editorApp;
  const forcePicker = props.launchContext?.forcePicker ?? false;

  const [phase, setPhase] = useState<"checking" | "picker">(
    forcePicker ? "picker" : "checking",
  );
  // Finder's selection, resolved to project roots, for the picker to offer as
  // a row. Only ever populated on the forcePicker path: everywhere else a
  // resolved selection is spawned instead of shown.
  const [finderTargets, setFinderTargets] = useState<Target[]>([]);
  // Guard against React's StrictMode double-invocation of effects in
  // development, which would otherwise probe Finder twice.
  const probedRef = useRef(false);

  useEffect(() => {
    if (probedRef.current) return;
    probedRef.current = true;
    void (async () => {
      const probe = await probeFinderSelection();

      // Dashboard-initiated launch. The user came here to choose, so the
      // selection is offered as a row rather than acted on: the picker is
      // already rendering, and the section appears in it a moment later.
      if (forcePicker) {
        setFinderTargets(probe.targets);
        return;
      }

      // Hand off to the dashboard. No fetchServers, no confirms, no
      // spawn here; the dashboard handles all of it from its own
      // lifecycle, so the user sees the dashboard within a few hundred
      // ms instead of waiting on this view.
      if (probe.targets.length > 0) {
        await launchSpawn(
          probe.targets.map((t) => ({ cwd: t.cwd, name: t.projectName })),
          { autoOpen, confirmMulti },
        );
        return;
      }

      // Only worth saying when the user actually proposed something.
      if (probe.sawSelection) {
        await showFailureToast(undefined, {
          title: "No project in selection",
          message: "Pick a project from your recents instead.",
        });
      }
      setPhase("picker");
    })();
  }, [autoOpen, confirmMulti, forcePicker]);

  if (phase === "picker") {
    return (
      <PickerView
        autoOpen={autoOpen}
        finderTargets={finderTargets}
        terminalApp={terminalApp}
        editorApp={editorApp}
      />
    );
  }

  // Minimal placeholder while we resolve the Finder selection. Just the
  // loading bar; the dashboard is right behind it.
  return <List isLoading={true} searchBarPlaceholder="Starting dev server…" />;
}
