import {
  Action,
  ActionPanel,
  Alert,
  Clipboard,
  Icon,
  Keyboard,
  LaunchType,
  Toast,
  closeMainWindow,
  confirmAlert,
  launchCommand,
  openExtensionPreferences,
  showToast,
  trash,
} from "@raycast/api";
import type { RepoIndexController } from "../hooks/useRepoIndex";
import { getConfig } from "../lib/config";
import { git } from "../lib/git";
import { OffloadBlockedError, offloadRepo, restoreOffloaded } from "../lib/offload";
import {
  OpResult,
  failureReport,
  fetchRepo,
  pullRepo,
  pruneEmptyParents,
  relocateRepo,
  runOnRepos,
  summarizeResults,
} from "../lib/ops";
import { convertProtocol, expectedOriginFor, protocolOf, relativePathForUrl, webUrlFor } from "../lib/remotes";
import { openInTerminal } from "../lib/terminal";
import type { OffloadedRepo, Protocol, Repo, RepoEntry } from "../lib/types";
import { errorMessage, formatBytes } from "../lib/util";
import { RemotesView } from "./RemotesView";

interface ActionContext {
  entry: RepoEntry;
  ctl: RepoIndexController;
  showDetail: boolean;
  setShowDetail: (value: boolean) => void;
}

/** Failure that carries its own toast action (e.g. “Copy Failures” with a detailed report). */
class OperationFailure extends Error {
  constructor(
    message: string,
    public readonly primaryAction?: Toast.ActionOptions,
  ) {
    super(message);
    this.name = "OperationFailure";
  }
}

async function withToast(title: string, work: (toast: Toast) => Promise<string | void>): Promise<void> {
  const toast = await showToast({ style: Toast.Style.Animated, title });
  try {
    const message = await work(toast);
    toast.style = Toast.Style.Success;
    if (message) toast.message = message;
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = title;
    toast.message = errorMessage(error);
    toast.primaryAction =
      error instanceof OperationFailure && error.primaryAction
        ? error.primaryAction
        : { title: "Copy Error", onAction: () => Clipboard.copy(errorMessage(error)) };
  }
}

function OpenActions({ entry }: { entry: RepoEntry }) {
  const config = getConfig();
  const originUrl = entry.kind === "repo" ? entry.origin?.fetchUrl : entry.originUrl;
  const webUrl = originUrl ? webUrlFor(originUrl) : undefined;
  return (
    <ActionPanel.Section title="Open">
      {entry.kind === "repo" && (
        <Action.Open title="Open in Editor" icon={Icon.Code} target={entry.fullPath} application={config.editorApp} />
      )}
      <Action.ShowInFinder path={entry.fullPath} />
      {entry.kind === "repo" && (
        <Action
          title="Open in Terminal"
          icon={Icon.Terminal}
          shortcut={{ modifiers: ["cmd"], key: "t" }}
          onAction={async () => {
            try {
              await openInTerminal(config.terminalApp, entry.fullPath);
              await closeMainWindow();
            } catch (error) {
              await showToast({
                style: Toast.Style.Failure,
                title: "Could Not Open Terminal",
                message: errorMessage(error),
              });
            }
          }}
        />
      )}
      {webUrl && (
        <Action.OpenInBrowser
          title="Open on Remote Host"
          url={webUrl}
          shortcut={{ modifiers: ["cmd", "shift"], key: "b" }}
        />
      )}
    </ActionPanel.Section>
  );
}

function CopyActions({ entry, showDetail, setShowDetail }: ActionContext) {
  const originUrl = entry.kind === "repo" ? entry.origin?.fetchUrl : entry.originUrl;
  return (
    <ActionPanel.Section title="Info">
      <Action
        title={showDetail ? "Hide Details" : "Show Details"}
        icon={Icon.Sidebar}
        shortcut={{ modifiers: ["cmd"], key: "i" }}
        onAction={() => setShowDetail(!showDetail)}
      />
      <Action.CopyToClipboard title="Copy Path" content={entry.fullPath} shortcut={Keyboard.Shortcut.Common.Copy} />
      {originUrl && (
        <Action.CopyToClipboard
          title="Copy Origin URL"
          content={originUrl}
          shortcut={{ modifiers: ["cmd", "shift"], key: "u" }}
        />
      )}
    </ActionPanel.Section>
  );
}

