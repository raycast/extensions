import { Clipboard, Toast, showToast } from "@raycast/api";
import { readCachedIndex, rebuildIndex, refreshRepoEntries } from "./cache";
import { getConfig } from "./config";
import { failureReport, OpResult, runOnRepos, summarizeResults } from "./ops";
import type { Repo } from "./types";
import { errorMessage } from "./util";

/** Shared driver for the Fetch All / Pull All no-view commands. */
export async function runBulkCommand(verb: string, op: (repo: Repo) => Promise<OpResult>): Promise<void> {
  const config = getConfig();
  const toast = await showToast({ style: Toast.Style.Animated, title: `${verb} all repositories…` });
  try {
    let index = readCachedIndex(config.root);
    if (!index) {
      toast.message = "Scanning repositories…";
      index = await rebuildIndex(config.root, config.maxDepth, config.defaultProtocol);
    }
    const repos = index.entries.filter((e): e is Repo => e.kind === "repo" && !e.error);
    const results = await runOnRepos(repos, op, config.networkConcurrency, (done, total) => {
      toast.message = `${done}/${total}`;
    });
    toast.message = "Refreshing status…";
    await refreshRepoEntries(
      index,
      repos.map((r) => r.fullPath),
      config.defaultProtocol,
    );
    const { ok, skipped, failed } = summarizeResults(results);
    if (failed.length > 0) {
      toast.style = Toast.Style.Failure;
      toast.title = `${verb} finished with failures`;
      toast.message = `${ok} ok · ${skipped} skipped · ${failed.length} failed`;
      toast.primaryAction = {
        title: "Copy Failures",
        onAction: () => Clipboard.copy(failureReport(failed)),
      };
    } else {
      toast.style = Toast.Style.Success;
      toast.title = `${verb} finished`;
      toast.message = `${ok} ok · ${skipped} skipped`;
    }
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = `${verb} failed`;
    toast.message = errorMessage(error);
  }
}
