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
import {
  recordSeen,
  recordSeenBatch,
  toRecent,
  updateRecentFavicon,
} from "./recents";
import {
  fetchServers,
  killProcess,
  killServer,
  restartServer,
  spawnLogPath,
  startDevServer,
} from "./servers";
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

// Fetch with a hard 3s timeout. Returns null on any failure so callers can
// chain fallbacks cleanly without nested try/catch.
async function fetchWithTimeout(
  url: string,
  init: RequestInit & { method?: string } = {},
): Promise<Response | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 3000);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

// Fetch a favicon and return it as an inline data URI, or undefined if the URL
// doesn't serve an image. Inlining the bytes (rather than handing Raycast a
// URL to fetch) sidesteps CORS, since some dev servers (notably Astro) don't set
// Access-Control-Allow-Origin on static assets, and Raycast's image loader
// refuses those.
//
// SVG uses URL-encoded payload, raster uses base64. That split mirrors what
// @raycast/utils does internally for its own SVG icons.
async function fetchFaviconDataUri(url: string): Promise<string | undefined> {
  const res = await fetchWithTimeout(url);
  if (!res || !res.ok) return undefined;
  const ct = (res.headers.get("content-type") ?? "")
    .split(";")[0]
    .trim()
    .toLowerCase();
  if (!ct.startsWith("image/")) return undefined;
  if (ct.includes("svg")) {
    const svg = await res.text();
    return `data:image/svg+xml,${encodeURIComponent(svg)}`;
  }
  const buf = Buffer.from(await res.arrayBuffer());
  return `data:${ct};base64,${buf.toString("base64")}`;
}

