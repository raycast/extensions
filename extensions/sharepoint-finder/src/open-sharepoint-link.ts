import {
  BrowserExtension,
  Clipboard,
  Toast,
  open,
  showInFinder,
  showToast,
} from "@raycast/api";
import { readdir, stat } from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";
import {
  parseSharePointLocation,
  rankLocalLibraries,
  rankSharedLibraryRoots,
  toLocalPath,
} from "./sharepoint";

export default async function Command(): Promise<void> {
  try {
    const tabs = await BrowserExtension.getTabs();
    const activeSharePointTab = tabs.find((tab) => {
      if (!tab.active) return false;
      try {
        return new URL(tab.url).hostname.endsWith(".sharepoint.com");
      } catch {
        return false;
      }
    });

    if (!activeSharePointTab) {
      throw new Error("Open the SharePoint folder in your browser first");
    }

    const location = parseSharePointLocation(activeSharePointTab.url);
    const cloudStoragePath = path.join(homedir(), "Library", "CloudStorage");
    const cloudEntries = await readdir(cloudStoragePath, {
      withFileTypes: true,
    });
    const sharedLibraryRoots = rankSharedLibraryRoots(
      cloudEntries
        .filter((entry) => entry.isDirectory())
        .map((entry) => entry.name),
      location.tenantName,
    );

    if (sharedLibraryRoots.length === 0) {
      throw new Error("No OneDrive synced SharePoint libraries were found");
    }

    const candidates = [];
    for (const rootName of sharedLibraryRoots) {
      const rootPath = path.join(cloudStoragePath, rootName);
      const entries = await readdir(rootPath, { withFileTypes: true });
      const rankedLibraries = rankLocalLibraries(
        entries
          .filter((entry) => entry.isDirectory())
          .map((entry) => entry.name),
        location,
      );
      for (const libraryName of rankedLibraries) {
        candidates.push({
          libraryName,
          localPath: toLocalPath(
            rootPath,
            libraryName,
            location.relativeSegments,
          ),
        });
      }
    }

    if (candidates.length === 0) {
      throw new Error(`No synced library matches ${location.siteSlug}`);
    }

    for (const candidate of candidates) {
      try {
        const itemStats = await stat(candidate.localPath);
        if (itemStats.isDirectory()) await open(candidate.localPath);
        else await showInFinder(candidate.localPath);
        return;
      } catch {
        // The item does not exist in this candidate library, so try the next one.
      }
    }

    throw new Error(
      `The item is not available in ${candidates[0].libraryName}`,
    );
  } catch (error) {
    console.error("SharePoint Finder failed", error);
    const message = error instanceof Error ? error.message : String(error);
    await showToast({
      style: Toast.Style.Failure,
      title: "Couldn’t open SharePoint folder",
      message,
      primaryAction: {
        title: "Copy Full Error",
        onAction: async (toast) => {
          await Clipboard.copy(message);
          await toast.hide();
        },
      },
    });
  }
}