function SyncActions({ entry, ctl }: ActionContext) {
  if (entry.kind !== "repo" || entry.error) return null;
  const repo = entry;

  const fetchOne = () =>
    withToast(`Fetching ${repo.name}…`, async () => {
      const result = await fetchRepo(repo);
      if (!result.ok) throw new Error(result.error);
      await ctl.reconcile(repo.fullPath);
      return result.skipped ? `Skipped: ${result.skipped}` : "Fetched";
    });

  const pullOne = () =>
    withToast(`Pulling ${repo.name}…`, async () => {
      const result = await pullRepo(repo);
      if (!result.ok) throw new Error(result.error);
      await ctl.reconcile(repo.fullPath);
      return result.skipped ? `Skipped: ${result.skipped}` : "Pulled (fast-forward)";
    });

  const bulk = (verb: string, op: (repo: Repo) => Promise<OpResult>) => () =>
    withToast(`${verb} all repositories…`, async (toast) => {
      const repos = (ctl.index?.entries ?? []).filter((e): e is Repo => e.kind === "repo" && !e.error);
      const results = await runOnRepos(repos, op, getConfig().networkConcurrency, (done, total) => {
        toast.message = `${done}/${total}`;
      });
      await ctl.refreshEntries(repos.map((r) => r.fullPath));
      const { ok, skipped, failed } = summarizeResults(results);
      if (failed.length > 0) {
        throw new OperationFailure(`${ok} ok · ${skipped} skipped · ${failed.length} failed`, {
          title: "Copy Failures",
          onAction: () => Clipboard.copy(failureReport(failed)),
        });
      }
      return `${ok} ok · ${skipped} skipped`;
    });

  return (
    <ActionPanel.Section title="Sync">
      <Action title="Fetch" icon={Icon.ArrowDown} shortcut={{ modifiers: ["opt"], key: "f" }} onAction={fetchOne} />
      <Action
        title="Pull (Fast-Forward)"
        icon={Icon.Download}
        shortcut={{ modifiers: ["opt"], key: "p" }}
        onAction={pullOne}
      />
      <Action
        title="Fetch All"
        icon={Icon.ArrowDown}
        shortcut={{ modifiers: ["opt", "shift"], key: "f" }}
        onAction={bulk("Fetching", fetchRepo)}
      />
      <Action
        title="Pull All"
        icon={Icon.Download}
        shortcut={{ modifiers: ["opt", "shift"], key: "p" }}
        onAction={bulk("Pulling", pullRepo)}
      />
    </ActionPanel.Section>
  );
}

function RemoteActions({ entry, ctl }: ActionContext) {
  if (entry.kind !== "repo" || entry.error) return null;
  const repo = entry;
  const config = getConfig();
  const check = repo.remoteCheck;

  // When fixing a wrong origin, keep the protocol the user already had on it.
  const currentProtocol: Protocol = repo.origin && protocolOf(repo.origin.fetchUrl) === "https" ? "https" : "ssh";
  const fixUrl = expectedOriginFor(repo.relativePath, repo.origin ? currentProtocol : config.defaultProtocol);

  const fixOrigin = async () => {
    if (!fixUrl) return;
    const isAdd = !repo.origin;
    const confirmed = await confirmAlert({
      title: isAdd ? "Add Origin Remote" : "Fix Origin Remote",
      message: isAdd ? `Set origin to\n${fixUrl}` : `Change origin from\n${repo.origin?.fetchUrl}\nto\n${fixUrl}`,
      primaryAction: { title: isAdd ? "Add Origin" : "Fix Origin" },
    });
    if (!confirmed) return;
    await withToast(isAdd ? "Adding origin…" : "Fixing origin…", async () => {
      await git(repo.fullPath, isAdd ? ["remote", "add", "origin", fixUrl] : ["remote", "set-url", "origin", fixUrl]);
      await ctl.reconcile(repo.fullPath);
      return fixUrl;
    });
  };

  const relocate = async () => {
    if (!repo.origin) return;
    const targetRel = relativePathForUrl(repo.origin.fetchUrl);
    if (!targetRel) return;
    const confirmed = await confirmAlert({
      title: "Relocate Repository",
      message: `Move the folder to match its origin:\n${repo.relativePath} → ${targetRel}`,
      primaryAction: { title: "Move Folder" },
    });
    if (!confirmed) return;
    await withToast("Relocating…", async () => {
      const newPath = await relocateRepo(config.root, repo, targetRel);
      await ctl.reconcile(repo.fullPath);
      await ctl.reconcile(newPath);
      return targetRel;
    });
  };

  const switchProtocol = async (to: Protocol) => {
    if (!repo.origin) return;
    const converted = convertProtocol(repo.origin.fetchUrl, to);
    if (!converted) return;
    await withToast(`Switching origin to ${to.toUpperCase()}…`, async () => {
      await git(repo.fullPath, ["remote", "set-url", "origin", converted]);
      await ctl.reconcile(repo.fullPath);
      return converted;
    });
  };

  const otherProtocol: Protocol = currentProtocol === "ssh" ? "https" : "ssh";

  return (
    <ActionPanel.Section title="Remotes">
      <Action.Push
        title="Manage Remotes"
        icon={Icon.Globe}
        shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
        target={<RemotesView repo={repo} onChanged={() => ctl.reconcile(repo.fullPath)} />}
      />
      {(check.state === "mismatch" || check.state === "no-origin" || check.state === "no-remotes") && fixUrl && (
        <Action
          title={repo.origin ? "Fix Origin to Match Location" : "Add Origin from Location"}
          icon={Icon.Wand}
          shortcut={{ modifiers: ["cmd", "shift"], key: "x" }}
          onAction={fixOrigin}
        />
      )}
      {check.state === "mismatch" && repo.origin && (
        <Action
          title="Relocate Folder to Match Origin"
          icon={Icon.ArrowRight}
          shortcut={{ modifiers: ["cmd", "shift"], key: "m" }}
          onAction={relocate}
        />
      )}
      {repo.origin && (
        <Action
          title={`Switch Origin to ${otherProtocol.toUpperCase()}`}
          icon={Icon.Switch}
          shortcut={{ modifiers: ["cmd", "opt"], key: "p" }}
          onAction={() => switchProtocol(otherProtocol)}
        />
      )}
    </ActionPanel.Section>
  );
}

