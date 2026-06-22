import {
  getPreferenceValues,
  getSelectedFinderItems,
  showToast,
  Toast,
} from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import fs from "fs";
import path from "path";
import os from "os";
import simpleGit from "simple-git";
import {
  fetchMetadata,
  loadJson,
  requireBlogPath,
  expandTilde,
  ReadingEntry,
} from "./utils";
import { parseInbox, buildEntry, mergeEntries } from "./utils/sync";

interface Preferences {
  blogPath: string;
  dataPath: string;
  inboxPath: string;
  autoPush: boolean;
}

/** Resolve the inbox file: selected Finder item first, else the configured fallback. */
async function resolveInputPath(fallback: string): Promise<string> {
  try {
    const items = await getSelectedFinderItems();
    if (items.length > 0) return items[0].path;
  } catch (e) {
    // No Finder selection / Finder not frontmost — fall back to preference.
  }
  return fallback;
}

export default async function Command() {
  const preferences = getPreferenceValues<Preferences>();

  try {
    const blogPath = requireBlogPath(preferences.blogPath);
    const dataPath = preferences.dataPath || "data/reading.json";

    const fallbackInbox = expandTilde(
      preferences.inboxPath || "~/rlog/inbox.jsonl",
    );
    const inputPath = await resolveInputPath(fallbackInbox);

    if (!fs.existsSync(inputPath)) {
      await showToast({
        style: Toast.Style.Failure,
        title: "No inbox file",
        message: inputPath,
      });
      return;
    }

    await showToast({ style: Toast.Style.Animated, title: "Parsing inbox..." });

    const { captures, malformed } = parseInbox(
      fs.readFileSync(inputPath, "utf-8"),
    );

    if (captures.length === 0) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Nothing to sync",
        message:
          malformed > 0 ? `${malformed} malformed line(s)` : "Inbox empty",
      });
      return;
    }

    await showToast({
      style: Toast.Style.Animated,
      title: `Enriching ${captures.length} entries...`,
    });

    // Enrich each capture with fetched metadata (in parallel).
    const enriched: ReadingEntry[] = await Promise.all(
      captures.map(async (cap) =>
        buildEntry(cap, await fetchMetadata(cap.url)),
      ),
    );

    // Merge into reading.json: dedup-by-URL (normalised) + re-sort newest-first.
    const fullPath = path.join(blogPath, dataPath);
    const existing = loadJson<ReadingEntry>(fullPath);
    const { merged, added, duplicates } = mergeEntries(existing, enriched);

    if (added === 0) {
      await showToast({
        style: Toast.Style.Success,
        title: "Nothing new",
        message: `${duplicates} duplicate(s), ${malformed} malformed`,
      });
      await archiveInput(inputPath);
      return;
    }

    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    fs.writeFileSync(fullPath, JSON.stringify(merged, null, 2));

    // Commit and (optionally) push via the same simpleGit pattern as log-read.
    const git = simpleGit(blogPath);
    await git.add(dataPath);
    await git.commit(`Sync ${added} reading entries`);
    if (preferences.autoPush) {
      await showToast({ style: Toast.Style.Animated, title: "Pushing..." });
      await git.push();
    }

    await archiveInput(inputPath);

    await showToast({
      style: Toast.Style.Success,
      title: `Synced ${added} entries`,
      message: `${duplicates} duplicate(s), ${malformed} malformed${preferences.autoPush ? ", pushed" : ""}`,
    });
  } catch (error) {
    await showFailureToast(error, { title: "Failed to sync" });
  }
}

/** Move the consumed inbox file into ~/rlog/processed/<timestamp>.jsonl. */
async function archiveInput(inputPath: string): Promise<void> {
  const processedDir = path.join(os.homedir(), "rlog", "processed");
  fs.mkdirSync(processedDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const dest = path.join(processedDir, `${stamp}.jsonl`);
  try {
    fs.renameSync(inputPath, dest);
  } catch (e) {
    // Cross-volume move (e.g. file on an external/AirDrop volume): copy then delete.
    fs.copyFileSync(inputPath, dest);
    fs.unlinkSync(inputPath);
  }
}
