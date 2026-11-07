import {
  environment,
  LaunchType,
  Toast,
  showToast,
  updateCommandMetadata,
} from "@raycast/api";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { IndexingInProgress, indexFolders } from "./jobs";
import { readConfiguration } from "./settings";

export default async function IndexFiles() {
  const config = await readConfiguration();
  const interactive = environment.launchType === LaunchType.UserInitiated;
  if (!config.roots.length && !config.codeRoots.length) {
    await updateCommandMetadata({ subtitle: "Choose Search Folders to start" });
    if (interactive)
      await showToast({
        style: Toast.Style.Failure,
        title: "Choose Search Folders First",
      });
    return;
  }
  const abort = new AbortController();
  const toast = interactive
    ? await showToast({
        style: Toast.Style.Animated,
        title: "Preparing Local Search",
        primaryAction: {
          title: "Stop Indexing",
          onAction: () => abort.abort(),
        },
      })
    : undefined;
  try {
    let failures = 0;
    let pending = 0;
    let unavailable = false;
    let paused = false;
    let pauseReason: string | undefined;
    let scannedDirectories = 0;
    let peakObservedJSHeapBytes = process.memoryUsage().heapUsed;
    await indexFolders(
      config,
      (event) => {
        peakObservedJSHeapBytes = Math.max(
          peakObservedJSHeapBytes,
          process.memoryUsage().heapUsed,
        );
        if (
          toast &&
          event.event === "progress" &&
          typeof event.all_bytes === "number" &&
          typeof event.all_total === "number"
        ) {
          toast.title = "Downloading Local Model";
          toast.message = `${Math.round((event.all_bytes / event.all_total) * 100)}%`;
        } else if (toast && event.event === "verifying") {
          toast.title = "Checking Local Model";
        } else if (
          toast &&
          event.event === "waiting" &&
          event.for !== "model"
        ) {
          toast.message = "Waiting for a connection…";
        } else if (
          toast &&
          (event.event === "file" || event.event === "sync")
        ) {
          toast.title = "Indexing Search Folders";
          if (typeof event.searchable === "number")
            toast.message = `${event.searchable} files searchable`;
        }
        if (
          event.event === "summary" &&
          event.states &&
          typeof event.states === "object"
        ) {
          failures += Number(
            (event.states as Record<string, unknown>).failed ?? 0,
          );
        }
        if (event.event === "missing")
          unavailable ||=
            (Array.isArray(event.folders) && event.folders.length > 0) ||
            (Array.isArray(event.unreadable) && event.unreadable.length > 0);
        if (typeof event.pending === "number")
          pending = event.pending + Number(event.code_pending ?? 0);
        if (event.event === "paused" || event.event === "power_paused")
          paused = true;
        if (event.event === "power_paused" && typeof event.reason === "string")
          pauseReason = event.reason;
        if (
          event.event === "sync" &&
          typeof event.scanned_directories === "number"
        )
          scannedDirectories += event.scanned_directories;
      },
      abort.signal,
    );
    writeFileSync(
      join(config.index, "last-run.json"),
      JSON.stringify({
        completedAt: new Date().toISOString(),
        launchType: environment.launchType,
        paused,
        pauseReason,
        pending,
        scannedDirectories,
        failures,
        unavailable,
        peakObservedJSHeapBytes,
      }) + "\n",
    );
    if (paused && !failures && !unavailable) {
      await updateCommandMetadata({
        subtitle: pauseReason
          ? `Paused · ${pauseReason}`
          : "Taking a break · resumes every 5 min",
      });
      if (toast) {
        toast.style = Toast.Style.Success;
        toast.title = "Indexing Taking a Break";
        toast.message = pauseReason
          ? `${pauseReason}. Progress saved; checks again automatically.`
          : "Progress saved. Continues automatically in short passes.";
        toast.primaryAction = { title: "Done", onAction: () => toast.hide() };
      }
      return;
    }
    if (failures || pending || unavailable)
      throw new Error(
        `${failures} failed · ${pending} pending${unavailable ? " · a folder is unavailable" : ""}`,
      );
    writeFileSync(
      join(config.index, "last-update.json"),
      JSON.stringify({
        completedAt: new Date().toISOString(),
        launchType: environment.launchType,
      }) + "\n",
    );
    await updateCommandMetadata({ subtitle: "Auto-update every 5 min" });
    if (toast) {
      toast.style = Toast.Style.Success;
      toast.title = "Search Index Updated";
      toast.message = "Automatic updates check for changes every five minutes.";
      toast.primaryAction = { title: "Done", onAction: () => toast.hide() };
    }
  } catch (error) {
    if (error instanceof IndexingInProgress) {
      if (toast) {
        toast.style = Toast.Style.Success;
        toast.title = "Indexing Already Running";
      }
      return;
    }
    await updateCommandMetadata({
      subtitle: abort.signal.aborted
        ? "Stopped · retries automatically"
        : "Index needs attention · retrying automatically",
    });
    if (!toast) throw error;
    toast.style = Toast.Style.Failure;
    toast.title = abort.signal.aborted ? "Indexing Stopped" : "Unable to Index";
    toast.message =
      error instanceof Error ? error.message : "Try indexing again.";
  }
}