// Resolve the best favicon for a localhost dev server. Tries in order:
//  1. <link rel="icon"> in the page HTML
//  2. /favicon.ico (the convention every framework starter ships with)
//  3. undefined → caller renders a framework-tinted globe instead.
async function detectFaviconUrl(port: string): Promise<string | undefined> {
  const origin = `http://localhost:${port}`;

  const html = await fetchWithTimeout(`${origin}/`).then((r) =>
    r ? r.text() : null,
  );
  if (html) {
    const linkTags = html.match(/<link[^>]+>/gi) ?? [];
    for (const tag of linkTags) {
      if (!/rel=["'][^"']*icon[^"']*["']/i.test(tag)) continue;
      const hrefMatch = tag.match(/href=["']([^"']+)["']/i);
      if (!hrefMatch) continue;
      const href = hrefMatch[1];
      const url = href.startsWith("http")
        ? href
        : `${origin}${href.startsWith("/") ? href : `/${href}`}`;
      const dataUri = await fetchFaviconDataUri(url);
      if (dataUri) return dataUri;
    }
  }

  return fetchFaviconDataUri(`${origin}/favicon.ico`);
}

// On-demand view of a project's startup log. When a dev server fails to
// bind a port, the failure detail is in the spawn log (stdout+stderr) that
// `startDevServer` redirects to `spawnLogPath(cwd)`, not in any terminal
// the user can see. This surfaces that file so a misconfigured or custom
// setup (portless needing sudo, a missing binary, a crashing build) is
// diagnosable from inside Raycast instead of failing opaquely.
//
// Reached on demand only: from a per-row action, and from the "View
// Startup Log" action on the failure toast when a spawn isn't detected.
function SpawnLogView({ cwd, name }: { cwd: string; name: string }) {
  const logPath = spawnLogPath(cwd);
  const { data, isLoading, revalidate } = useCachedPromise(
    async (p: string): Promise<string> => {
      try {
        return await fs.promises.readFile(p, "utf8");
      } catch {
        return "";
      }
    },
    [logPath],
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
  const body = log
    ? "```\n" + log + "\n```"
    : exists
      ? "_The log file exists but is empty. The process wrote no output before exiting._"
      : "_No startup log found. This server may have been started outside Dev Servers, so we never captured its output._";
  const markdown = `# Startup log: ${name}\n\n${body}\n\n---\n\n\`${logPath}\``;

  return (
    <Detail
      isLoading={isLoading}
      markdown={markdown}
      navigationTitle={`Startup log: ${name}`}
      actions={
        <ActionPanel>
          <Action
            title="Refresh"
            icon={Icon.ArrowClockwise}
            onAction={revalidate}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
          />
          {log && <Action.CopyToClipboard title="Copy Log" content={log} />}
          {exists && (
            <Action.Open
              title="Open Log File"
              target={logPath}
              icon={Icon.BlankDocument}
            />
          )}
          {exists && <Action.ShowInFinder path={logPath} />}
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
  // Cache the favicon URL by port. Survives revalidations and command
  // relaunches, so the icon doesn't flash back to a placeholder every
  // refresh interval. keepPreviousData keeps the prior URL visible while
  // a fresh fetch is in flight.
  const { data: faviconUrl } = useCachedPromise(
    detectFaviconUrl,
    [server.port],
    {
      keepPreviousData: true,
    },
  );
  // Persist resolved favicons onto the project's recents entry so the
  // picker (in the Start command) can render the real icon even when the
  // server is stopped. updateRecentFavicon is a no-op when nothing
  // changed, so this is cheap to call on every render.
  useEffect(() => {
    if (!faviconUrl) return;
    updateRecentFavicon(server.cwd, faviconUrl).catch(() => {
      // Picker iconography is best-effort; failing to persist must not
      // disrupt the dashboard.
    });
  }, [server.cwd, faviconUrl]);
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
  targets: Array<{ cwd: string; name: string }>;
  // Multi-folder confirm gate, set by the Start command's preference.
  // Always false for single-target spawns (picker rows, folder picker).
  confirmMulti: boolean;
  // Open each new server's URL in the browser when it binds.
  autoOpen: boolean;
  // Attach a one-time "Auto-open in Browser?" CTA to the Starting toast.
  // The Start command pre-decides this based on a usage counter.
  showAutoOpenHint: boolean;
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
  totalCount: number,
): Promise<boolean> {
  if (runningTargets.length === 0) return true;
  const names = runningTargets.map((r) => r.target.name);
  const running = runningTargets.length;
  const total = totalCount;
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
      expecting: Map<string, string>;
      autoOpen: boolean;
    }
  | { phase: "done" };

export default function Command(
  props: LaunchProps<{ launchContext?: DashboardLaunchContext }>,
) {
  const prefs = getPreferenceValues<Preferences.Index>();
  const { push } = useNavigation();
  // Capture launchContext once at mount. The destructured props are new
  // identities every render, so reading via a ref keeps every effect's
  // closure stable.
  const launchContextRef = useRef(props.launchContext);
  const spawnRequest = launchContextRef.current?.spawn;

  // Dedupe `servers` references when content is unchanged. Without this,
  // every poll (every 1s while expecting servers) hands React a new array
  // identity, triggering downstream effects/memos to re-evaluate even
  // when nothing actually changed. Raycast's dev runtime detects this as
  // "rendering a lot without any changes" and warns, and it's wasted
  // work regardless of the warning. Returning the previous reference
  // when pid+port content matches lets React's Object.is bail out of
  // the re-render entirely.
  const fetchStableServers = useMemo(() => {
    let last: DevServer[] = [];
    return async (): Promise<DevServer[]> => {
      const next = await fetchServers();
      if (sameServers(next, last)) return last;
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
        .map((t) => ({ target: t, existing: running.get(t.cwd) }))
        .filter(
          (
            x,
          ): x is {
            target: { cwd: string; name: string };
            existing: DevServer;
          } => !!x.existing,
        );
      const proceed = await confirmRestartBatch(
        runningTargets,
        spawn.targets.length,
      );
      if (!proceed) {
        setSpawnState({ phase: "done" });
        return;
      }

      // 3. Show the "Starting…" toast before doing the kill+spawn work
      //    so the user has feedback the moment they confirm.
      const label =
        spawn.targets.length === 1
          ? spawn.targets[0].name
          : `${spawn.targets.length} dev servers`;
      const toast = await showToast({
        style: Toast.Style.Animated,
        title: `Starting ${label}…`,
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
      //    we spawn replacements. Parallelized, since they're independent processes.
      await Promise.all(
        runningTargets.map((rt) => killServer(rt.existing.pid)),
      );

      // 5. Spawn every approved target in parallel. The spawn itself
      //    returns immediately (detached process), so this is fast. A target
      //    whose spawn throws (e.g. no recognizable dev script) gets its own
      //    failure toast here and is dropped from the set we go on to watch —
      //    see step 6.
      const spawned = await Promise.all(
        spawn.targets.map(async (t) => {
          try {
            await startDevServer(t.cwd);
            await recordSeen({
              cwd: t.cwd,
              projectName: t.name,
            });
            return t;
          } catch (err) {
            await showFailureToast(err, {
              title: `Failed to start ${t.name}`,
            });
            return null;
          }
        }),
      );
      const succeeded = spawned.filter(
        (t): t is (typeof spawn.targets)[number] => Boolean(t),
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

      // The watch effect below takes over, flipping the toast to Success once
      // every spawned cwd appears in the servers state (driven by the normal
      // polling, now at 1s).
      setSpawnState({
        phase: "spawning",
        expecting: new Map(succeeded.map((t) => [t.cwd, t.name])),
        autoOpen: spawn.autoOpen,
      });
    })();
  }, [spawnState.phase, hasLoaded]);

  // Watch for every expected cwd to show up in the servers state.
  // Drives the toast to Success and auto-hides after a brief beat.
  useEffect(() => {
    if (spawnState.phase !== "spawning") return;
    const expecting = spawnState.expecting;
    const remaining = new Map(expecting);
    for (const s of servers) {
      if (remaining.has(s.cwd)) remaining.delete(s.cwd);
    }
    if (remaining.size > 0) return;

    // All expected servers detected. Move the cursor onto the newly started
    // server so the default ↵ action operates on it instead of whatever row
    // happened to be selected (the list is ordered by PID, not start time, so
    // a new server usually lands at the bottom — see the grouping below). When
    // several were started at once, focus the first; the user can step through
    // the rest. Resolving by cwd picks whichever server is now listening for
    // that cwd, which is the freshly spawned one even after a kill+respawn.
    const firstCwd = [...expecting.keys()][0];
    const focusTarget = servers.find((x) => x.cwd === firstCwd);
    if (focusTarget) setSelectedItemId(String(focusTarget.pid));

    if (spawnState.autoOpen) {
      for (const cwd of expecting.keys()) {
        const s = servers.find((x) => x.cwd === cwd);
        if (s) open(s.url).catch(() => {});
      }
    }
    const toast = toastRef.current;
    if (toast) {
      toast.style = Toast.Style.Success;
      toast.title =
        expecting.size === 1
          ? `${[...expecting.values()][0]} is running`
          : `${expecting.size} dev servers running`;
      setTimeout(() => {
        toast.hide().catch(() => {});
      }, 2500);
    }
    setSpawnState({ phase: "done" });
  }, [servers, spawnState]);

  // Hard 15s timeout. If some expected servers still haven't bound a port,
  // escalate the toast to a Failure that offers the startup log, since that's
  // where the reason lives (e.g. portless needing sudo, a missing binary,
  // a crashing build). A server that exits before binding is otherwise
  // indistinguishable from one still booting, so without this the toast
  // would just vanish and the user would have no thread to pull on.
  //
  // Wording stays soft ("not detected yet") because a genuinely slow build
  // can exceed 15s; we assert "not seen", not "failed forever". `servers`
  // is read from the ref so we compare against the latest poll, not the
  // stale snapshot this effect closed over.
  useEffect(() => {
    if (spawnState.phase !== "spawning") return;
    const expecting = spawnState.expecting;
    const timer = setTimeout(() => {
      const present = new Set(serversRef.current.map((s) => s.cwd));
      const missing = [...expecting.entries()].filter(
        ([cwd]) => !present.has(cwd),
      );
      const toast = toastRef.current;
      if (toast && missing.length > 0) {
        const names = joinNames(missing.map(([, name]) => name));
        toast.style = Toast.Style.Failure;
        toast.title =
          missing.length === 1
            ? `${names} hasn't started yet`
            : `${names} haven't started yet`;
        toast.message = "Not detected after 15s. Check the startup log.";
        const [firstCwd, firstName] = missing[0];
        toast.primaryAction = {
          title: "View Startup Log",
          onAction: (t) => {
            t.hide().catch(() => {});
            push(<SpawnLogView cwd={firstCwd} name={firstName} />);
          },
        };
      } else {
        toast?.hide().catch(() => {});
      }
      setSpawnState({ phase: "done" });
    }, 15000);
    return () => clearTimeout(timer);
  }, [spawnState.phase]);

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
    try {
      await mutate(killProcess(pid), {
        optimisticUpdate: (current) =>
          (current ?? []).filter((s) => s.pid !== pid),
        rollbackOnError: true,
      });
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
        })(),
        {
          optimisticUpdate: (current) =>
            (current ?? []).filter((s) => s.projectKey !== projectKey),
          rollbackOnError: true,
        },
      );
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
        })(),
        {
          optimisticUpdate: () => [],
          rollbackOnError: true,
        },
      );
    } catch (err) {
      await showFailureToast(err, { title: "Failed to kill all servers" });
    }
  }

  async function restart(server: DevServer) {
    // Snapshot the project's server count BEFORE killing the old one so we
    // can detect when a new server has bound a port. We use serversRef.current
    // so we always see the latest state across the polling loop. The pid set
    // (excluding the one we're about to kill) lets us single out the
    // replacement afterwards so we can move the cursor onto it.
    const priorPids = new Set(
      serversRef.current
        .filter((s) => s.cwd === server.cwd && s.pid !== server.pid)
        .map((s) => s.pid),
    );
    const baseline = priorPids.size;
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
      // Poll at staggered intervals up to ~10s. Bail early as soon as the
      // server count for this project rises above baseline (new port bound).
      const delays = [1000, 2000, 3000, 4000];
      let restored = false;
      for (const delay of delays) {
        await new Promise((r) => setTimeout(r, delay));
        await revalidate();
        const current = serversRef.current.filter(
          (s) => s.cwd === server.cwd,
        ).length;
        if (current > baseline) {
          restored = true;
          break;
        }
      }
      if (restored) {
        toast.style = Toast.Style.Success;
        toast.title = "Restarted";
        // Focus the replacement: the cwd's server whose pid wasn't running
        // before the kill. Falls back to any current server for the cwd in the
        // unlikely case the new pid matches a prior one (pid reuse).
        const sameCwd = serversRef.current.filter((s) => s.cwd === server.cwd);
        const replacement =
          sameCwd.find((s) => !priorPids.has(s.pid)) ?? sameCwd[0];
        if (replacement) setSelectedItemId(String(replacement.pid));
      } else {
        toast.style = Toast.Style.Failure;
        toast.title = "Restart timed out";
        toast.message = `Check ${spawnLogPath(server.cwd)}`;
      }
    } catch (err) {
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

  const visible =
    toolFilter === "all"
      ? servers
      : servers.filter((s) => s.tool === toolFilter);

  // Group by projectKey (git common-dir for git projects, cwd otherwise) so
  // sibling worktrees of the same repo collapse into one section. Each row
  // still carries its own cwd/branch so per-row actions stay correct.
  const grouped = Object.entries(
    visible.reduce(
      (acc, s) => {
        (acc[s.projectKey] ??= []).push(s);
        return acc;
      },
      {} as Record<string, DevServer[]>,
    ),
  );

  return (
    <List
      isLoading={effectiveLoading}
      searchBarPlaceholder="Filter servers..."
      selectedItemId={selectedItemId}
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
      {servers.length === 0 && !effectiveLoading && (
        <List.EmptyView
          title="No Dev Servers Running"
          description={`Refreshing every ${prefs.refreshInterval}s.`}
          actions={
            <ActionPanel>
              <Action
                title="Start Dev Server"
                icon={Icon.Play}
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
      {grouped.map(([projectKey, projectServers]) => (
        <List.Section
          key={projectKey}
          title={
            // When showFullPath is on, use the first row's cwd as a concrete
            // path hint. (For multi-worktree sections the per-row branch tag
            // and its tooltip distinguish which worktree each row belongs to.)
            prefs.showFullPath
              ? projectServers[0].cwd
              : projectServers[0].projectName
          }
          subtitle={`${projectServers.length} server${projectServers.length > 1 ? "s" : ""}`}
        >
          {projectServers.map((server) => (
            <ServerItem
              key={server.pid}
              id={String(server.pid)}
              server={server}
              terminalApp={terminalApp}
              editorApp={editorApp}
              lanIp={lanIp}
              show={show}
              onKill={() => kill(server.pid)}
              onKillProject={() => killProject(projectKey)}
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
