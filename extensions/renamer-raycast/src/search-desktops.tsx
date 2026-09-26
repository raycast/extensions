import { Action, ActionPanel, Icon, List, PopToRootType, Toast, closeMainWindow, getPreferenceValues, open, showToast } from "@raycast/api";
import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { useCallback, useEffect, useState } from "react";

const run = promisify(execFile);

type Desktop = {
  id: string;
  name: string;
  screen: string;
  position: number;
  current: boolean;
};

type Listing = {
  desktops: Desktop[];
};

type Preferences = { appPath: string };

async function loadDesktops(appPath: string): Promise<Listing> {
  const resolvedPath = appPath.startsWith("~/") ? join(homedir(), appPath.slice(2)) : appPath;
  const executable = join(resolvedPath, "Contents", "MacOS", "Renamer");
  if (!existsSync(executable)) {
    throw new Error(`Renamer was not found at ${appPath}. Set Renamer App Path in the extension preferences.`);
  }
  const infoPlist = join(resolvedPath, "Contents", "Info.plist");
  const { stdout: buildNumber } = await run("/usr/bin/plutil", ["-extract", "CFBundleVersion", "raw", "-o", "-", infoPlist]);
  if (!Number.isFinite(Number(buildNumber.trim())) || Number(buildNumber.trim()) < 40) {
    throw new Error("This extension requires Renamer 0.1.1 or newer. Update the installed app first.");
  }
  const { stdout } = await run(executable, ["--raycast-list"], { timeout: 10000, maxBuffer: 1024 * 1024 });
  return JSON.parse(stdout) as Listing;
}

export default function SearchDesktops() {
  const { appPath } = getPreferenceValues<Preferences>();
  const [listing, setListing] = useState<Listing>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setListing(await loadDesktops(appPath));
    } catch (cause) {
      setListing(undefined);
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setLoading(false);
    }
  }, [appPath]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function switchTo(desktop: Desktop) {
    try {
      // Start the URL dispatch before unloading the view; otherwise Raycast
      // can cancel the remaining action when it returns to Root Search.
      const switching = open(`renamer-spaces://switch?target=${encodeURIComponent(desktop.id)}`);
      await closeMainWindow({ popToRootType: PopToRootType.Immediate });
      await switching;
    } catch (cause) {
      await showToast({ style: Toast.Style.Failure, title: "Could not switch desktop", message: String(cause) });
    }
  }

  const emptyTitle = error || "No desktops found";
  const emptyDescription = error ? "Check the Renamer installation and try again." : undefined;

  return (
    <List isLoading={loading} searchBarPlaceholder="Search desktops by name…">
      {!loading && (error || listing?.desktops.length === 0) ? (
        <List.EmptyView title={emptyTitle} description={emptyDescription} />
      ) : (
        listing?.desktops.map((desktop) => (
          <List.Item
            key={desktop.id}
            title={desktop.name}
            subtitle={desktop.screen}
            icon={desktop.current ? Icon.CheckCircle : Icon.Desktop}
            accessories={[{ text: `Desktop ${desktop.position}` }]}
            actions={
              <ActionPanel>
                <Action title="Switch to Desktop" onAction={() => void switchTo(desktop)} />
                <Action title="Refresh Desktops" icon={Icon.ArrowClockwise} shortcut={{ modifiers: ["cmd"], key: "r" }} onAction={() => void refresh()} />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}