function StorageActions({ entry, ctl }: ActionContext) {
  const offload = async () => {
    if (entry.kind !== "repo") return;
    const confirmed = await confirmAlert({
      title: "Offload Local Copy",
      message:
        "Reponizer verifies that every branch, change, and stash is pushed, then moves the working copy to the Trash. " +
        "A placeholder with the origin URL stays behind so the repo can be re-downloaded anytime.",
      primaryAction: { title: "Offload", style: Alert.ActionStyle.Destructive },
    });
    if (!confirmed) return;
    await withToast(`Offloading ${entry.name}…`, async (toast) => {
      toast.message = "Verifying everything is pushed…";
      let warning: string | undefined;
      try {
        warning = await offloadRepo(entry);
      } catch (error) {
        if (error instanceof OffloadBlockedError) {
          throw new Error(error.problems.join(" · "));
        }
        throw error;
      }
      await ctl.reconcile(entry.fullPath);
      if (warning) return warning;
      return entry.sizeBytes !== undefined ? `Freed ${formatBytes(entry.sizeBytes)}` : "Local copy removed";
    });
  };

  const restore = async (offloaded: OffloadedRepo) => {
    await withToast(`Restoring ${offloaded.name}…`, async (toast) => {
      toast.message = "Cloning from origin…";
      await restoreOffloaded(offloaded);
      await ctl.reconcile(offloaded.fullPath);
      return "Local copy restored";
    });
  };

  const moveToTrash = async () => {
    const isPlaceholder = entry.kind === "offloaded";
    const confirmed = await confirmAlert({
      title: isPlaceholder ? "Delete Offloaded Placeholder" : "Move Repository to Trash",
      message: isPlaceholder
        ? `The placeholder for ${entry.relativePath} will be deleted. The remote repository is not touched.`
        : `${entry.relativePath} will be moved to the Trash, including any uncommitted or unpushed work.`,
      primaryAction: { title: "Move to Trash", style: Alert.ActionStyle.Destructive },
    });
    if (!confirmed) return;
    await withToast(`Trashing ${entry.name}…`, async () => {
      await trash(entry.fullPath);
      await pruneEmptyParents(getConfig().root, entry.fullPath);
      await ctl.reconcile(entry.fullPath);
      return "Moved to Trash";
    });
  };

  return (
    <ActionPanel.Section title="Storage">
      {entry.kind === "repo" && !entry.error && entry.origin && (
        <Action
          title="Offload Local Copy"
          icon={Icon.Cloud}
          shortcut={{ modifiers: ["ctrl", "opt"], key: "o" }}
          onAction={offload}
        />
      )}
      {entry.kind === "offloaded" && !entry.error && (
        <Action
          title="Restore Local Copy"
          icon={Icon.Download}
          shortcut={{ modifiers: ["ctrl", "shift"], key: "r" }}
          onAction={() => restore(entry)}
        />
      )}
      <Action
        title={entry.kind === "offloaded" ? "Delete Placeholder" : "Move to Trash"}
        icon={Icon.Trash}
        style={Action.Style.Destructive}
        shortcut={Keyboard.Shortcut.Common.Remove}
        onAction={moveToTrash}
      />
    </ActionPanel.Section>
  );
}

function IndexActions({ ctl }: ActionContext) {
  return (
    <ActionPanel.Section title="Index">
      <Action
        title="Refresh"
        icon={Icon.ArrowClockwise}
        shortcut={Keyboard.Shortcut.Common.Refresh}
        onAction={() => ctl.refresh()}
      />
      <Action
        title="Refresh with Sizes"
        icon={Icon.HardDrive}
        shortcut={{ modifiers: ["opt", "cmd"], key: "r" }}
        onAction={() => ctl.refresh({ recomputeSizes: true })}
      />
      <Action
        title="Export Repository List"
        icon={Icon.Upload}
        onAction={() => launchCommand({ name: "export-repos", type: LaunchType.UserInitiated })}
      />
      <Action
        title="Import Repository List"
        icon={Icon.Download}
        onAction={() => launchCommand({ name: "import-repos", type: LaunchType.UserInitiated })}
      />
      <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
    </ActionPanel.Section>
  );
}

export function RepoActions(props: ActionContext) {
  return (
    <ActionPanel title={props.entry.relativePath}>
      <OpenActions entry={props.entry} />
      <CopyActions {...props} />
      <SyncActions {...props} />
      <RemoteActions {...props} />
      <StorageActions {...props} />
      <IndexActions {...props} />
    </ActionPanel>
  );
}
