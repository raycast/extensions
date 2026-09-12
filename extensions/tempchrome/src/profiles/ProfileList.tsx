import {
  Action,
  ActionPanel,
  Alert,
  Color,
  confirmAlert,
  Icon,
  List,
  popToRoot,
  showToast,
  Toast,
  Keyboard,
} from "@raycast/api";
import { showFailureToast, usePromise } from "@raycast/utils";
import { type JSX, useEffect } from "react";
import { chromiumExists, clearQuarantine, launchChromium } from "../chromium/launcher";
import { quickLaunch } from "../launch";
import LogViewer from "../logs/LogViewer";
import { getPreferences } from "../preferences";
import { removePath } from "../utils/fs";
import { reportError } from "../utils/reportError";
import { sweepStaleProfiles, unmarkAutoCleanup, updateRegistry } from "./autoCleanup";
import { formatBytes, listProfiles, type ProfileInfo } from "./listing";

export default function ProfileList(): JSX.Element {
  const preferences = getPreferences();
  const { data, isLoading, revalidate } = usePromise(
    async () => listProfiles(preferences.tempBaseDir),
    [],
  );

  useEffect(() => {
    sweepStaleProfiles()
      .then((removed) => {
        if (removed.length > 0) {
          revalidate();
        }
      })
      .catch((error) => {
        void reportError("Auto-cleanup sweep failed", error);
      });
  }, [revalidate]);

  async function handleRelaunch(profile: ProfileInfo): Promise<void> {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: `Launching profile ${profile.id}…`,
    });
    try {
      if (!(await chromiumExists(preferences.binaryPath))) {
        toast.hide();
        await showFailureToast(new Error("not found"), {
          title: "Chromium not found",
          message: "Run 'Install or Update Chromium' from the TempChrome command to install it.",
        });
        return;
      }
      await clearQuarantine(preferences.appBundlePath);
      await launchChromium(preferences.binaryPath, profile.path, []);
      toast.style = Toast.Style.Success;
      toast.title = `Launched ${profile.id}`;
      toast.message = formatBytes(profile.size);
      const removed = await sweepStaleProfiles();
      if (removed.length > 0) {
        revalidate();
      }
    } catch (error) {
      toast.hide();
      await showFailureToast(error, { title: "Launch failed" });
    }
  }

  async function handleQuickLaunchFromEmpty(): Promise<void> {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Launching TempChrome…",
    });
    const ok = await quickLaunch();
    if (ok) {
      toast.hide();
      revalidate();
    } else {
      toast.style = Toast.Style.Failure;
      toast.title = "Launch failed";
    }
  }

  async function handleDelete(profile: ProfileInfo): Promise<void> {
    const title = profile.inUse ? "Delete profile in use?" : "Delete profile?";
    const message = profile.inUse
      ? `${profile.id} (${formatBytes(profile.size)}) is currently in use by Chromium. Deleting it may corrupt the running session. Continue?`
      : `${profile.id} (${formatBytes(profile.size)}) will be permanently deleted.`;
    const primaryTitle = profile.inUse ? "Delete Anyway" : "Delete";

    const confirmed = await confirmAlert({
      title,
      message,
      primaryAction: {
        title: primaryTitle,
        style: Alert.ActionStyle.Destructive,
      },
    });
    if (!confirmed) {
      return;
    }

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: `Deleting ${profile.id}…`,
    });
    try {
      await removePath(profile.path);
      await unmarkAutoCleanup(profile.path);
      toast.style = Toast.Style.Success;
      toast.title = `Deleted ${profile.id}`;
      toast.message = `Freed ${formatBytes(profile.size)}`;
      revalidate();
    } catch (error) {
      toast.hide();
      await showFailureToast(error, { title: "Delete failed" });
    }
  }

  async function handleDeleteAll(profiles: ProfileInfo[]): Promise<void> {
    const idle = profiles.filter((profile) => !profile.inUse);
    const inUse = profiles.length - idle.length;
    const totalSize = idle.reduce((sum, profile) => sum + profile.size, 0);

    if (idle.length === 0) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Nothing to delete",
        message: profiles.length === 0 ? "No profiles found." : "All profiles are in use.",
      });
      return;
    }

    const confirmed = await confirmAlert({
      title: `Delete ${idle.length} idle profile(s)?`,
      message:
        `Total ${formatBytes(totalSize)} will be permanently deleted.` +
        (inUse > 0 ? ` ${inUse} in-use profile(s) will be skipped.` : ""),
      primaryAction: {
        title: `Delete ${idle.length}`,
        style: Alert.ActionStyle.Destructive,
      },
    });
    if (!confirmed) {
      return;
    }

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: `Deleting ${idle.length} profile(s)…`,
    });
    try {
      await Promise.all(idle.map((profile) => removePath(profile.path)));
      const idlePaths = new Set(idle.map((profile) => profile.path));
      await updateRegistry((current) => {
        const next = { ...current };
        for (const idlePath of idlePaths) {
          delete next[idlePath];
        }
        return next;
      });

      toast.style = Toast.Style.Success;
      toast.title = `Deleted ${idle.length} profile(s)`;
      toast.message =
        `Freed ${formatBytes(totalSize)}` + (inUse > 0 ? ` · ${inUse} in use skipped` : "");
      revalidate();
    } catch (error) {
      toast.hide();
      await showFailureToast(error, { title: "Delete failed" });
    }
  }

  async function handleCleanupStale(): Promise<void> {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Sweeping stale profiles…",
    });
    try {
      const cleaned = await sweepStaleProfiles();
      if (cleaned.length === 0) {
        toast.style = Toast.Style.Failure;
        toast.title = "Nothing to clean up";
        toast.message = "No stale auto-cleanup profiles found.";
      } else {
        toast.style = Toast.Style.Success;
        toast.title = `Cleaned up ${cleaned.length} stale profile(s)`;
      }
      revalidate();
    } catch (error) {
      toast.hide();
      await showFailureToast(error, { title: "Cleanup failed" });
    }
  }

  async function handleRefresh(): Promise<void> {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Refreshing…",
    });
    revalidate();
    toast.hide();
  }

  async function handleBack(): Promise<void> {
    await popToRoot({ clearSearchBar: true });
  }

  const profiles = data ?? [];
  const totalSize = profiles.reduce((sum, profile) => sum + profile.size, 0);
  const idleCount = profiles.filter((profile) => !profile.inUse).length;

  return (
    <List
      isLoading={isLoading}
      navigationTitle="Temp Profiles"
      searchBarPlaceholder={
        profiles.length > 0
          ? `${profiles.length} profile(s) · ${idleCount} idle · ${formatBytes(totalSize)}`
          : "Filter profiles…"
      }
    >
      {!isLoading && profiles.length === 0 ? (
        <List.EmptyView
          title="No temporary profiles found"
          description="Launch TempChrome to create one."
          actions={
            <ActionPanel>
              <Action
                title="Launch TempChrome"
                icon={Icon.Rocket}
                onAction={handleQuickLaunchFromEmpty}
              />
              <Action
                title="Refresh"
                icon={Icon.ArrowClockwise}
                shortcut={Keyboard.Shortcut.Common.Refresh}
                onAction={handleRefresh}
              />
            </ActionPanel>
          }
        />
      ) : (
        profiles.map((profile) => (
          <List.Item
            key={profile.id}
            title={profile.id}
            subtitle={formatBytes(profile.size)}
            accessories={[
              ...(profile.autoCleanup
                ? [
                    {
                      tag: {
                        value: profile.inUse ? "Cleans on exit" : "Pending cleanup",
                        color: profile.inUse ? Color.Blue : Color.Orange,
                      },
                      tooltip: profile.inUse
                        ? "This profile will be permanently deleted after Chromium exits."
                        : "Chromium has exited; this profile will be removed on the next sweep.",
                    },
                  ]
                : []),
              profile.inUse
                ? {
                    tag: { value: "In use", color: Color.Green },
                    icon: Icon.CircleFilled,
                  }
                : { tag: { value: "Idle", color: Color.SecondaryText } },
              { tag: "⌘L" },
              { date: profile.createdAt },
            ]}
            actions={
              <ActionPanel>
                <Action
                  title="Launch with This Profile"
                  icon={Icon.Rocket}
                  onAction={() => handleRelaunch(profile)}
                />
                <Action.Push
                  title="View Log"
                  icon={Icon.Document}
                  shortcut={{ modifiers: ["cmd"], key: "l" }}
                  target={<LogViewer profileDir={profile.path} />}
                />
                <Action.ShowInFinder path={profile.path} shortcut={Keyboard.Shortcut.Common.Open} />
                <Action.CopyToClipboard
                  title="Copy Path"
                  content={profile.path}
                  shortcut={Keyboard.Shortcut.Common.Copy}
                />
                <Action
                  title="Refresh List"
                  icon={Icon.ArrowClockwise}
                  shortcut={Keyboard.Shortcut.Common.Refresh}
                  onAction={handleRefresh}
                />
                <Action
                  // eslint-disable-next-line @raycast/prefer-title-case
                  title="Clean Up Stale Profiles"
                  icon={Icon.Hammer}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "k" }}
                  onAction={handleCleanupStale}
                />
                <Action
                  title="Back to Menu"
                  icon={Icon.ArrowLeft}
                  shortcut={{ modifiers: ["cmd"], key: "[" }}
                  onAction={handleBack}
                />
                <Action
                  title="Delete Profile"
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  shortcut={{ modifiers: ["ctrl"], key: "x" }}
                  onAction={() => handleDelete(profile)}
                />
                <Action
                  title="Delete All Idle Profiles"
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "backspace" }}
                  onAction={() => handleDeleteAll(profiles)}
                />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}
