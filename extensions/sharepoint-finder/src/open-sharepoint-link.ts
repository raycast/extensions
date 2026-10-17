import {
  BrowserExtension,
  Clipboard,
  Toast,
  environment,
  open,
  showInFinder,
  showToast,
} from "@raycast/api";
import { readdir, stat } from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";
import {
  resolveBrowserTarget,
  type BrowserDiagnostics,
} from "./browser-target";
import { findFilesByName } from "./local-files";
import {
  parseSharePointTarget,
  rankLocalLibraries,
  rankLocalSiteLibraries,
  rankSharedLibraryRoots,
  toLocalPaths,
} from "./sharepoint";

export default async function Command(): Promise<void> {
  let stage = "browser";
  let browserDiagnostics: BrowserDiagnostics | undefined;
  try {
    const activeSharePointTab = await resolveBrowserTarget(
      () => {
        if (!environment.canAccess(BrowserExtension)) {
          throw new Error("Raycast browser extension is not connected");
        }
        return BrowserExtension.getTabs();
      },
      () => Clipboard.readText(),
      (diagnostics) => {
        browserDiagnostics = diagnostics;
        console.info(
          "SharePoint browser diagnostics",
          JSON.stringify(diagnostics),
        );
      },
    );

    stage = "parse-link";
    const target = parseSharePointTarget(
      activeSharePointTab.url,
      activeSharePointTab.title,
    );
    const cloudStoragePath = path.join(homedir(), "Library", "CloudStorage");
    stage = "find-synced-library";
    const cloudEntries = await readdir(cloudStoragePath, {
      withFileTypes: true,
    });
    const sharedLibraryRoots = rankSharedLibraryRoots(
      cloudEntries
        .filter((entry) => entry.isDirectory())
        .map((entry) => entry.name),
      target.tenantName,
    );

    if (sharedLibraryRoots.length === 0) {
      throw new Error("No OneDrive synced SharePoint libraries were found");
    }

    const candidates: { libraryName: string; localPath: string }[] = [];
    for (const rootName of sharedLibraryRoots) {
      const rootPath = path.join(cloudStoragePath, rootName);
      const entries = await readdir(rootPath, { withFileTypes: true });
      const directoryNames = entries
        .filter((entry) => entry.isDirectory())
        .map((entry) => entry.name);
      const rankedLibraries =
        target.kind === "shared-file"
          ? rankLocalSiteLibraries(directoryNames, target.siteSlug)
          : rankLocalLibraries(directoryNames, target);
      for (const libraryName of rankedLibraries) {
        for (const localPath of toLocalPaths(
          rootPath,
          libraryName,
          target.kind === "path" ? target.relativeSegments : [],
        )) {
          candidates.push({ libraryName, localPath });
        }
      }
    }

    if (candidates.length === 0) {
      throw new Error(`No synced library matches ${target.siteSlug}`);
    }

    if (target.kind === "shared-file") {
      stage = "find-synced-file";
      const matches: string[] = [];
      for (const candidate of candidates) {
        matches.push(
          ...(await findFilesByName(
            candidate.localPath,
            target.fileName,
            2 - matches.length,
          )),
        );
        if (matches.length === 2) break;
      }

      if (matches.length === 0) {
        throw new Error(
          `${target.fileName} is not available in the synced ${target.siteSlug} libraries`,
        );
      }
      if (matches.length > 1) {
        throw new Error(
          `More than one synced file is named ${target.fileName}`,
        );
      }

      stage = "open-in-finder";
      await showInFinder(matches[0]);
      return;
    }

    stage = "find-synced-item";
    for (const candidate of candidates) {
      let itemStats;
      try {
        itemStats = await stat(candidate.localPath);
      } catch (error) {
        const code = (error as NodeJS.ErrnoException).code;
        if (code === "ENOENT" || code === "ENOTDIR") continue;
        throw error;
      }

      stage = "open-in-finder";
      if (itemStats.isDirectory()) await open(candidate.localPath);
      else await showInFinder(candidate.localPath);
      return;
    }

    throw new Error(
      `The item is not available in ${candidates[0].libraryName}`,
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const details = JSON.stringify(
      {
        stage,
        browser: browserDiagnostics,
        message,
        stack: error instanceof Error ? error.stack : undefined,
        cause:
          error instanceof Error && error.cause instanceof Error
            ? error.cause.message
            : undefined,
      },
      null,
      2,
    );
    console.error("SharePoint Finder failed", details);
    await showToast({
      style: Toast.Style.Failure,
      title: "Couldn’t open SharePoint item",
      message,
      primaryAction: {
        title: "Copy Full Error",
        onAction: async (toast) => {
          await Clipboard.copy(details);
          await toast.hide();
        },
      },
    });
  }
}
