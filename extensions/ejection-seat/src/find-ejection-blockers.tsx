import {
  Action,
  ActionPanel,
  Clipboard,
  Color,
  Icon,
  Keyboard,
  List,
  closeMainWindow,
  useNavigation,
  open,
  launchCommand,
  LaunchType,
  showToast,
  Toast,
} from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useState } from "react";
import { execFile } from "node:child_process";
import { readdir, stat } from "node:fs/promises";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const LSOF_TIMEOUT_MS = 8_000;
const EJECT_TIMEOUT_MS = 30_000;
const MAX_DETAIL_REFERENCES = 12;

type Volume = {
  name: string;
  mountPoint: string;
};

type OpenFile = {
  descriptor: string;
  type?: string;
  path?: string;
  access?: string;
  lock?: string;
};

type AppBundle = {
  path: string;
  name: string;
};

type Blocker = {
  pid: string;
  command?: string;
  user?: string;
  files: OpenFile[];
  app?: AppBundle;
};

type Scan = {
  volume: Volume;
  blockers: Blocker[];
  error?: string;
};

type ExecError = Error & {
  code?: number | string;
  stdout?: string | Buffer;
  stderr?: string | Buffer;
  killed?: boolean;
};

function bufferToString(value: string | Buffer | undefined): string {
  return typeof value === "string" ? value : (value?.toString("utf8") ?? "");
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

async function showFailure(title: string, error: unknown): Promise<void> {
  const message = errorMessage(error);
  await showToast({
    style: Toast.Style.Failure,
    title,
    message,
    primaryAction: {
      title: "Copy Error",
      onAction: async () => {
        await Clipboard.copy(message);
      },
    },
  });
}

/* -------------------------------------------------------------------------- */
/* Reference classification                                                   */
/* -------------------------------------------------------------------------- */

// Lower weight means the reference is more likely to be what actually holds the
// volume. lsof distinguishes a process that merely has its working directory on
// the volume from one holding a regular file open for writing; only the latter
// reliably vetoes an eject.
const REFERENCE_KINDS = {
  write: { label: "Open for writing", weight: 0 },
  read: { label: "Open file", weight: 1 },
  directory: { label: "Open directory", weight: 2 },
  program: { label: "Program text", weight: 3 },
  mapped: { label: "Memory-mapped file", weight: 3 },
  workingDirectory: { label: "Working directory", weight: 4 },
} as const;

type ReferenceKind = keyof typeof REFERENCE_KINDS;

function referenceKind(file: OpenFile): ReferenceKind {
  if (file.descriptor === "cwd" || file.descriptor === "rtd") return "workingDirectory";
  if (file.descriptor === "txt") return "program";
  if (file.descriptor === "mem") return "mapped";
  if (file.type === "DIR") return "directory";
  if (file.access === "w" || file.access === "u") return "write";
  return "read";
}

function weightOf(blocker: Blocker): number {
  return Math.min(...blocker.files.map((file) => REFERENCE_KINDS[referenceKind(file)].weight));
}

/* -------------------------------------------------------------------------- */
/* Volume discovery                                                           */
/* -------------------------------------------------------------------------- */

async function volumes(): Promise<Volume[]> {
  const volumesDirectory = await stat("/Volumes");
  const entries = await readdir("/Volumes", { withFileTypes: true });

  const mountedVolumes = await Promise.all(
    entries
      .filter((entry) => entry.isDirectory())
      .map(async (entry) => {
        const mountPoint = `/Volumes/${entry.name}`;

        try {
          // macOS retains an empty directory for some formerly mounted volumes. Its
          // device matches /Volumes, so never pass it to lsof as a filesystem root.
          return (await stat(mountPoint)).dev === volumesDirectory.dev ? undefined : { name: entry.name, mountPoint };
        } catch {
          return undefined;
        }
      }),
  );

  return mountedVolumes
    .filter((volume): volume is Volume => volume !== undefined)
    .sort((left, right) => left.name.localeCompare(right.name));
}

/* -------------------------------------------------------------------------- */
/* lsof                                                                       */
/* -------------------------------------------------------------------------- */

async function lsof(mountPoint: string): Promise<string> {
  try {
    const { stdout } = await execFileAsync("/usr/sbin/lsof", ["-b", "-nP", "-F0pcLuafltn", "--", mountPoint], {
      encoding: "utf8",
      timeout: LSOF_TIMEOUT_MS,
      maxBuffer: 10 * 1024 * 1024,
    });
    return bufferToString(stdout);
  } catch (error) {
    const execution = error as ExecError;

    // lsof uses 1 to mean that it found no matching open files.
    if (execution.code === 1) return bufferToString(execution.stdout);
    if (execution.killed) throw new Error("The scan timed out. Try again after the volume becomes responsive.");

    const message = bufferToString(execution.stderr).trim() || execution.message;
    throw new Error(message);
  }
}

function parseLsof(output: string): Blocker[] {
  const blockers: Blocker[] = [];
  let blocker: Blocker | undefined;
  let file: OpenFile | undefined;

  for (const untrimmedField of output.split("\0")) {
    const field = untrimmedField.replace(/^\n+/, "");
    if (!field) continue;

    const key = field[0];
    const value = field.slice(1);

    if (key === "p") {
      blocker = { pid: value, files: [] };
      blockers.push(blocker);
      file = undefined;
      continue;
    }

    if (!blocker) continue;

    switch (key) {
      case "c":
        blocker.command = value;
        break;
      case "L":
        blocker.user = value;
        break;
      case "u":
        blocker.user ??= value;
        break;
      case "f":
        file = { descriptor: value };
        blocker.files.push(file);
        break;
      case "t":
        if (file) file.type = value;
        break;
      case "n":
        if (file) file.path = value;
        break;
      case "a":
        if (file) file.access = value;
        break;
      case "l":
        if (file) file.lock = value;
        break;
    }
  }

  return blockers.filter((item) => item.files.length > 0);
}

/* -------------------------------------------------------------------------- */
/* PID -> application bundle                                                  */
/* -------------------------------------------------------------------------- */

// `ps -o comm=` prints the full executable path on macOS, so the enclosing app
// bundle is recoverable without any private API. Take the OUTERMOST bundle: a
// helper nested inside an app (…/Foo.app/Contents/…/FooHelper.app/…) should
// still activate Foo, which is the window the user can actually close.
function bundleFor(executablePath: string): AppBundle | undefined {
  const match = /^(.*?\.app)\/Contents\//.exec(executablePath);
  if (!match) return undefined;

  const path = match[1];
  const name = path.slice(path.lastIndexOf("/") + 1, -".app".length);
  return { path, name };
}

async function appBundles(pids: string[]): Promise<Map<string, AppBundle>> {
  const bundles = new Map<string, AppBundle>();
  if (pids.length === 0) return bundles;

  let stdout = "";
  try {
    stdout = bufferToString((await execFileAsync("/bin/ps", ["-o", "pid=,comm=", "-p", pids.join(",")])).stdout);
  } catch (error) {
    // ps exits non-zero when every requested pid has already gone away; it still
    // prints whatever it did resolve.
    stdout = bufferToString((error as ExecError).stdout);
  }

  for (const line of stdout.split("\n")) {
    const separator = line.trim().indexOf(" ");
    if (separator < 0) continue;

    const pid = line.trim().slice(0, separator);
    const bundle = bundleFor(line.trim().slice(separator + 1));
    if (bundle) bundles.set(pid, bundle);
  }

  return bundles;
}

/* -------------------------------------------------------------------------- */
/* Advice for well-known macOS services                                       */
/* -------------------------------------------------------------------------- */

type Advice = {
  title: string;
  message: string;
  icon: Icon;
  system: boolean;
};

const SYSTEM_ADVICE: Record<string, Advice> = {
  QuickLookUIService: {
    title: "Quick Look Preview",
    message:
      "Close Quick Look windows and Finder preview panes, then refresh. Quick Look is a shared macOS service, so macOS does not reveal which app requested this preview.",
    icon: Icon.Eye,
    system: true,
  },
  quicklookd: {
    title: "Quick Look Daemon",
    message: "Close Quick Look windows and Finder preview panes, then refresh.",
    icon: Icon.Eye,
    system: true,
  },
  mds: { title: "Spotlight Indexing", message: "", icon: Icon.MagnifyingGlass, system: true },
  mds_stores: { title: "Spotlight Indexing", message: "", icon: Icon.MagnifyingGlass, system: true },
  mdworker: { title: "Spotlight Indexing", message: "", icon: Icon.MagnifyingGlass, system: true },
  mdworker_shared: { title: "Spotlight Indexing", message: "", icon: Icon.MagnifyingGlass, system: true },
  fseventsd: {
    title: "Filesystem Events",
    message: "macOS keeps this open on every mounted volume. It does not prevent ejection and cannot be quit.",
    icon: Icon.Clock,
    system: true,
  },
  revisiond: {
    title: "Document Versions",
    message: "macOS keeps this open on every mounted volume. It does not prevent ejection and cannot be quit.",
    icon: Icon.Clock,
    system: true,
  },
  backupd: {
    title: "Time Machine",
    message: "A Time Machine backup is using this volume. Wait for it to finish, or skip this backup in Settings.",
    icon: Icon.ArrowClockwise,
    system: true,
  },
};

const SPOTLIGHT_MESSAGE =
  "Spotlight is indexing this volume. Let it finish, or add the volume to Spotlight Privacy if it should not be indexed. Killing the worker only causes macOS to start another one.";

function processAdvice(blocker: Blocker): Advice {
  const known = blocker.command ? SYSTEM_ADVICE[blocker.command] : undefined;
  if (known) return { ...known, message: known.message || SPOTLIGHT_MESSAGE };

  if (blocker.command === "Finder") {
    return {
      title: "Finder",
      message: "Close any Finder window or tab showing this volume, then refresh.",
      icon: Icon.Finder,
      system: false,
    };
  }

  if (blocker.app) {
    return {
      title: blocker.app.name,
      message:
        "This app has filesystem references on the volume. Bring it forward and close the open documents, or quit it, then refresh the scan.",
      icon: Icon.AppWindow,
      system: false,
    };
  }

  return {
    title: blocker.command || "Unknown Process",
    message:
      "This process has one or more filesystem references on the volume. Quit it normally if possible, then refresh the scan.",
    icon: Icon.ExclamationMark,
    system: false,
  };
}

/* -------------------------------------------------------------------------- */
/* Scanning                                                                   */
/* -------------------------------------------------------------------------- */

async function scanVolume(volume: Volume): Promise<Scan> {
  try {
    const blockers = parseLsof(await lsof(volume.mountPoint));
    const bundles = await appBundles(blockers.map((blocker) => blocker.pid));

    for (const blocker of blockers) blocker.app = bundles.get(blocker.pid);

    blockers.sort((left, right) => {
      const bySystem = Number(processAdvice(left).system) - Number(processAdvice(right).system);
      if (bySystem !== 0) return bySystem;

      const byWeight = weightOf(left) - weightOf(right);
      if (byWeight !== 0) return byWeight;

      return processAdvice(left).title.localeCompare(processAdvice(right).title);
    });

    return { volume, blockers };
  } catch (error) {
    return { volume, blockers: [], error: errorMessage(error) };
  }
}

async function scanAll(): Promise<Scan[]> {
  return Promise.all((await volumes()).map(scanVolume));
}

/* -------------------------------------------------------------------------- */
/* Volume actions                                                             */
/* -------------------------------------------------------------------------- */

// Disk Arbitration names the process that actually vetoed the unmount. That is
// authoritative in a way an lsof snapshot never is, so parse it out of the
// failure text: `Unmount was dissented by PID 123 (Foo)`.
// Greedy on the name: a process name may itself contain ")", and `.` cannot cross
// the newline, so this stays bounded to the one line diskutil printed.
const DISSENTER = /dissented by PID (\d+) \((.*)\)/i;

// onEjected and onFailed are deliberately separate: a failed eject must NOT pop the
// blocker list, because the toast that names the vetoing process (and offers to
// activate it) is useless if the view showing that process's actions is already gone.
async function ejectVolume(volume: Volume, onEjected: () => void, onFailed: () => void): Promise<void> {
  const toast = await showToast({ style: Toast.Style.Animated, title: `Ejecting ${volume.name}` });

  try {
    // Deliberately NOT `force` — this is the same request Finder makes, so a real
    // blocker still refuses and we surface why.
    await execFileAsync("/usr/sbin/diskutil", ["eject", volume.mountPoint], { timeout: EJECT_TIMEOUT_MS });
    toast.style = Toast.Style.Success;
    toast.title = `Ejected ${volume.name}`;
    onEjected();
  } catch (error) {
    const execution = error as ExecError;
    const detail = execution.killed
      ? "diskutil did not respond."
      : [bufferToString(execution.stdout), bufferToString(execution.stderr)].join("\n").trim() || execution.message;

    await toast.hide();

    const dissenter = DISSENTER.exec(detail);
    if (!dissenter) {
      await showFailure(`Could not eject ${volume.name}`, new Error(detail));
      onFailed();
      return;
    }

    const [, pid, name] = dissenter;
    const app = (await appBundles([pid])).get(pid);
    await showToast({
      style: Toast.Style.Failure,
      title: `Could not eject ${volume.name}`,
      message: `Blocked by ${name} (PID ${pid})`,
      primaryAction: {
        title: "Copy Error",
        onAction: async () => {
          await Clipboard.copy(detail);
        },
      },
      secondaryAction: app ? { title: `Activate ${app.name}`, onAction: () => activateApp(app) } : undefined,
    });
    onFailed();
  }
}

async function activateApp(app: AppBundle): Promise<void> {
  try {
    await closeMainWindow();
    await open(app.path);
  } catch (error) {
    await showFailure(`Could not activate ${app.name}`, error);
  }
}

async function quitApp(app: AppBundle, onQuit: () => void): Promise<void> {
  try {
    // argv form: the bundle path never reaches the AppleScript source text.
    await execFileAsync("/usr/bin/osascript", [
      "-e",
      "on run argv",
      "-e",
      "tell application (item 1 of argv) to quit",
      "-e",
      "end run",
      "--",
      app.path,
    ]);
    await showToast({ style: Toast.Style.Success, title: `Asked ${app.name} to quit` });
    onQuit();
  } catch (error) {
    await showFailure(`Could not quit ${app.name}`, error);
  }
}

async function openKillProcess(): Promise<void> {
  try {
    await launchCommand({
      ownerOrAuthorName: "rolandleth",
      extensionName: "kill-process",
      name: "index",
      type: LaunchType.UserInitiated,
    });
  } catch (error) {
    await showFailure("Could not open Kill Process", error);
  }
}

async function openEjectAllDisks(): Promise<void> {
  try {
    await launchCommand({
      ownerOrAuthorName: "raycast",
      extensionName: "system-actions",
      name: "eject-all-disks",
      type: LaunchType.UserInitiated,
    });
  } catch (error) {
    await showFailure("Could not open Eject All Disks", error);
  }
}

/* -------------------------------------------------------------------------- */
/* Presentation helpers                                                       */
/* -------------------------------------------------------------------------- */

function relativePath(path: string | undefined, mountPoint: string): string {
  if (!path) return "Path unavailable";
  return path.startsWith(`${mountPoint}/`) ? path.slice(mountPoint.length + 1) : path;
}

function referenceSummary(blocker: Blocker): { text: string; color?: Color } {
  const kinds = blocker.files.map(referenceKind);

  const writes = kinds.filter((kind) => kind === "write").length;
  if (writes > 0) {
    return { text: writes === 1 ? "1 file open for writing" : `${writes} files open for writing`, color: Color.Red };
  }

  const opens = kinds.filter((kind) => kind === "read" || kind === "directory").length;
  if (opens > 0) {
    return { text: opens === 1 ? "1 file open" : `${opens} files open`, color: Color.Orange };
  }

  if (kinds.includes("program") || kinds.includes("mapped")) return { text: "Mapped into memory" };
  return { text: "Working directory only" };
}

function sectionFor(blocker: Blocker): string {
  if (processAdvice(blocker).system) return "System Services";
  return weightOf(blocker) <= 1 ? "Likely Blockers" : "Other References";
}

const SECTION_ORDER = ["Likely Blockers", "Other References", "System Services"];

/* -------------------------------------------------------------------------- */
/* Views                                                                      */
/* -------------------------------------------------------------------------- */

function BlockerDetail({ blocker, mountPoint }: { blocker: Blocker; mountPoint: string }) {
  const advice = processAdvice(blocker);
  const files = [...blocker.files].sort(
    (left, right) => REFERENCE_KINDS[referenceKind(left)].weight - REFERENCE_KINDS[referenceKind(right)].weight,
  );
  const shown = files.slice(0, MAX_DETAIL_REFERENCES);
  const hidden = files.length - shown.length;

  return (
    <List.Item.Detail
      markdown={`## ${advice.title}\n\n${advice.message}`}
      metadata={
        <List.Item.Detail.Metadata>
          {blocker.app ? (
            <List.Item.Detail.Metadata.Label
              title="Application"
              text={blocker.app.name}
              icon={{ fileIcon: blocker.app.path }}
            />
          ) : null}
          <List.Item.Detail.Metadata.Label title="Process" text={blocker.command || "Unknown"} />
          <List.Item.Detail.Metadata.Label title="PID" text={blocker.pid} />
          {blocker.user ? <List.Item.Detail.Metadata.Label title="User" text={blocker.user} /> : null}
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.Label
            title="References"
            text={files.length === 1 ? "1 reference" : `${files.length} references`}
          />
          {shown.map((file, index) => (
            <List.Item.Detail.Metadata.Label
              key={`${file.descriptor}-${index}`}
              title={REFERENCE_KINDS[referenceKind(file)].label}
              text={relativePath(file.path, mountPoint)}
            />
          ))}
          {hidden > 0 ? (
            <List.Item.Detail.Metadata.Label
              title=""
              text={hidden === 1 ? "1 more reference not shown" : `${hidden} more references not shown`}
            />
          ) : null}
        </List.Item.Detail.Metadata>
      }
    />
  );
}

function BlockerActions({
  blocker,
  volume,
  onRefresh,
  onEjected,
  onToggleDetail,
}: {
  blocker: Blocker;
  volume: Volume;
  onRefresh: () => void;
  onEjected: () => void;
  onToggleDetail: () => void;
}) {
  const app = blocker.app;
  const firstPath = blocker.files.find((file) => file.path)?.path;
  const allPaths = blocker.files
    .map((file) => file.path)
    .filter((path): path is string => Boolean(path))
    .join("\n");

  return (
    <ActionPanel>
      <ActionPanel.Section>
        {app ? (
          <Action title={`Activate ${app.name}`} icon={{ fileIcon: app.path }} onAction={() => activateApp(app)} />
        ) : null}
        {firstPath ? <Action.ShowInFinder path={firstPath} /> : null}
        <Action
          title="Refresh Scan"
          icon={Icon.ArrowClockwise}
          shortcut={Keyboard.Shortcut.Common.Refresh}
          onAction={onRefresh}
        />
        <Action
          title="Toggle Details"
          icon={Icon.Sidebar}
          shortcut={{ modifiers: ["cmd", "shift"], key: "enter" }}
          onAction={onToggleDetail}
        />
        <Action.CopyToClipboard
          title="Copy Process ID"
          content={blocker.pid}
          shortcut={Keyboard.Shortcut.Common.Copy}
        />
        {allPaths ? (
          <Action.CopyToClipboard
            title="Copy All Referenced Paths"
            content={allPaths}
            shortcut={Keyboard.Shortcut.Common.CopyPath}
          />
        ) : null}
      </ActionPanel.Section>
      <ActionPanel.Section title="Resolve">
        {app ? (
          <Action title={`Quit ${app.name}`} icon={Icon.XMarkCircle} onAction={() => quitApp(app, onRefresh)} />
        ) : null}
        <Action
          title="Eject Volume"
          icon={Icon.Eject}
          shortcut={{ modifiers: ["cmd", "shift"], key: "e" }}
          onAction={() => ejectVolume(volume, onEjected, onRefresh)}
        />
      </ActionPanel.Section>
      <ActionPanel.Section title="Other Commands">
        <Action title="Open Kill Process" icon={Icon.XMarkCircle} onAction={openKillProcess} />
        <Action title="Open Eject All Disks" icon={Icon.Eject} onAction={openEjectAllDisks} />
      </ActionPanel.Section>
    </ActionPanel>
  );
}

function BlockerList({ volume, onVolumesChanged }: { volume: Volume; onVolumesChanged: () => void }) {
  const { pop } = useNavigation();
  const { data, isLoading, revalidate } = usePromise(scanVolume, [volume]);
  const [isShowingDetail, setIsShowingDetail] = useState(true);

  const { blockers, error } = data ?? { blockers: [], error: undefined };

  function onRefresh() {
    revalidate();
    onVolumesChanged();
  }

  function onEjected() {
    onVolumesChanged();
    pop();
  }

  const sections = SECTION_ORDER.map((title) => ({
    title,
    items: blockers.filter((blocker) => sectionFor(blocker) === title),
  })).filter((section) => section.items.length > 0);

  return (
    <List
      isLoading={isLoading}
      isShowingDetail={isShowingDetail && blockers.length > 0}
      navigationTitle={volume.name}
      searchBarPlaceholder="Filter processes or paths"
    >
      {error ? (
        <List.EmptyView
          icon={Icon.ExclamationMark}
          title="Could Not Scan This Volume"
          description={error}
          actions={
            <ActionPanel>
              <Action
                title="Refresh Scan"
                icon={Icon.ArrowClockwise}
                shortcut={Keyboard.Shortcut.Common.Refresh}
                onAction={onRefresh}
              />
            </ActionPanel>
          }
        />
      ) : null}
      {!error && !isLoading && blockers.length === 0 ? (
        <List.EmptyView
          icon={Icon.CheckCircle}
          title="No Visible Blockers"
          description="Raycast cannot see files opened by root processes such as Spotlight or Time Machine."
          actions={
            <ActionPanel>
              <ActionPanel.Section>
                <Action.ShowInFinder path={volume.mountPoint} />
                <Action
                  title="Refresh Scan"
                  icon={Icon.ArrowClockwise}
                  shortcut={Keyboard.Shortcut.Common.Refresh}
                  onAction={onRefresh}
                />
              </ActionPanel.Section>
              <ActionPanel.Section title="Resolve">
                <Action
                  title="Eject Volume"
                  icon={Icon.Eject}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "e" }}
                  onAction={() => ejectVolume(volume, onEjected, onRefresh)}
                />
              </ActionPanel.Section>
            </ActionPanel>
          }
        />
      ) : null}
      {sections.map((section) => (
        <List.Section key={section.title} title={section.title} subtitle={String(section.items.length)}>
          {section.items.map((blocker) => {
            const advice = processAdvice(blocker);
            const summary = referenceSummary(blocker);

            return (
              <List.Item
                key={blocker.pid}
                icon={blocker.app ? { fileIcon: blocker.app.path } : advice.icon}
                title={advice.title}
                subtitle={`PID ${blocker.pid}${blocker.user ? ` · ${blocker.user}` : ""}`}
                keywords={[blocker.command ?? "", ...blocker.files.map((file) => file.path ?? "")]}
                accessories={[{ tag: { value: summary.text, color: summary.color ?? Color.SecondaryText } }]}
                detail={<BlockerDetail blocker={blocker} mountPoint={volume.mountPoint} />}
                actions={
                  <BlockerActions
                    blocker={blocker}
                    volume={volume}
                    onRefresh={onRefresh}
                    onEjected={onEjected}
                    onToggleDetail={() => setIsShowingDetail((showing) => !showing)}
                  />
                }
              />
            );
          })}
        </List.Section>
      ))}
    </List>
  );
}

