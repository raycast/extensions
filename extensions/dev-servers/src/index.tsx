import {
  Action,
  ActionPanel,
  Alert,
  Application,
  Color,
  Detail,
  Icon,
  Image,
  LaunchProps,
  LaunchType,
  List,
  Toast,
  confirmAlert,
  getPreferenceValues,
  launchCommand,
  open,
  openExtensionPreferences,
  showToast,
  useNavigation,
} from "@raycast/api";
import { showFailureToast, useCachedPromise } from "@raycast/utils";
import * as fs from "node:fs";
import * as os from "node:os";
import { useEffect, useMemo, useRef, useState } from "react";
import { DEFAULT_TERMINAL } from "./constants";
import { detectFavicons } from "./favicons";
import {
  PendingStart,
  SpawnFailure,
  readPendingStarts,
  writePendingStarts,
} from "./pendingStore";
import {
  recordSeen,
  recordSeenBatch,
  toRecent,
  updateRecentFavicon,
} from "./recents";
import {
  EPHEMERAL_PORT_MIN,
  byRecency,
  fetchServers,
  killProcess,
  killServer,
  openInBackground,
  reapProjectHelpersWhenDown,
  restartServer,
  spawnLogPath,
  startDevServer,
} from "./servers";
import { pokeMenuBar, writeSnapshot } from "./snapshot";
import { toolColor, toolLabel } from "./tool-display";
import { DevServer } from "./types";

// Hand off to the Start Dev Server command. Used by the empty-state
// primary action and by the per-row "Start Dev Server" action, so both
// surfaces lead to the same picker (recents + Choose Folder) without
// the user having to bounce back to root search.
async function openStartCommand(): Promise<void> {
  try {
    // forcePicker tells the Start command to skip its Finder-selection
    // probe and go straight to the recents/Choose-Folder picker. From the
    // dashboard the user is in "manage running servers" mode and wants to
    // choose what to start, not have a stale Finder selection hijacked into
    // a spawn/restart of whatever happens to be selected.
    await launchCommand({
      name: "start",
      type: LaunchType.UserInitiated,
      context: { forcePicker: true },
    });
  } catch (err) {
    await showFailureToast(err, { title: "Couldn't open Start Dev Server" });
  }
}

// Shallow equality on the dashboard's view of the server list: same length,
// and same pid+port+branch in the same positions. ps returns processes in PID
// order which is stable for the same processes between polls, so position-wise
// comparison is enough to catch what we care about (a server starting or
// dying, or a branch switch), and `fetchStableServers` can hand back the
// previous array reference when nothing changed so React bails out of the
// re-render.
//
// Branch is included because it comes from a local git/HEAD read that's
// reliable poll-to-poll, and users do switch branches under a running server;
// without it the row would keep showing the old branch until the PID changed.
//
// Deliberately does NOT compare derived fields like the portless
// `url`/`customUrls`. Those come from a `portless list` shell-out with a 3s
// timeout that can intermittently miss, so including them made the comparison
// flap (alias present one poll, absent the next), defeating the dedupe and
// churning re-renders. The tradeoff is that a portless alias attached to an
// already-running server isn't reflected until its PID changes, which is fine:
// aliases are set up at server start in practice, and this matches the
// long-shipped behavior.
function sameServers(a: DevServer[], b: DevServer[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (
      a[i].pid !== b[i].pid ||
      a[i].port !== b[i].port ||
      a[i].branch !== b[i].branch
    )
      return false;
  }
  return true;
}

// First non-internal IPv4 address, for "open this on your phone" URLs.
// Prefer en0/en1 (built-in Wi-Fi / Ethernet on Macs) so a VPN utun or
// container bridge doesn't win just by sorting first.
function lanIPv4(): string | undefined {
  const ifaces = os.networkInterfaces();
  const pick = (name: string) =>
    ifaces[name]?.find((a) => a.family === "IPv4" && !a.internal)?.address;
  const preferred = pick("en0") ?? pick("en1");
  if (preferred) return preferred;
  for (const addrs of Object.values(ifaces)) {
    const hit = addrs?.find((a) => a.family === "IPv4" && !a.internal);
    if (hit) return hit.address;
  }
  return undefined;
}

// Strip scheme and trailing slash so a primary URL renders cleanly as the row
// title: "https://myapp.localhost/" → "myapp.localhost",
// "http://localhost:4321" → "localhost:4321".
function displayHost(url: string): string {
  return url.replace(/^https?:\/\//, "").replace(/\/+$/, "");
}

function formatUptime(startedAt: Date): string {
  const seconds = Math.floor((Date.now() - startedAt.getTime()) / 1000);
  if (isNaN(seconds) || seconds < 0) return "?";
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
}

// On-demand view of a project's startup log. When a dev server fails to
// bind a port, the failure detail is in the spawn log (stdout+stderr) that
// `startDevServer` redirects to `spawnLogPath(cwd)`, not in any terminal
// the user can see. This surfaces that file so a misconfigured or custom
// setup (portless needing sudo, a missing binary, a crashing build) is
// diagnosable from inside Raycast instead of failing opaquely.
//
// Reached on demand only: from a per-row action, and from a failed start row.
//
// `logStart` is the byte offset that attempt began writing at. The log is
// opened append-only and never rotated, so it holds every run for that cwd
// until the OS clears tmpdir: by the fourth restart of a crashing project the
// file is four near-identical failures deep, oldest first, and the run you
// opened the view to read is the one scrolled off the bottom. Given the offset
// we show that run alone, which is the same slice diagnoseSpawnFailure reads.
// Without one (a server row, where no single attempt is in question) we show
// the file. Either way the whole file stays one action away.
function SpawnLogView({
  cwd,
  name,
  logStart,
}: {
  cwd: string;
  name: string;
  logStart?: number;
}) {
  const logPath = spawnLogPath(cwd);
  const [showAll, setShowAll] = useState(logStart === undefined);
  const { data, isLoading, revalidate } = useCachedPromise(
    async (p: string, from: number): Promise<string> => {
      try {
        const buf = await fs.promises.readFile(p);
        // Only a file shorter than the offset falls back to the whole log:
        // it means the log was cleared out from under us, and showing
        // everything beats showing nothing. A file exactly as long as the
        // offset is the attempt that wrote nothing at all, so the empty
        // slice is the honest answer and the view says so.
        return from > 0 && from <= buf.length
          ? buf.subarray(from).toString("utf8")
          : buf.toString("utf8");
      } catch {
        return "";
      }
    },
    [logPath, showAll ? 0 : (logStart ?? 0)],
  );

  // Follow the file while the view is open so a server that's still booting
  // (or crashing) streams its output in like a live tail, instead of asking
  // the user to mash ⌘R while diagnosing.
  useEffect(() => {
    const id = setInterval(revalidate, 2000);
    return () => clearInterval(id);
  }, [revalidate]);

  const log = (data ?? "").trim();
  const exists = fs.existsSync(logPath);
  const scopable = logStart !== undefined && logStart > 0;
  // The body is the log and nothing else. The heading used to repeat the
  // navigation title word for word, and the footer spelled out a tmpdir path
  // long enough to wrap mid-token; between them they took the top and bottom
  // of a view whose whole job is to show as many lines of output as possible.
  // The path is still one keystroke away as Copy Log Path.
  const markdown = log
    ? "```\n" + log + "\n```"
    : exists
      ? scopable && !showAll
        ? "_This attempt wrote nothing before exiting. Earlier runs are in the full log._"
        : "_The log file exists but is empty. The process wrote no output before exiting._"
      : "_No startup log found. This server may have been started outside Dev Servers, so we never captured its output._";

  return (
    <Detail
      isLoading={isLoading}
      markdown={markdown}
      navigationTitle={
        scopable && !showAll
          ? `Startup log: ${name} (this attempt)`
          : `Startup log: ${name}`
      }
      actions={
        <ActionPanel>
          {/* Refresh was the ↵ action, which this view had already made
              pointless by tailing the file every 2s. Copying the log is what
              you actually want next: into a search, an issue, or a chat. */}
          {log && <Action.CopyToClipboard title="Copy Log" content={log} />}
          {scopable && (
            <Action
              title={showAll ? "Show This Attempt Only" : "Show Full Log"}
              icon={showAll ? Icon.Filter : Icon.List}
              shortcut={{ modifiers: ["cmd", "shift"], key: "l" }}
              onAction={() => setShowAll((v) => !v)}
            />
          )}
          {exists && (
            <Action.Open
              title="Open Log File"
              target={logPath}
              icon={Icon.BlankDocument}
            />
          )}
          <Action.CopyToClipboard
            title="Copy Log Path"
            icon={Icon.Clipboard}
            content={logPath}
            shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
          />
          {exists && <Action.ShowInFinder path={logPath} />}
          <Action
            title="Refresh"
            icon={Icon.ArrowClockwise}
            onAction={revalidate}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
          />
        </ActionPanel>
      }
    />
  );
}

interface RowVisibility {
  branch: boolean;
  uptime: boolean;
  tool: boolean;
  localUrl: boolean;
}

interface ServerItemProps {
  // Stable List.Item id (the server pid as a string). Drives controlled
  // selection from the parent so we can focus a just-spawned server.
  id: string;
  server: DevServer;
  terminalApp: Application;
  // Unset when the user hasn't picked an editor; the action is hidden then.
  editorApp?: Application;
  // This Mac's LAN IPv4, when one exists. Combined with `server.lanExposed`
  // to offer a network URL other devices on the network can reach.
  lanIp?: string;
  show: RowVisibility;
  onKill: () => void;
  onKillProject: () => void;
  onKillAll: () => void;
  onRestart: () => void;
  onRefresh: () => void;
}

function ServerItem({
  id,
  server,
  terminalApp,
  editorApp,
  lanIp,
  show,
  onKill,
  onKillProject,
  onKillAll,
  onRestart,
  onRefresh,
}: ServerItemProps) {
  const { push } = useNavigation();
  // Cache the favicon URL by port AND project. Survives revalidations and
  // command relaunches, so the icon doesn't flash back to a placeholder
  // every refresh interval. keepPreviousData keeps the prior URL visible
  // while a fresh fetch is in flight.
  //
  // The cwd is not fetched from — it exists to key the cache. Keyed by port
  // alone, a project starting on a port another project used last week was
  // handed the old project's cached icon on first render, and the persist
  // effect below wrote that wrong icon onto the new project's recents entry
  // before the real fetch could correct it.
  const { data: favicons } = useCachedPromise(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    (port: string, _cwd: string) => detectFavicons(port),
    [server.port, server.cwd],
    { keepPreviousData: true },
  );
  const faviconUrl = favicons?.best;
  const faviconRaster = favicons?.raster;
  // Persist resolved favicons onto the project's recents entry so the picker
  // (Start command) and the menu bar can render the real icon even when the
  // server is stopped. We cache both the best icon (SVG allowed, for the List)
  // and the raster variant (for the menu bar, which can't render SVGs).
  // updateRecentFavicon is a no-op when nothing changed, so this is cheap.
  useEffect(() => {
    if (!faviconUrl && !faviconRaster) return;
    updateRecentFavicon(server.cwd, {
      favicon: faviconUrl,
      faviconRaster,
    }).catch(() => {
      // Picker iconography is best-effort; failing to persist must not
      // disrupt the dashboard.
    });
  }, [server.cwd, faviconUrl, faviconRaster]);
  const icon: Image.ImageLike = faviconUrl
    ? { source: faviconUrl, fallback: Icon.Globe }
    : { source: Icon.Globe, tintColor: toolColor(server.tool) };

  // Branch goes in the left-rail subtitle (right next to the title). Raycast
  // dims subtitles automatically.
  const subtitle =
    show.branch && server.branch
      ? {
          value: server.branch,
          tooltip: `Branch: ${server.branch}\nWorktree: ${server.cwd}`,
        }
      : undefined;

  // When a custom domain (e.g. via portless) points at this port, promote
  // the domain to the title and demote `localhost:PORT` to a pill accessory.
  // The pill lives in accessories (right-aligned) because Raycast subtitles
  // are plain text, with no inline-pill primitive. The port stays
  // visible because it's still useful for env files, OAuth allowlists, CORS
  // rules, and tools that don't trust the local CA.
  const hasAlias = !!server.customUrls?.length;
  const titleHost = displayHost(server.url);
  const localBadgeTag =
    hasAlias && show.localUrl
      ? { tag: { value: `localhost:${server.port}` } }
      : undefined;

  return (
    <List.Item
      id={id}
      icon={icon}
      title={titleHost}
      subtitle={subtitle}
      keywords={[
        server.projectName,
        server.branch,
        ...(server.customUrls ?? []).map(displayHost),
      ].filter((v): v is string => Boolean(v))}
      accessories={[
        ...(show.uptime
          ? [
              {
                text: formatUptime(server.startedAt),
                tooltip: `Started ${server.startedAt.toLocaleString()}`,
              },
            ]
          : []),
        ...(localBadgeTag ? [localBadgeTag] : []),
        // Runtime tag is suppressed when it duplicates the tool tag (e.g.
        // tool is already "bun"), and rendered only when the user has the
        // tool tag visible; otherwise standalone "bun" would look orphaned.
        ...(show.tool && server.runtime === "bun" && server.tool !== "bun"
          ? [
              {
                tag: { value: "Bun", color: Color.Yellow },
                tooltip: "Listening process is running on the Bun runtime",
              },
            ]
          : []),
        ...(show.tool
          ? [
              {
                tag: {
                  value: toolLabel(server.tool),
                  color: toolColor(server.tool),
                },
              },
            ]
          : []),
      ]}
      actions={
        <ActionPanel>
          {/*
           * Action order is deliberate. Raycast auto-binds `↵` and `⌘↵` to
           * positions 1 and 2 (they can't be overridden), so we keep both
           * slots filled with benign "open" actions.
           *
           * Restart sits above Kill: restarting is the common iterate-on-
           * change action, while Kill is mostly end-of-session cleanup.
           * This also keeps `⌘↵` from auto-firing Kill when there's no
           * alias; it falls through to Restart (reversible by design).
           *
           * Kill stays high in the panel rather than at the conventional
           * "destructive at the bottom", because it's frequent and Raycast
           * paints it red as the visual safety signal. The bulk kill
           * actions further down keep convention; they're genuinely
           * high-blast-radius.
           */}
          <Action.OpenInBrowser url={server.url} title="Open in Browser" />
          {hasAlias && (
            <Action.OpenInBrowser
              url={server.localUrl}
              title="Open Localhost URL"
            />
          )}
          <Action
            title="Restart Server"
            icon={Icon.ArrowClockwise}
            shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
            onAction={onRestart}
          />
          <Action
            title="Kill Server"
            icon={Icon.Stop}
            style={Action.Style.Destructive}
            shortcut={{ modifiers: ["ctrl"], key: "x" }}
            onAction={onKill}
          />
          <ActionPanel.Section>
            {/* CopyToClipboard already uses Cmd+C by default */}
            <Action.CopyToClipboard title="Copy URL" content={server.url} />
            {hasAlias && (
              <Action.CopyToClipboard
                title="Copy Localhost URL"
                content={server.localUrl}
                shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
              />
            )}
            {/* Network URL is for testing on a phone or another machine on
             * the same network. Only offered when the server actually binds
             * beyond loopback, so we never hand out a URL that can't connect. */}
            {server.lanExposed && lanIp && (
              <Action.CopyToClipboard
                title="Copy Network URL"
                content={`http://${lanIp}:${server.port}`}
                shortcut={{ modifiers: ["cmd", "opt"], key: "c" }}
              />
            )}
            <Action.CopyToClipboard
              title="Copy Port"
              content={server.port}
              shortcut={{ modifiers: ["cmd", "opt"], key: "p" }}
            />
          </ActionPanel.Section>
          <ActionPanel.Section>
            {editorApp && (
              <Action.Open
                title={`Open in ${editorApp.name}`}
                icon={Icon.Code}
                target={server.cwd}
                application={editorApp}
                shortcut={{ modifiers: ["cmd"], key: "e" }}
              />
            )}
            <Action.Open
              title={`Open in ${terminalApp.name}`}
              icon={Icon.Terminal}
              target={server.cwd}
              application={terminalApp}
              shortcut={{ modifiers: ["cmd"], key: "t" }}
            />
            <Action.ShowInFinder
              path={server.cwd}
              shortcut={{ modifiers: ["cmd", "shift"], key: "f" }}
            />
            <Action
              title="Start Dev Server"
              icon={Icon.Play}
              shortcut={{ modifiers: ["cmd"], key: "n" }}
              onAction={openStartCommand}
            />
            <Action
              title="View Startup Log"
              icon={Icon.Terminal}
              shortcut={{ modifiers: ["cmd"], key: "l" }}
              onAction={() =>
                push(
                  <SpawnLogView cwd={server.cwd} name={server.projectName} />,
                )
              }
            />
            <Action
              title="Refresh"
              icon={Icon.ArrowClockwise}
              shortcut={{ modifiers: ["cmd"], key: "r" }}
              onAction={onRefresh}
            />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action
              title="Kill All for Project"
              icon={Icon.Trash}
              style={Action.Style.Destructive}
              shortcut={{ modifiers: ["ctrl", "shift"], key: "x" }}
              onAction={onKillProject}
            />
            <Action
              title="Kill All Servers"
              icon={Icon.XMarkCircle}
              style={Action.Style.Destructive}
              shortcut={{ modifiers: ["ctrl", "opt"], key: "x" }}
              onAction={onKillAll}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

// Spawn request handed off by the Start Dev Server command. The dashboard
// is the controller for the entire spawn flow (confirms, kill+spawn,
// toast lifecycle, and the eventual transition to a steady-state), so
// the user sees the dashboard immediately rather than waiting on a blank
// Start view for the pre-spawn `fetchServers` call.
interface SpawnRequest {
  // `pid` names the exact server a restart replaces. Without it the flow
  // falls back to "whatever runs from this cwd", which is ambiguous the
  // moment a project runs two servers from one folder: the sender clicked a
  // specific row, and killing the sibling instead is the worst possible
  // reading of that click. A pid that has died by the time the request is
  // handled resolves to nothing, which is a cold start, which is right.
  targets: Array<{ cwd: string; name: string; pid?: number }>;
  // Multi-folder confirm gate, set by the Start command's preference.
  // Always false for single-target spawns (picker rows, folder picker).
  confirmMulti: boolean;
  // Attach a one-time "Auto-open in Browser?" CTA to the Starting toast.
  // The Start command pre-decides this based on a usage counter.
  showAutoOpenHint: boolean;
  // False skips the "already running — Restart?" confirm for targets that
  // are up. Set by the menu bar's per-server Restart item, whose click IS
  // the restart intent: it delegates here because its own process is torn
  // down too fast to respawn anything itself, and re-asking what the user
  // just asked for would turn one click into two. Absent means true, which
  // every start surface wants (a start colliding with a running server is
  // a surprise worth confirming).
  confirmRestarts?: boolean;
  // Fresh per send, and the only thing that tells one request from another.
  // The dashboard's spawn flow is once-only per mount, so a request delivered
  // to a dashboard that is already loaded needs an identity the receiver can
  // compare against the last one it handled (see the re-arm effect). Optional
  // because a sender that omits it still works through the mount path, which
  // is the only path Raycast is known to take.
  requestId?: string;
  //
  // Deliberately NOT carrying autoOpen. It is an extension-level preference,
  // so every command already reads the same value, and the dashboard is where
  // the opening happens. Passing it through here made a second source of
  // truth for one setting, and the two disagreed: starting from the menu bar
  // opened no tab while the identical start from the dashboard did. Whichever
  // copy was wrong, a caller cannot get this wrong if it never supplies it.
}

interface DashboardLaunchContext {
  spawn?: SpawnRequest;
}

// Format a list of names with English-style commas and "and":
//   ["A"]           -> "A"
//   ["A", "B"]      -> "A and B"
//   ["A", "B", "C"] -> "A, B, and C"
function joinNames(names: string[]): string {
  if (names.length === 0) return "";
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names.slice(0, -1).join(", ")}, and ${names[names.length - 1]}`;
}

// Single batch confirmation that covers any number of already-running
// targets in one prompt. Returns true to proceed, false to cancel.
async function confirmRestartBatch(
  runningTargets: Array<{
    target: { name: string };
    existing: DevServer;
  }>,
  total: number,
): Promise<boolean> {
  if (runningTargets.length === 0) return true;
  const names = runningTargets.map((r) => r.target.name);
  const running = runningTargets.length;
  const remainingCount = total - running;

  if (total === 1) {
    return await confirmAlert({
      title: `${names[0]} is already running`,
      message: `A dev server is listening on ${runningTargets[0].existing.url}. Restart it?`,
      primaryAction: { title: "Restart" },
    });
  }
  if (running === total) {
    return await confirmAlert({
      title: `All ${total} already running`,
      message: `Restart ${joinNames(names)}?`,
      primaryAction: { title: "Restart All" },
    });
  }
  const remainingPhrase =
    remainingCount === 1 ? "the other one" : `the other ${remainingCount}`;
  return await confirmAlert({
    title: `${running} of ${total} already running`,
    message: `Restart ${joinNames(names)}, then start ${remainingPhrase}?`,
    primaryAction: { title: "Restart & Start All" },
  });
}

// Spawn phase state machine. The dashboard transitions:
//   idle      → no launchContext.spawn, normal dashboard
//   pending   → spawn request received, waiting for first fetchServers
//   confirming→ showing confirms (multi-folder and/or batch restart)
//   spawning  → toast visible, kill+spawn done, watching for servers
//   done      → terminal state (either success-hidden, timeout-hidden,
//               or user-cancelled)
type SpawnPhase =
  | { phase: "idle" }
  | { phase: "pending" }
  | { phase: "confirming" }
  | {
      phase: "spawning";
      // Keyed by cwd. `logStart` is the spawn log's byte size at spawn time:
      // the log is append-mode, so only bytes past this offset belong to the
      // current attempt (see diagnoseSpawnFailure). `ignorePids` is the very
      // array the cwd's pending row carries, so the watcher and the watchdog
      // put the same question to resolvingServer that the row does, and go on
      // being able to ask it after the cleanup effect has dropped the row.
      expecting: Map<
        string,
        { name: string; logStart: number; ignorePids: readonly number[] }
      >;
    }
  | { phase: "done" };

// How long a spawned server gets to bind a port before the watchdog calls it
// failed. Also spelled into the undiagnosed failed-row title, so the number
// the user reads always matches the wait they actually got.
const SPAWN_TIMEOUT_MS = 15000;

// How long past its deadline a persisted pending row is still worth
// rehydrating. Everything a failed row has to offer comes out of the spawn
// log, which lives in tmpdir and is cleared on the OS's own schedule, so an
// older row would put up remedies pointing at a file that is no longer there.
// A day also matches what the row is for: a start that failed while the window
// was closed is news the next time you look, not a week later.
const PENDING_MAX_AGE_MS = 24 * 60 * 60 * 1000;

// A restart polls on this staggered backoff instead of the watchdog; the sum
// is the window its failed-row title quotes.
const RESTART_POLL_DELAYS = [1000, 2000, 3000, 4000];
const RESTART_WINDOW_S =
  RESTART_POLL_DELAYS.reduce((total, ms) => total + ms, 0) / 1000;

// The failure's title becomes the failed row's title, and a nameable fix
// becomes its Copy Fix Command action.
const SPAWN_FAILURE: Record<SpawnFailure, { title: string; fix?: string }> = {
  "port-conflict": { title: "Port already in use" },
  "portless-proxy-down": {
    title: "Portless proxy isn't running",
    fix: "portless service install",
  },
};

// Size of the (append-mode) spawn log before an attempt writes to it. Taken
// right before every spawn so the watchdog and the log view can scope
// themselves to that attempt's bytes alone.
function spawnLogOffset(cwd: string): number {
  try {
    return fs.statSync(spawnLogPath(cwd)).size;
  } catch {
    // No log yet; the spawn writes from byte 0.
    return 0;
  }
}

// Whether the chunk of the startup log written by this spawn (from byte
// `logStart`) shows the server dying for one of those reasons. Scoped to the
// new bytes because earlier runs in the same log may have hit the same error
// and since resolved it.
//
// Reads only this attempt's bytes rather than slurping the file: the log is
// opened append-only and never rotated, so it holds every run for this cwd
// until the OS clears tmpdir. Seeking past `logStart` also bounds the read to
// what one 15-second attempt managed to write.
function diagnoseSpawnFailure(
  cwd: string,
  logStart: number,
): SpawnFailure | null {
  let fd: number | undefined;
  try {
    fd = fs.openSync(spawnLogPath(cwd), "r");
    const length = fs.fstatSync(fd).size - logStart;
    if (length <= 0) return null;
    const buf = Buffer.alloc(length);
    fs.readSync(fd, buf, 0, length, logStart);
    const tail = buf.toString("utf8");
    // Another process owns the port. The fix (kill the other server, or for
    // Shopify themes let the auto-port pick a free one) is nothing like
    // debugging a crashed build.
    if (/EADDRINUSE|address already in use/i.test(tail)) return "port-conflict";
    // A dev script wrapped in `portless run` needs the portless proxy up.
    // When it isn't, portless tries to auto-start it, finds no TTY to run
    // sudo on (always the case for our detached spawn) and exits before the
    // framework ever boots. Starting the proxy by hand once per reboot works
    // but is exactly the manual step the extension exists to remove; the
    // startup service makes it permanent.
    //
    // Matched on portless's full sentence, "Proxy is not running and no TTY
    // is available for sudo." Its shorter "Proxy is not running" lines come
    // from `portless proxy stop` and `portless doctor`, which say nothing
    // about a failed start, so the prefix alone would name this cause for a
    // server that is merely slow to boot.
    if (/proxy is not running and no tty/i.test(tail))
      return "portless-proxy-down";
    return null;
  } catch {
    return null;
  } finally {
    if (fd !== undefined) {
      try {
        fs.closeSync(fd);
      } catch {
        // Already closed / invalid fd; nothing to do.
      }
    }
  }
}

// Open a URL the user did not press a key for. Background is what we want, so
// the dashboard is not torn away mid-glance, but never at the cost of the tab
// itself: `openInBackground` shells out to `/usr/bin/open -g`, and a
// subprocess has more ways to fail than an API call does. Swallowing that
// failure turned "opened behind your window" into "nothing happened at all",
// which is indistinguishable from the preference being off.
//
// So: try background, and if it will not go, fall back to Raycast's `open`.
// Foreground is a worse outcome than background and a far better one than
// silence. Which one you get is also the diagnosis, since a tab that steals
// focus means the subprocess is being refused.
function openAutomatically(url: string): void {
  openInBackground(url).catch(() => {
    open(url).catch(() => {});
  });
}

// The one question every part of the pending-row machinery asks: has the
// server this row was waiting for arrived? Visibility, state cleanup, the
// selection handoff, the success watcher, the watchdog and the restart poll
// all route through here, so they can never disagree about whether a row has
// resolved.
//
// Two conditions, and both are about not mistaking something else for the
// arrival:
//
//   1. A deliberate port. An OS-assigned one is plumbing, the same call
//      suppressHelperRows makes, and while a start is in flight its mid-start
//      rule keeps those rows out of the fetch entirely. A workerd helper
//      resolving the row would therefore retire the spinner in favour of a row
//      the list is not even drawing, and the failure would never be diagnosed.
//   2. A pid the row was not already looking at, per `ignorePids`.
function resolvingServer(
  cwd: string,
  entry: Pick<PendingStart, "ignorePids">,
  servers: DevServer[],
): DevServer | undefined {
  return servers.find(
    (s) =>
      s.cwd === cwd &&
      parseInt(s.port, 10) < EPHEMERAL_PORT_MIN &&
      !entry.ignorePids.includes(s.pid),
  );
}

// Row ids for pending starts are namespaced so they can never collide with a
// server row's, which is a bare pid. The prefix is also how the render-time
// selection handoff recognizes a cursor parked on a pending row.
const PENDING_ID_PREFIX = "starting:";

function pendingRowId(cwd: string): string {
  return `${PENDING_ID_PREFIX}${cwd}`;
}

// Spinner timing. Smoothness is the size of each step, not the frame rate, so
// the two knobs pull apart: 18 frames over a revolution is a 20 degree step
// against the 30 degrees a 12-frame turn moved, and holding the frame rate
// steady spends that on a slower turn (810ms) rather than a choppier one.
// Slower also lands nearer the animated toast's spinner, which the 600ms
// version overshot.
//
// The frame rate itself is near its ceiling. Each frame costs one prop change
// on one row, the frames are precomputed (see SPINNER_ICONS), and the interval
// only runs while something is actually starting, so it is bounded by the 15s
// watchdog. But every frame is still a render round trip to Raycast, and the
// toast's own spinner is native and far smoother than anything reachable from
// here. Buy smoothness with degrees per step first; raise the rate only after
// that runs out.
const SPINNER_FRAMES = 18;
const SPINNER_FRAME_MS = 45;
// Neutral gray, readable on both the light and the dark theme. Hardcoded
// rather than tinted or drawn in currentColor: Raycast gives a data-URI SVG
// no surrounding color context, so a currentColor-only icon renders as a
// black square (the same trap isMonochromeSvg exists to dodge for favicons).
const SPINNER_COLOR = "#8E8E93";
const SPINNER_RADIUS = 5.5;
// Quarter of the circle is the moving head; the rest is the gap that rides
// around behind it.
const SPINNER_ARC = 2 * Math.PI * SPINNER_RADIUS * 0.25;
const SPINNER_GAP = 2 * Math.PI * SPINNER_RADIUS - SPINNER_ARC;

// One frame of a buffering spinner, as an SVG data URI. Raycast has no
// animated icons and no per-row loading state, so the animation is frames we
// swap ourselves: a faint full-circle track with a quarter-circle arc stepped
// around it one frame at a time, which is the same shape a CSS spinner draws
// with stroke-dasharray.
function spinnerFrame(frame: number): string {
  const angle = frame * (360 / SPINNER_FRAMES);
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16">` +
    `<g fill="none" stroke="${SPINNER_COLOR}" stroke-width="1.8" stroke-linecap="round">` +
    `<circle cx="8" cy="8" r="${SPINNER_RADIUS}" opacity="0.22"/>` +
    `<circle cx="8" cy="8" r="${SPINNER_RADIUS}"` +
    ` stroke-dasharray="${SPINNER_ARC.toFixed(2)} ${SPINNER_GAP.toFixed(2)}"` +
    ` transform="rotate(${angle} 8 8)"/>` +
    `</g></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

// The frames are a fixed set, so build them once at module load instead of
// re-encoding an SVG twenty times a second. Leaves the animation as an array
// index, which is what keeps the frame rate cheap enough to raise.
const SPINNER_ICONS: readonly string[] = Array.from(
  { length: SPINNER_FRAMES },
  (_, frame) => spinnerFrame(frame),
);

// The synthetic row for a pending start. While starting it spins; once the
// watchdog gives up it turns red and carries the remedies. A row can do that
// and a toast cannot: a toast's actions die with it, and it degrades to an
// actionless HUD as soon as the Raycast window closes, which is exactly when
// a 15-second failure lands.
//
// The spinner's frame counter lives here rather than in the dashboard so that
// ten re-renders a second stay inside this one row. Hoisting it would re-run
// the whole list, which is the churn sameServers and the polling cadence were
// both written to avoid.
function PendingItem({
  id,
  cwd,
  entry,
  terminalApp,
  editorApp,
  failedCount,
  onDismiss,
  onDismissAll,
  onRefresh,
}: {
  id: string;
  cwd: string;
  entry: PendingStart;
  terminalApp: Application;
  // Unset when the user hasn't picked an editor; the action is hidden then.
  editorApp?: Application;
  // How many pending rows are currently failed, across the whole list. Drives
  // whether Dismiss All is worth offering.
  failedCount: number;
  onDismiss: () => void;
  onDismissAll: () => void;
  onRefresh: () => void;
}) {
  const { push } = useNavigation();
  const [frame, setFrame] = useState(0);
  const spinning = entry.status === "starting";
  useEffect(() => {
    if (!spinning) return;
    const id = setInterval(
      () => setFrame((f) => (f + 1) % SPINNER_FRAMES),
      SPINNER_FRAME_MS,
    );
    return () => clearInterval(id);
  }, [spinning]);

  // The project actions, identical on both states and on the same chords
  // server rows use. A pending row is still a row about a folder: leaving it
  // actionless meant ⌘N, the way you start anything from this dashboard,
  // silently did nothing on the row you were most likely looking at.
  const projectActions = (
    <ActionPanel.Section>
      {/* Editor before terminal, the order server rows use. */}
      {editorApp && (
        <Action.Open
          title={`Open in ${editorApp.name}`}
          icon={Icon.Code}
          target={cwd}
          application={editorApp}
          shortcut={{ modifiers: ["cmd"], key: "e" }}
        />
      )}
      <Action.Open
        title={`Open in ${terminalApp.name}`}
        icon={Icon.Terminal}
        target={cwd}
        application={terminalApp}
        shortcut={{ modifiers: ["cmd"], key: "t" }}
      />
      <Action.ShowInFinder
        path={cwd}
        shortcut={{ modifiers: ["cmd", "shift"], key: "f" }}
      />
      <Action
        title="Start Dev Server"
        icon={Icon.Play}
        shortcut={{ modifiers: ["cmd"], key: "n" }}
        onAction={openStartCommand}
      />
      <Action
        title="Refresh"
        icon={Icon.ArrowClockwise}
        shortcut={{ modifiers: ["cmd"], key: "r" }}
        onAction={onRefresh}
      />
    </ActionPanel.Section>
  );

  if (spinning) {
    return (
      <List.Item
        id={id}
        icon={SPINNER_ICONS[frame]}
        // The section header is already the project name, so the row says
        // what is happening instead of repeating it. Server rows title on
        // their host and port; a row with no port yet has its state to give.
        title={entry.kind === "restart" ? "Restarting…" : "Starting…"}
        // The project name lives in the section header, which Raycast's search
        // doesn't index, so without this typing a project's name filters its
        // own pending row out from under the user.
        keywords={[entry.name, cwd]}
        actions={
          <ActionPanel>
            {/* Tailing the log of a server that is still booting is the one
                thing you can usefully do while waiting on it. */}
            <Action
              title="View Startup Log"
              icon={Icon.Terminal}
              shortcut={{ modifiers: ["cmd"], key: "l" }}
              onAction={() =>
                push(
                  <SpawnLogView
                    cwd={cwd}
                    name={entry.name}
                    logStart={entry.logStart}
                  />,
                )
              }
            />
            {projectActions}
          </ActionPanel>
        }
      />
    );
  }

  const failure = entry.reason ? SPAWN_FAILURE[entry.reason] : undefined;
  return (
    <List.Item
      id={id}
      icon={{ source: Icon.XMarkCircle, tintColor: Color.Red }}
      // The cause is the title, for the same reason it is the title on a
      // toast: it is the one part that always survives. The section above
      // already says which project this is.
      title={
        failure?.title ??
        (entry.kind === "restart"
          ? `Didn't come back after ${RESTART_WINDOW_S}s`
          : `Didn't start after ${SPAWN_TIMEOUT_MS / 1000}s`)
      }
      // As above: the name is only in the section header, and a filtered-out
      // failed row takes its remedies with it.
      keywords={[entry.name, cwd]}
      accessories={[{ tag: { value: "Failed", color: Color.Red } }]}
      actions={
        <ActionPanel>
          {/* What went wrong. */}
          <ActionPanel.Section>
            <Action
              title="View Startup Log"
              icon={Icon.Terminal}
              shortcut={{ modifiers: ["cmd"], key: "l" }}
              onAction={() =>
                push(
                  <SpawnLogView
                    cwd={cwd}
                    name={entry.name}
                    logStart={entry.logStart}
                  />,
                )
              }
            />
            {failure?.fix && (
              <Action.CopyToClipboard
                title="Copy Fix Command"
                icon={Icon.Clipboard}
                content={failure.fix}
              />
            )}
          </ActionPanel.Section>
          {projectActions}
          <ActionPanel.Section>
            <Action
              title="Dismiss"
              icon={Icon.XMarkCircle}
              shortcut={{ modifiers: ["cmd", "shift"], key: "d" }}
              onAction={onDismiss}
            />
            {/* Only worth offering once there is more than one to clear;
                below that it is Dismiss under a longer name. */}
            {failedCount > 1 && (
              <Action
                title={`Dismiss All ${failedCount} Failed`}
                icon={Icon.XMarkCircleFilled}
                shortcut={{ modifiers: ["cmd", "opt"], key: "d" }}
                onAction={onDismissAll}
              />
            )}
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

export default function Command(
  props: LaunchProps<{ launchContext?: DashboardLaunchContext }>,
) {
  const prefs = getPreferenceValues<Preferences.Index>();
  // Read straight from the preference rather than from the launch context.
  // It is extension-level, so this is the same value every caller would have
  // sent, minus the chance of a caller sending a different one.
  const autoOpen = prefs.autoOpenInBrowser ?? false;
  // Capture launchContext once at mount. The destructured props are new
  // identities every render, so reading via a ref keeps every effect's
  // closure stable.
  const launchContextRef = useRef(props.launchContext);
  const spawnRequest = launchContextRef.current?.spawn;

  // Starts in flight, keyed by cwd. Deliberately its own state slice rather
  // than synthetic entries in the useCachedPromise data: every kill and
  // restart handler runs an optimisticUpdate filter over that array typed as
  // DevServer[], and a fake entry would flow through all of them.
  //
  // Declared ahead of the fetch below because the fetch reads it: which
  // projects are mid-start is exactly what lets fetchServers drop their helper
  // rows.
  const [pendingStarts, setPendingStarts] = useState<Map<string, PendingStart>>(
    new Map(),
  );
  // Mirrored so async readers get the current map without taking it as a
  // dependency: the watchdog has to know which rows are still standing when it
  // fires, and it cannot take `pendingStarts` as a dependency without
  // restarting its 15s timer every time a row changes. The fetch reads it for
  // the same reason, which is what lets its identity stay stable across polls.
  const pendingStartsRef = useRef(pendingStarts);
  useEffect(() => {
    pendingStartsRef.current = pendingStarts;
  }, [pendingStarts]);

  // Dedupe `servers` references when content is unchanged. Without this,
  // every poll (every 1s while expecting servers) hands React a new array
  // identity, triggering downstream effects/memos to re-evaluate even
  // when nothing actually changed. Raycast's dev runtime detects this as
  // "rendering a lot without any changes" and warns, and it's wasted
  // work regardless of the warning. Returning the previous reference
  // when pid+port content matches lets React's Object.is bail out of
  // the re-render entirely.
  const fetchStableServers = useMemo(() => {
    // null until the first poll, so that poll always writes the snapshot:
    // the cache may hold a stale one from a previous session, and an empty
    // first result must replace it just as surely as a full one.
    let last: DevServer[] | null = null;
    return async (): Promise<DevServer[]> => {
      // Which projects are mid-start, as of this poll. fetchServers wants it
      // because a starting project's helpers are the one kind of plumbing it
      // cannot recognise on its own (see suppressHelperRows, rule 4). Handing
      // it to the fetch rather than filtering the result afterwards is what
      // puts the same judgment in the snapshot the menu bar reads.
      const settling = new Set(
        [...pendingStartsRef.current]
          .filter(([, entry]) => entry.status === "starting")
          .map(([cwd]) => cwd),
      );
      const next = await fetchServers(settling);
      if (last && sameServers(next, last)) return last;
      // Written only on change, and "change" is sameServers' definition:
      // pid, port, branch. A field it ignores (a portless alias attaching to
      // a running server) also skips the write, so the menu bar's first paint
      // can be that little bit staler; its own fetch corrects it in the same
      // open, which is the eventual consistency those fields already accept.
      writeSnapshot(next);
      last = next;
      return next;
    };
  }, []);

  const {
    isLoading,
    data: servers = [],
    mutate,
    revalidate,
  } = useCachedPromise(fetchStableServers, [], {
    keepPreviousData: true,
  });

  // Mirror `servers` into a ref so async handlers can read the latest
  // value without going stale on closure capture.
  const serversRef = useRef(servers);
  useEffect(() => {
    serversRef.current = servers;
  }, [servers]);

  // `hasLoaded` flips true after the very first fetch completes and
  // never resets. We gate the List's `isLoading` on this so subsequent
  // background revalidations don't flicker the EmptyView into Raycast's
  // default "no results" placeholder (the docs explicitly say EmptyView
  // is hidden whenever isLoading is true with an empty search bar).
  const [hasLoaded, setHasLoaded] = useState(false);
  useEffect(() => {
    if (!isLoading) setHasLoaded(true);
  }, [isLoading]);
  const effectiveLoading = !hasLoaded && isLoading;

  // Spawn phase state machine; see SpawnPhase type for the transitions.
  const [spawnState, setSpawnState] = useState<SpawnPhase>(() =>
    spawnRequest ? { phase: "pending" } : { phase: "idle" },
  );
  const toastRef = useRef<Toast | null>(null);

  // Controlled list selection. We keep selection in state so we can jump the
  // cursor to a just-spawned (or just-restarted) server, while onSelectionChange
  // feeds the user's own navigation back in. This two-way wiring is what keeps
  // a pinned selectedItemId from yanking the cursor back to the new row on every
  // background poll — once the user moves, state follows them. The id is the
  // server pid as a string (see List.Item `id` below); undefined lets Raycast
  // manage selection itself (initial mount, or when a filter clears the list).
  const [selectedItemId, setSelectedItemId] = useState<string | undefined>(
    undefined,
  );
  // Mirrored for the watch effect, which must not take `selectedItemId` as a
  // dependency: that effect keys on `servers` and `spawnState`, and adding
  // selection to it would re-run the whole detection body every time the user
  // moved the cursor.
  const selectedIdRef = useRef(selectedItemId);
  useEffect(() => {
    selectedIdRef.current = selectedItemId;
  }, [selectedItemId]);

  // Flipped once the persisted rows have been merged in. Until then the
  // write-through below holds its fire: the initial state is an empty map, and
  // writing it would erase the very rows the rehydrate is on its way to read.
  // State rather than a ref so the write-through runs the moment it flips,
  // even when the merge added nothing: a mount that starts a server against
  // empty storage must still persist that row without waiting for it to change
  // again.
  const [rehydrated, setRehydrated] = useState(false);

  // Write-through, so what the dashboard knows survives the command being
  // unloaded. Best-effort: a storage failure costs the next mount its rows and
  // must never break the one that is running.
  useEffect(() => {
    if (!rehydrated) return;
    writePendingStarts(pendingStarts).catch(() => {});
  }, [pendingStarts, rehydrated]);

  // Pick up starts fired by an earlier mount. Raycast unloads the command the
  // moment the user pops back to root, which is usually well inside a start's
  // window, so this mount routinely inherits rows nobody was left watching.
  //
  // Live entries win on a cwd collision: this mount fired them just now, and
  // the persisted copy is at best the same row a write behind.
  useEffect(() => {
    void (async () => {
      const persisted = await readPendingStarts();
      const now = Date.now();
      // Diagnosed up front rather than inside the updater: the read hits the
      // filesystem synchronously, and an updater must stay callable twice.
      const inherited = [...persisted]
        .filter(([, entry]) => now <= entry.deadline + PENDING_MAX_AGE_MS)
        .map(([cwd, entry]): [string, PendingStart] =>
          entry.status === "starting" && now > entry.deadline
            ? [
                cwd,
                {
                  ...entry,
                  status: "failed",
                  reason: diagnoseSpawnFailure(cwd, entry.logStart),
                },
              ]
            : [cwd, entry],
        );
      setRehydrated(true);
      if (inherited.length === 0) return;
      setPendingStarts((prev) => {
        const next = new Map(prev);
        for (const [cwd, entry] of inherited) {
          if (!next.has(cwd)) next.set(cwd, entry);
        }
        // Selection is deliberately left alone. Nothing here happened while
        // the user was looking, so none of it has earned the cursor.
        return next.size === prev.size ? prev : next;
      });
    })();
  }, []);

  // Forget entries whose cwd now has a real server row. This is bookkeeping
  // only: visible rows are derived from the same `servers` array (see
  // visiblePending), so the handoff already happened in the render that first
  // listed the server, and this cleanup can land whenever it likes.
  //
  // Keyed on the entries as well as on `servers` because a rehydrated row
  // arrives without either one moving: `servers` hands back the previous array
  // reference when a poll finds nothing changed, so a row for a server that
  // has been running quietly since before this mount could otherwise sit in
  // the map until something else on the machine moved. Invisible while it sat
  // there, but it would surface the moment the user killed that server, as a
  // failed row for a start that had in fact succeeded. Re-running on deletions
  // is free: the second pass finds nothing and hands `prev` straight back.
  useEffect(() => {
    setPendingStarts((prev) => {
      if (prev.size === 0) return prev;
      const next = new Map(prev);
      for (const [cwd, entry] of prev) {
        if (resolvingServer(cwd, entry, servers)) next.delete(cwd);
      }
      return next.size === prev.size ? prev : next;
    });
  }, [servers, pendingStarts]);

  function dismissPending(cwd: string) {
    setPendingStarts((prev) => {
      if (!prev.has(cwd)) return prev;
      const next = new Map(prev);
      next.delete(cwd);
      return next;
    });
  }

  // Clears failed entries only. A start still in flight is not the user's to
  // dismiss: its row is about to resolve one way or the other by itself.
  function dismissAllFailed() {
    setPendingStarts((prev) => {
      const next = new Map(prev);
      for (const [cwd, entry] of prev) {
        if (entry.status === "failed") next.delete(cwd);
      }
      return next.size === prev.size ? prev : next;
    });
  }

  // Dashboard polling cadence. Faster only while actively watching for a
  // just-spawned server to bind a port, so it appears within ~1s. We do NOT
  // fast-poll during "pending"/"confirming": nothing is spawning yet, and
  // "confirming" can block indefinitely on a confirm dialog — polling at 1s
  // there just toggles isLoading every second, producing a burst of identical
  // re-renders that trips Raycast's "rendering a lot" warning for no benefit.
  useEffect(() => {
    const ms =
      spawnState.phase === "spawning"
        ? 1000
        : parseInt(prefs.refreshInterval) * 1000;
    const id = setInterval(revalidate, ms);
    return () => clearInterval(id);
  }, [spawnState.phase, prefs.refreshInterval, revalidate]);

  // Spawn flow: pending → confirming → spawning (or → done on cancel).
  // Fires once the initial fetch has completed (hasLoaded) so confirms
  // can be based on the actual current set of running servers.
  const spawnFlowFired = useRef(false);
  useEffect(() => {
    if (spawnFlowFired.current) return;
    if (spawnState.phase !== "pending") return;
    if (!hasLoaded) return;
    spawnFlowFired.current = true;

    void (async () => {
      const spawn = launchContextRef.current?.spawn;
      if (!spawn) {
        setSpawnState({ phase: "done" });
        return;
      }

      setSpawnState({ phase: "confirming" });

      // Snapshot current running servers for the confirm logic.
      const running = new Map(serversRef.current.map((s) => [s.cwd, s]));

      // 1. Multi-folder confirmation (only when N>1 and the pref is on).
      if (spawn.targets.length > 1 && spawn.confirmMulti) {
        const ok = await confirmAlert({
          title: `Start ${spawn.targets.length} dev servers?`,
          message: spawn.targets.map((t) => t.name).join(", "),
          primaryAction: { title: "Start All" },
        });
        if (!ok) {
          setSpawnState({ phase: "done" });
          return;
        }
      }

      // 2. Batch restart confirmation: one alert for any number of
      //    already-running targets.
      const runningTargets = spawn.targets
        .map((t) => ({
          target: t,
          // By pid when the sender named one (see SpawnRequest.targets); the
          // cwd map otherwise.
          existing: t.pid
            ? serversRef.current.find((s) => s.pid === t.pid)
            : running.get(t.cwd),
        }))
        .filter(
          (
            x,
          ): x is {
            target: { cwd: string; name: string; pid?: number };
            existing: DevServer;
          } => !!x.existing,
        );
      const proceed =
        spawn.confirmRestarts === false
          ? true
          : await confirmRestartBatch(runningTargets, spawn.targets.length);
      if (!proceed) {
        setSpawnState({ phase: "done" });
        return;
      }

      // Targets being replaced get their "Restarting…" row up before the
      // kill, mirroring the dashboard's own restart(): the row stands in for
      // the old server row, which the optimistic update in step 4 removes in
      // the same breath, so the project never shows a "Starting…" row stacked
      // above the corpse of the server it is replacing. logStart and
      // ignorePids are captured pre-kill for restart()'s reasons: log bytes
      // past the offset belong to the respawn, and the row must wait for a
      // genuinely new server rather than resolve against the one going down.
      const replacing = new Map(
        runningTargets.map((rt) => [
          rt.target.cwd,
          {
            projectKey: rt.existing.projectKey,
            logStart: spawnLogOffset(rt.target.cwd),
            ignorePids: serversRef.current
              .filter((s) => s.cwd === rt.target.cwd)
              .map((s) => s.pid),
          },
        ]),
      );
      if (replacing.size > 0) {
        setPendingStarts((prev) => {
          const next = new Map(prev);
          for (const rt of runningTargets) {
            const pre = replacing.get(rt.target.cwd);
            if (!pre) continue;
            next.set(rt.target.cwd, {
              name: rt.target.name,
              projectKey: pre.projectKey,
              logStart: pre.logStart,
              deadline: Date.now() + SPAWN_TIMEOUT_MS,
              status: "starting",
              reason: null,
              kind: "restart",
              ignorePids: pre.ignorePids,
            });
          }
          return next;
        });
      }

      // 3. Show the toast before doing the kill+spawn work so the user has
      //    feedback the moment they confirm. "Restarting" when every target
      //    is a replacement (the menu bar's Restart, or starting only
      //    already-running projects); mixed batches stay "Starting".
      const label =
        spawn.targets.length === 1
          ? spawn.targets[0].name
          : `${spawn.targets.length} dev servers`;
      const verb =
        runningTargets.length > 0 &&
        runningTargets.length === spawn.targets.length
          ? "Restarting"
          : "Starting";
      const toast = await showToast({
        style: Toast.Style.Animated,
        title: `${verb} ${label}…`,
        primaryAction: spawn.showAutoOpenHint
          ? {
              title: "Auto-open in Browser?",
              onAction: async (t) => {
                await openExtensionPreferences();
                await t.hide();
              },
            }
          : undefined,
      });
      toastRef.current = toast;

      // 4. Kill running PIDs first so they release their ports before
      //    we spawn replacements. Parallelized, since they're independent
      //    processes. The optimistic update drops the doomed rows from the
      //    list immediately, restart()-style, so each "Restarting…" row from
      //    above stands in for its server rather than sitting on top of it.
      const doomedPids = new Set(runningTargets.map((rt) => rt.existing.pid));
      await mutate(
        Promise.all(runningTargets.map((rt) => killServer(rt.existing.pid))),
        {
          optimisticUpdate: (current) =>
            (current ?? []).filter((s) => !doomedPids.has(s.pid)),
          rollbackOnError: false,
        },
      );

      // 5. Spawn every approved target in parallel. The spawn itself
      //    returns immediately (detached process), so this is fast. A target
      //    whose spawn throws (e.g. no recognizable dev script) gets its own
      //    failure toast here and is dropped from the set we go on to watch —
      //    see step 6.
      const spawned = await Promise.all(
        spawn.targets.map(async (t) => {
          // A replaced target's baseline was captured before the kill (the
          // optimistic update above has since dropped its old server from the
          // list, so it cannot be re-derived here). For the rest: whatever
          // holds this cwd right now is a sibling the kill left standing,
          // never the server we are about to wait for. Taken once and handed
          // to both the pending row and the watchers below, so no two of them
          // can disagree about which server counts as the arrival. Empty for
          // a genuinely cold start.
          const pre = replacing.get(t.cwd);
          const logStart = pre?.logStart ?? spawnLogOffset(t.cwd);
          const ignorePids =
            pre?.ignorePids ??
            serversRef.current.filter((s) => s.cwd === t.cwd).map((s) => s.pid);
          try {
            await startDevServer(t.cwd);
            await recordSeen({
              cwd: t.cwd,
              projectName: t.name,
            });
            return { ...t, logStart, ignorePids };
          } catch (err) {
            // A replaced target's "Restarting…" row went up before the kill;
            // the respawn never got off the ground, so there is nothing for
            // it to wait on. Same exit restart() takes: drop the row and let
            // the error speak for itself.
            if (pre) dismissPending(t.cwd);
            await showFailureToast(err, {
              title: `Failed to start ${t.name}`,
            });
            return null;
          }
        }),
      );
      const succeeded = spawned.filter(
        (t): t is NonNullable<(typeof spawned)[number]> => Boolean(t),
      );

      // 6. Transition to spawning, watching ONLY the targets that actually
      //    spawned. Failed ones already showed their own failure toast above;
      //    including them in `expecting` would leave the animated "Starting…"
      //    toast hanging and let the 15s timeout escalate it into a second,
      //    duplicate failure for the same non-event. If nothing spawned, the
      //    per-target toasts have said it all — tear down the "Starting…" toast
      //    and finish without ever entering the watch/timeout cycle.
      if (succeeded.length === 0) {
        await toastRef.current?.hide();
        toastRef.current = null;
        setSpawnState({ phase: "done" });
        return;
      }

      // Give every spawned target a row of its own straight away, so the
      // dashboard shows what is in flight and already has somewhere to put the
      // failure if the watchdog fires. Writing by cwd also means starting a
      // project that currently shows a failed row resets that row instead of
      // stacking a second one. Replaced targets are skipped: their
      // "Restarting…" row went up before the kill with the same baseline, and
      // rewriting it here would only relabel it "Starting…" mid-flight.
      setPendingStarts((prev) => {
        const next = new Map(prev);
        for (const t of succeeded) {
          if (replacing.has(t.cwd)) continue;
          next.set(t.cwd, {
            name: t.name,
            projectKey:
              serversRef.current.find((s) => s.cwd === t.cwd)?.projectKey ??
              t.cwd,
            logStart: t.logStart,
            deadline: Date.now() + SPAWN_TIMEOUT_MS,
            status: "starting",
            reason: null,
            kind: "start",
            ignorePids: t.ignorePids,
          });
        }
        return next;
      });
      // Follow the thing the user just asked for, from the first row it has
      // through to the server row it becomes (the watch effect re-points
      // selection at the real pid on handoff). Without this the cursor sits
      // on whatever was selected before, and the row they are watching is
      // not the row ↵ would act on.
      setSelectedItemId(pendingRowId(succeeded[0].cwd));

      // The watch effect below takes over, flipping the toast to Success once
      // every spawned cwd appears in the servers state (driven by the normal
      // polling, now at 1s).
      setSpawnState({
        phase: "spawning",
        expecting: new Map(
          succeeded.map((t) => [
            t.cwd,
            { name: t.name, logStart: t.logStart, ignorePids: t.ignorePids },
          ]),
        ),
      });
    })();
  }, [spawnState.phase, hasLoaded]);

  // Re-arm the flow for a spawn request that arrives at a dashboard which is
  // already mounted. Every start seen so far reaches a fresh mount, and that
  // mount reads its request off the capture above; what Raycast does when the
  // dashboard is already loaded and a start is sent from the menu bar inside
  // the same window is not documented. If the context lands on this mount
  // instead of a new one, the capture never sees it and the start goes nowhere:
  // no spawn, no pending row, nothing said to the user.
  //
  // `requestId` is the whole test. Object identity cannot serve: the
  // destructured props are new every render, so an unchanged context looks
  // like news on every single one. Comparing ids makes repeated renders of the
  // same request a no-op, and the same goes for a sender too old to send one.
  const handledRequestId = useRef(spawnRequest?.requestId);
  useEffect(() => {
    const incoming = props.launchContext?.spawn;
    if (!incoming?.requestId) return;
    if (incoming.requestId === handledRequestId.current) return;
    // A start still in flight keeps the machine. The phases in between own a
    // toast, a set of rows, and possibly a confirm dialog the user has yet to
    // answer, and cutting in would strand all three. Dropping the newcomer
    // here is no worse than what happens today, whereas dropping one while
    // nothing is in flight is the hole this effect exists to close.
    if (spawnState.phase !== "idle" && spawnState.phase !== "done") return;
    handledRequestId.current = incoming.requestId;
    // Enter exactly where a mount enters: the flow effect reads the request
    // off the ref, and runs on "pending" once its guard is clear. `hasLoaded`
    // flipped long ago on a dashboard that is already up, so the confirms are
    // still based on a completed fetch, same as at mount.
    launchContextRef.current = props.launchContext;
    spawnFlowFired.current = false;
    setSpawnState({ phase: "pending" });
  }, [props.launchContext, spawnState.phase]);

  // Watch for every expected start to land. Drives the toast to Success and
  // auto-hides after a brief beat.
  //
  // "Landed" is the rows' own predicate, not the mere presence of the cwd in
  // `servers`: a sibling server or the corpse of the one the pre-spawn kill
  // took down would satisfy presence, and then a start that never bound a port
  // would get a success toast and open somebody else's URL.
  //
  // The predicate is put to `expecting`, which carries each row's own
  // ignorePids, rather than to the live pending entries. The cleanup effect
  // above deletes an entry in the very render it resolves, so in a batch that
  // lands one server at a time the early entries are already gone by the time
  // the last one arrives. Reading state here would lose track of precisely the
  // servers this effect then has to focus and open.
  useEffect(() => {
    if (spawnState.phase !== "spawning") return;
    const expecting = spawnState.expecting;
    const landed = new Map<string, DevServer>();
    for (const [cwd, target] of expecting) {
      const server = resolvingServer(cwd, target, servers);
      if (!server) return;
      landed.set(cwd, server);
    }

    // All expected servers detected. Move the cursor onto the newly started
    // server so the default ↵ action operates on it instead of whatever row
    // happened to be selected. When several were started at once, focus the
    // first; the user can step through the rest. The server to focus is the one
    // the predicate resolved, which is the row the pending one just handed over
    // to, rather than whatever else happens to share the cwd.
    //
    // Skipped while the cursor sits on a pending row: the render-time handoff
    // has already carried it to that row's server, and that is the one the
    // user was watching. Overriding it here would drag them to the first of a
    // batch for no reason.
    if (!selectedIdRef.current?.startsWith(PENDING_ID_PREFIX)) {
      const firstCwd = [...expecting.keys()][0];
      const focusTarget = landed.get(firstCwd);
      if (focusTarget) setSelectedItemId(String(focusTarget.pid));
    }

    // Auto-open is the extension acting on its own, so it opens the tab
    // behind whatever the user is looking at. Raycast's `open()` activates
    // the browser, and Raycast hides itself the moment it loses focus, which
    // tore the dashboard away mid-glance a couple of seconds after a start.
    // Losing the window also loses everything else it was offering: copying
    // the URL for a different browser, opening a terminal on the project.
    //
    // Opens the resolving server's URL rather than the first server sharing
    // the cwd, so a surviving sibling's URL is never the one that gets a tab.
    if (autoOpen) {
      for (const s of landed.values()) openAutomatically(s.url);
    }
    pokeMenuBar();
    const toast = toastRef.current;
    if (toast) {
      toast.style = Toast.Style.Success;
      toast.title =
        expecting.size === 1
          ? `${[...expecting.values()][0].name} is running`
          : `${expecting.size} dev servers running`;
      setTimeout(() => {
        toast.hide().catch(() => {});
      }, 2500);
    }
    setSpawnState({ phase: "done" });
  }, [servers, spawnState]);

  // Hard 15s timeout. Any expected server that still hasn't bound a port turns
  // its pending row red. A server that exits before binding is otherwise
  // indistinguishable from one still booting, so without this the row would
  // spin forever and the user would have no thread to pull on.
  //
  // The failure lands on the row rather than the toast because the remedies
  // have to outlive the moment: a toast takes its actions with it when it
  // goes, and it degrades to an actionless HUD whenever the Raycast window is
  // closed, which is most of the time 15 seconds after a start. Each missing
  // target diagnoses itself, so several servers failing for different reasons
  // each say their own piece, which one toast line could never do.
  //
  // `servers` is read from the ref so we compare against the latest poll, not
  // the stale snapshot this effect closed over.
  useEffect(() => {
    if (spawnState.phase !== "spawning") return;
    const expecting = spawnState.expecting;
    const timer = setTimeout(() => {
      // The same predicate the rows resolve on, so a start is only failed here
      // while its row is still spinning. A cwd whose entry has gone is either
      // one the predicate has already resolved (so it is not in here anyway) or
      // one the user dismissed, and a row thrown away is not ours to fail or to
      // move the cursor onto.
      const missing = [...expecting.entries()].filter(
        ([cwd, target]) =>
          pendingStartsRef.current.has(cwd) &&
          !resolvingServer(cwd, target, serversRef.current),
      );
      if (missing.length > 0) {
        const diagnosed = missing.map(
          ([cwd, target]) =>
            [cwd, diagnoseSpawnFailure(cwd, target.logStart)] as const,
        );
        setPendingStarts((prev) => {
          const next = new Map(prev);
          for (const [cwd, reason] of diagnosed) {
            const entry = next.get(cwd);
            if (entry) next.set(cwd, { ...entry, status: "failed", reason });
          }
          return next;
        });
        // Put the cursor on the first failed row so its remedies are one ↵
        // away. Safe to pin: this row has been on screen since the spawn, so
        // we are only re-pointing selection at an id the list already has.
        setSelectedItemId(pendingRowId(missing[0][0]));
      }
      // The rows carry the failure now, and the success path has its own
      // toast, so nothing is left for this one to say.
      toastRef.current?.hide().catch(() => {});
      // The pre-spawn kill may have taken servers down that never came back,
      // so the count changed on a path that used to poke only on success.
      pokeMenuBar();
      setSpawnState({ phase: "done" });
    }, SPAWN_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [spawnState.phase]);

  // The same giving-up, driven by the rows instead of by the spawn phase. The
  // watchdog above is armed by `spawnState`, which only the mount that fired
  // the start ever has; a mount that inherited its rows from storage would
  // leave them spinning forever. This one arms off the rows themselves, on the
  // earliest deadline still outstanding, and re-arms whenever they change.
  //
  // It flips status and nothing else: no toast to hide, no selection to move,
  // no phase to advance, because none of that belongs to a start this mount
  // did not make. When both are armed at once they agree by construction. The
  // sweep only ever flips entries that are still "starting" and overdue, so it
  // is idempotent, and firing first costs nothing: the watchdog's own filter
  // asks whether the row is still in the map, which a flipped row is, so it
  // re-diagnoses from the same log offset, reaches the same reason, and goes
  // on to pin selection exactly as it does today.
  useEffect(() => {
    const deadlines = [...pendingStarts.values()]
      .filter((entry) => entry.status === "starting")
      .map((entry) => entry.deadline);
    if (deadlines.length === 0) return;
    const timer = setTimeout(
      () => {
        const now = Date.now();
        const overdue = [...pendingStartsRef.current].filter(
          ([, entry]) => entry.status === "starting" && entry.deadline <= now,
        );
        if (overdue.length === 0) return;
        const diagnosed = overdue.map(
          ([cwd, entry]) =>
            [cwd, diagnoseSpawnFailure(cwd, entry.logStart)] as const,
        );
        setPendingStarts((prev) => {
          const next = new Map(prev);
          let flipped = false;
          for (const [cwd, reason] of diagnosed) {
            const entry = next.get(cwd);
            if (entry?.status !== "starting" || entry.deadline > now) continue;
            next.set(cwd, { ...entry, status: "failed", reason });
            flipped = true;
          }
          // Handing back `prev` when nothing qualified keeps this effect from
          // re-arming on a map that only changed identity.
          return flipped ? next : prev;
        });
      },
      Math.max(0, Math.min(...deadlines) - Date.now()),
    );
    return () => clearTimeout(timer);
  }, [pendingStarts]);

  // Every observed server feeds the recents store, so the Start Recent
  // Dev Server picker has an up-to-date list of projects without the user
  // having to bookmark anything explicitly. Dedup by cwd within a single
  // tick so multi-server projects don't write themselves multiple times.
  useEffect(() => {
    if (servers.length === 0) return;
    const byCwd = new Map<string, ReturnType<typeof toRecent>>();
    for (const s of servers) {
      if (!byCwd.has(s.cwd)) byCwd.set(s.cwd, toRecent(s));
    }
    recordSeenBatch([...byCwd.values()]).catch(() => {
      // Recents are a best-effort enhancement; a write failure must not
      // disrupt the dashboard, so swallow.
    });
  }, [servers]);

  async function kill(pid: number) {
    // Captured before the kill: afterwards this pid is gone from `servers`.
    const cwd = servers.find((s) => s.pid === pid)?.cwd;
    try {
      await mutate(killProcess(pid), {
        optimisticUpdate: (current) =>
          (current ?? []).filter((s) => s.pid !== pid),
        rollbackOnError: true,
      });
      // Take the project's leftover helpers with it: the kill above does not.
      // It is a bare SIGTERM that returns before the port is released, so the
      // helper waits for the project to actually go down. It backs out if
      // another server is still serving this cwd once it does, so a project
      // running two dev servers keeps the survivor's plumbing.
      if (cwd) await reapProjectHelpersWhenDown([cwd]);
      pokeMenuBar();
    } catch (err) {
      await showFailureToast(err, { title: "Failed to kill server" });
    }
  }

  async function killProject(projectKey: string) {
    const targets = servers.filter((s) => s.projectKey === projectKey);
    if (targets.length === 0) return;
    const projectName = targets[0].projectName;
    const confirmed = await confirmAlert({
      title: `Kill all servers for ${projectName}?`,
      message: `This will stop ${targets.length} server${targets.length > 1 ? "s" : ""}.`,
      primaryAction: {
        title: "Kill",
        style: Alert.ActionStyle.Destructive,
      },
      rememberUserChoice: true,
    });
    if (!confirmed) return;
    try {
      await mutate(
        (async () => {
          await Promise.all(targets.map((s) => killProcess(s.pid)));
          // Killing does not take the helpers with it, and SIGTERM returns
          // before the servers release their ports, so this waits for each
          // folder to go quiet before reaping it.
          await reapProjectHelpersWhenDown(targets.map((s) => s.cwd));
        })(),
        {
          optimisticUpdate: (current) =>
            (current ?? []).filter((s) => s.projectKey !== projectKey),
          rollbackOnError: true,
        },
      );
      pokeMenuBar();
    } catch (err) {
      await showFailureToast(err, {
        title: `Failed to kill servers for ${projectName}`,
      });
    }
  }

  async function killAll() {
    if (servers.length === 0) return;
    const confirmed = await confirmAlert({
      title: "Kill all dev servers?",
      message: `This will stop all ${servers.length} running server${servers.length > 1 ? "s" : ""} across every project.`,
      primaryAction: {
        title: "Kill All",
        style: Alert.ActionStyle.Destructive,
      },
      // Intentionally NO rememberUserChoice. The nuclear option always confirms.
    });
    if (!confirmed) return;
    try {
      await mutate(
        (async () => {
          await Promise.all(servers.map((s) => killProcess(s.pid)));
          // Killing does not take the helpers with it, and SIGTERM returns
          // before the servers release their ports, so this waits for each
          // folder to go quiet before reaping it.
          await reapProjectHelpersWhenDown(servers.map((s) => s.cwd));
        })(),
        {
          optimisticUpdate: () => [],
          rollbackOnError: true,
        },
      );
      pokeMenuBar();
    } catch (err) {
      await showFailureToast(err, { title: "Failed to kill all servers" });
    }
  }

  async function restart(server: DevServer) {
    // Every pid holding this cwd before the kill, including the one being
    // replaced. Hoisted because the pending row and the poll below both put it
    // to resolvingServer: one array means the toast and the row can never
    // disagree about whether the restart landed. A kill-resistant old listener
    // used to make a bare count exceed its baseline while the row went on
    // spinning, and a sibling exiting mid-window used to do the reverse.
    const ignorePids = [
      ...serversRef.current
        .filter((s) => s.cwd === server.cwd && s.pid !== server.pid)
        .map((s) => s.pid),
      server.pid,
    ];
    // Same log baseline the spawn flow takes: a restart respawns through
    // startDevServer, so it fails for the same nameable reasons and deserves
    // the same diagnosis instead of a bare file path.
    const logStart = spawnLogOffset(server.cwd);
    // The row goes up before the kill, so the project never blinks out of the
    // list: the old row goes, this one is already standing in its place.
    // ignorePids is every server that held this cwd a moment ago, so the row
    // waits for a genuinely new one rather than resolving against a sibling
    // or against the corpse of the server being replaced.
    setPendingStarts((prev) =>
      new Map(prev).set(server.cwd, {
        name: server.projectName,
        projectKey: server.projectKey,
        logStart,
        // The restart runs its own poll rather than the watchdog, so the
        // deadline trails that window by a beat: a sweep on a later mount must
        // never call a start failed while the poll that owns it is still
        // asking.
        deadline: Date.now() + RESTART_WINDOW_S * 1000 + 2000,
        status: "starting",
        reason: null,
        kind: "restart",
        ignorePids,
      }),
    );
    setSelectedItemId(pendingRowId(server.cwd));
    try {
      await mutate(restartServer(server), {
        optimisticUpdate: (current) =>
          (current ?? []).filter((s) => s.pid !== server.pid),
        rollbackOnError: false,
      });
      const toast = await showToast({
        style: Toast.Style.Animated,
        title: "Restarting…",
        message: server.projectName,
      });
      // Poll at staggered intervals up to RESTART_WINDOW_S. Bail early as soon
      // as the row's own predicate finds the replacement, so "Restarted" and
      // the spinner going away are the same event rather than two guesses at
      // it.
      let restored = false;
      for (const delay of RESTART_POLL_DELAYS) {
        await new Promise((r) => setTimeout(r, delay));
        await revalidate();
        if (resolvingServer(server.cwd, { ignorePids }, serversRef.current)) {
          restored = true;
          break;
        }
      }
      if (restored) {
        toast.style = Toast.Style.Success;
        toast.title = "Restarted";
        // Same exit the start toast makes: confirmation is a moment, not a
        // fixture, and a toast never dismisses itself.
        setTimeout(() => {
          toast.hide().catch(() => {});
        }, 2500);
        // Selection has already followed the row across in render, and the
        // cleanup effect drops the entry: both ran off the same predicate the
        // poll just did. Nothing to do here but the toast. The server it
        // resolved against is the newest for this cwd, so the sort puts it at
        // the top of its project and its project at the top of the list.
        pokeMenuBar();
      } else {
        // Same surface as a failed start. A toast cannot hold the remedies
        // past its own lifetime, and 10 seconds after a restart the Raycast
        // window is usually already gone.
        toast.hide().catch(() => {});
        const reason = diagnoseSpawnFailure(server.cwd, logStart);
        setPendingStarts((prev) => {
          // Defensive only. The poll and the cleanup effect now share one
          // predicate, so an entry already dropped means the restart landed,
          // which is not this branch.
          const entry = prev.get(server.cwd);
          if (!entry) return prev;
          return new Map(prev).set(server.cwd, {
            ...entry,
            status: "failed",
            reason,
          });
        });
        // The old server is dead and nothing replaced it: the menu bar's
        // count changed on a failure just as surely as on a success.
        pokeMenuBar();
      }
    } catch (err) {
      // The respawn never got off the ground, so there is nothing for a row
      // to wait on. Drop it and let the error speak for itself.
      dismissPending(server.cwd);
      pokeMenuBar();
      await showFailureToast(err, {
        title: `Failed to restart ${server.projectName}`,
      });
    }
  }

  const terminalApp = prefs.terminalApp ?? DEFAULT_TERMINAL;
  const editorApp = prefs.editorApp;
  // Resolved once per mount; a Wi-Fi change mid-session is rare enough that
  // reopening the command is an acceptable refresh.
  const lanIp = useMemo(lanIPv4, []);
  const [toolFilter, setToolFilter] = useState<string>("all");

  // Visibility prefs default to true so first-time users see everything.
  // Raycast returns `undefined` for an unset checkbox on first launch.
  const show: RowVisibility = {
    branch: prefs.showBranch ?? true,
    uptime: prefs.showUptime ?? true,
    tool: prefs.showTool ?? true,
    localUrl: prefs.showLocalUrl ?? true,
  };

  // Manual refresh: useCachedPromise's revalidate is silent because
  // keepPreviousData keeps the list rendered. Show a brief animated toast so
  // the user knows their ⌘R actually did something.
  async function refresh() {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Refreshing…",
    });
    try {
      await revalidate();
      toast.style = Toast.Style.Success;
      toast.title = "Refreshed";
    } catch (err) {
      await showFailureToast(err, { title: "Refresh failed" });
    }
  }

  // Unique tools currently visible. Drives the dropdown options.
  const availableTools = useMemo(() => {
    const seen = new Set<string>();
    for (const s of servers) seen.add(s.tool);
    return Array.from(seen).sort();
  }, [servers]);

  // Mid-start helper rows are already gone: the fetch drops them, so `servers`
  // never carries one and the snapshot the menu bar reads doesn't either.
  const visible =
    toolFilter === "all"
      ? servers
      : servers.filter((s) => s.tool === toolFilter);

  // Which pending starts still deserve a row. Derived every render, never
  // stored: an entry shows only while `resolvingServer` finds nothing for it.
  // Reading the same array the server rows are built from is what makes the
  // handoff atomic, since the synthetic row can only vanish in the very
  // render that lists the real one. If this were a stored flag there would be
  // a frame with neither row, and selection would jump to a stranger.
  //
  // "The same array" holds because the predicate only ever resolves against a
  // deliberate port, and the fetch's mid-start rule drops nothing on a
  // deliberate port: the server that retires this row is always one `servers`
  // is carrying.
  const visiblePending = [...pendingStarts].filter(
    ([cwd, entry]) => !resolvingServer(cwd, entry, servers),
  );

  // Group by projectKey (git common-dir for git projects, cwd otherwise) so
  // sibling worktrees of the same repo collapse into one section. Each row
  // still carries its own cwd/branch so per-row actions stay correct.
  //
  // Pending rows sit in their project's own section rather than a separate
  // "Starting" one. A section header names a project, and a project does not
  // stop being itself while one of its servers boots: the old header went
  // stale the moment a row failed, since "Starting" was then describing a row
  // that had given up. Keeping the header constant also means nothing moves
  // when the row resolves, because it was already in the section it was
  // always going to land in.
  type Group = {
    key: string;
    pending: [string, PendingStart][];
    servers: DevServer[];
  };
  const groupsByKey = new Map<string, Group>();
  const groupFor = (key: string) => {
    const found = groupsByKey.get(key);
    if (found) return found;
    const made: Group = { key, pending: [], servers: [] };
    groupsByKey.set(key, made);
    return made;
  };
  // Pending first, so their projects lead the list purely by insertion order:
  // something happening right now outranks something up for an hour.
  for (const [cwd, entry] of visiblePending) {
    groupFor(entry.projectKey).pending.push([cwd, entry]);
  }
  for (const s of visible) groupFor(s.projectKey).servers.push(s);

  const grouped = (() => {
    const all = [...groupsByKey.values()];
    for (const g of all) g.servers.sort(byRecency);
    const busy = all.filter((g) => g.pending.length > 0);
    const idle = all
      .filter((g) => g.pending.length === 0)
      .sort((a, b) => byRecency(a.servers[0], b.servers[0]));
    return [...busy, ...idle];
  })();

  // A section is titled for its project whether or not anything of it is
  // running yet. Prefer a real server's name: a pending entry only knows the
  // name the spawn target was given, while a server has been through project
  // detection.
  const groupTitle = (g: Group) =>
    g.servers.length > 0
      ? prefs.showFullPath
        ? g.servers[0].cwd
        : g.servers[0].projectName
      : prefs.showFullPath
        ? g.pending[0][0]
        : g.pending[0][1].name;
  const visibleFailedCount = visiblePending.filter(
    ([, entry]) => entry.status === "failed",
  ).length;

  // Hand the cursor across the same handoff the rows make, in render, for the
  // same reason the rows are derived: an effect runs *after* the commit that
  // dropped the pending row, so for one frame `selectedItemId` names a row
  // that no longer exists. Raycast reacts to that by picking a row itself and
  // reporting it through onSelectionChange, which lands in our state and wins
  // over whatever the effect set a moment later. Resolving it here means the
  // id never dangles, so there is nothing for Raycast to correct.
  //
  // Following the row the cursor is actually on also beats jumping to the
  // first of a batch: with several starting at once, the user is watching a
  // specific one.
  const selectedPendingCwd = selectedItemId?.startsWith(PENDING_ID_PREFIX)
    ? selectedItemId.slice(PENDING_ID_PREFIX.length)
    : undefined;
  const selectedPendingEntry = selectedPendingCwd
    ? pendingStarts.get(selectedPendingCwd)
    : undefined;
  const landed =
    selectedPendingCwd && selectedPendingEntry
      ? resolvingServer(selectedPendingCwd, selectedPendingEntry, servers)
      : undefined;
  const effectiveSelectedItemId = landed ? String(landed.pid) : selectedItemId;

  return (
    <List
      isLoading={effectiveLoading}
      searchBarPlaceholder="Filter servers..."
      // Search still filters natively, but the Starting section stays put:
      // a start in flight is the thing the user is waiting on, so a query
      // must not demote it below the servers already running.
      filtering={{ keepSectionOrder: true }}
      selectedItemId={effectiveSelectedItemId}
      onSelectionChange={(id) => setSelectedItemId(id ?? undefined)}
      searchBarAccessory={
        availableTools.length > 1 ? (
          <List.Dropdown
            tooltip="Filter by tool"
            value={toolFilter}
            onChange={setToolFilter}
          >
            <List.Dropdown.Item title="All Tools" value="all" />
            <List.Dropdown.Section>
              {availableTools.map((tool) => (
                <List.Dropdown.Item
                  key={tool}
                  title={toolLabel(tool)}
                  value={tool}
                />
              ))}
            </List.Dropdown.Section>
          </List.Dropdown>
        ) : undefined
      }
    >
      {servers.length === 0 &&
        visiblePending.length === 0 &&
        !effectiveLoading && (
          <List.EmptyView
            title="No Dev Servers Running"
            description={`Refreshing every ${prefs.refreshInterval}s.`}
            actions={
              <ActionPanel>
                {/* ↵ runs it as the primary action, but ⌘N has to work here
                    too: it is the chord for starting a server from every row
                    in this list, and the empty state is exactly where someone
                    reaches for it. */}
                <Action
                  title="Start Dev Server"
                  icon={Icon.Play}
                  shortcut={{ modifiers: ["cmd"], key: "n" }}
                  onAction={openStartCommand}
                />
                <Action
                  title="Refresh"
                  icon={Icon.ArrowClockwise}
                  shortcut={{ modifiers: ["cmd"], key: "r" }}
                  onAction={refresh}
                />
                <Action
                  title="Open Extension Preferences"
                  icon={Icon.Gear}
                  onAction={openExtensionPreferences}
                />
              </ActionPanel>
            }
          />
        )}
      {grouped.map((group) => (
        <List.Section
          key={group.key}
          // When showFullPath is on, use a cwd as a concrete path hint. (For
          // multi-worktree sections the per-row branch tag and its tooltip
          // distinguish which worktree each row belongs to.)
          title={groupTitle(group)}
          subtitle={
            group.servers.length > 0
              ? `${group.servers.length} server${group.servers.length > 1 ? "s" : ""}`
              : undefined
          }
        >
          {/* In flight first: it is the newest thing in the project, and it
              becomes the row directly below it. */}
          {group.pending.map(([cwd, entry]) => (
            <PendingItem
              key={pendingRowId(cwd)}
              // Namespaced so a synthetic id can never collide with a server
              // row's, which is a bare pid.
              id={pendingRowId(cwd)}
              cwd={cwd}
              entry={entry}
              terminalApp={terminalApp}
              editorApp={editorApp}
              failedCount={visibleFailedCount}
              onDismiss={() => dismissPending(cwd)}
              onDismissAll={dismissAllFailed}
              onRefresh={refresh}
            />
          ))}
          {group.servers.map((server) => (
            <ServerItem
              key={server.pid}
              id={String(server.pid)}
              server={server}
              terminalApp={terminalApp}
              editorApp={editorApp}
              lanIp={lanIp}
              show={show}
              onKill={() => kill(server.pid)}
              onKillProject={() => killProject(group.key)}
              onKillAll={killAll}
              onRestart={() => restart(server)}
              onRefresh={refresh}
            />
          ))}
        </List.Section>
      ))}
    </List>
  );
}