function volumeAccessory(scan: Scan, isLoading: boolean): List.Item.Accessory[] {
  if (scan.error) return [{ tag: { value: "Scan failed", color: Color.Red } }];
  if (isLoading) return [];

  const likely = scan.blockers.filter((blocker) => weightOf(blocker) <= 1).length;
  if (likely > 0) {
    return [{ tag: { value: likely === 1 ? "1 likely blocker" : `${likely} likely blockers`, color: Color.Red } }];
  }

  const others = scan.blockers.length;
  if (others > 0) {
    return [{ tag: { value: others === 1 ? "1 other reference" : `${others} other references`, color: Color.Orange } }];
  }

  return [{ tag: { value: "No visible blockers", color: Color.SecondaryText } }];
}

export default function Command() {
  const { data, isLoading, error, revalidate } = usePromise(scanAll);

  if (error) {
    return (
      <List>
        <List.EmptyView
          icon={Icon.ExclamationMark}
          title="Could Not List Mounted Volumes"
          description={error.message}
        />
      </List>
    );
  }

  const scans = data ?? [];
  return (
    <List isLoading={isLoading} searchBarPlaceholder="Select a mounted volume to inspect">
      {!isLoading && scans.length === 0 ? (
        <List.EmptyView
          icon={Icon.HardDrive}
          title="No Mounted Volumes"
          description="Nothing is currently mounted under /Volumes."
        />
      ) : null}
      {scans.map((scan) => (
        <List.Item
          key={scan.volume.mountPoint}
          icon={{ fileIcon: scan.volume.mountPoint }}
          title={scan.volume.name}
          subtitle={scan.volume.mountPoint}
          accessories={volumeAccessory(scan, isLoading)}
          actions={
            <ActionPanel>
              <ActionPanel.Section>
                <Action.Push
                  title="Find Ejection Blockers"
                  icon={Icon.MagnifyingGlass}
                  target={<BlockerList volume={scan.volume} onVolumesChanged={revalidate} />}
                />
                <Action.ShowInFinder path={scan.volume.mountPoint} />
                <Action
                  title="Refresh All Scans"
                  icon={Icon.ArrowClockwise}
                  shortcut={Keyboard.Shortcut.Common.Refresh}
                  onAction={revalidate}
                />
              </ActionPanel.Section>
              <ActionPanel.Section title="Resolve">
                <Action
                  title="Eject Volume"
                  icon={Icon.Eject}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "e" }}
                  onAction={() => ejectVolume(scan.volume, revalidate, revalidate)}
                />
                <Action title="Open Eject All Disks" icon={Icon.Eject} onAction={openEjectAllDisks} />
              </ActionPanel.Section>
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
