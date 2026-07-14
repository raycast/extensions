import {
  Action,
  ActionPanel,
  Clipboard,
  closeMainWindow,
  environment,
  getPreferenceValues,
  Icon,
  List,
  showToast,
  Toast,
} from "@raycast/api";
import path from "node:path";
import { useEffect, useState } from "react";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { FirefoxProfile, loadProfiles, profilesIniPath } from "./firefox";

const execFileAsync = promisify(execFile);
const windowHelperPath = path.join(environment.assetsPath, "firefox-window-helper");

const delay = (milliseconds: number) => new Promise((resolve) => setTimeout(resolve, milliseconds));

async function findProfilePid(profilePath: string): Promise<number | undefined> {
  const { stdout } = await execFileAsync("/bin/ps", ["-axo", "pid=,command="], { encoding: "utf8" });
  const profileArguments = [` -profile ${profilePath}`, ` --profile ${profilePath}`];
  const processLine = stdout
    .split("\n")
    .find(
      (line) =>
        line.includes("Firefox.app/Contents/MacOS/firefox") &&
        profileArguments.some((profileArgument) => line.includes(profileArgument)),
    );
  const pid = processLine?.match(/^\s*(\d+)/)?.[1];
  return pid ? Number(pid) : undefined;
}

async function getWindowCount(pid: number): Promise<number> {
  const { stdout } = await execFileAsync(windowHelperPath, ["count", String(pid)], { encoding: "utf8" });
  return Number(stdout.trim());
}

async function activateFirefox(pid: number): Promise<void> {
  const { stdout } = await execFileAsync(windowHelperPath, ["activate", String(pid)], { encoding: "utf8" });
  if (stdout.trim() !== "active") throw new Error("macOS could not bring the Firefox window to the front");
}

async function waitForExit(pid: number): Promise<boolean> {
  for (let attempt = 0; attempt < 20; attempt++) {
    try {
      process.kill(pid, 0);
      await delay(100);
    } catch {
      return true;
    }
  }
  return false;
}

async function waitForProfileWindow(profilePath: string): Promise<number> {
  for (let attempt = 0; attempt < 50; attempt++) {
    const pid = await findProfilePid(profilePath);
    if (pid && (await getWindowCount(pid)) > 0) return pid;
    await delay(100);
  }
  throw new Error("Firefox started but did not create a window for this profile");
}

async function launchProfile(profile: FirefoxProfile, firefoxAppPath: string) {
  const toast = await showToast({ style: Toast.Style.Animated, title: `Opening ${profile.name}` });

  try {
    const runningPid = await findProfilePid(profile.profilePath);

    if (runningPid && (await getWindowCount(runningPid)) > 0) {
      await closeMainWindow();
      await delay(150);
      await activateFirefox(runningPid);
      toast.style = Toast.Style.Success;
      toast.title = `Switched to ${profile.name}`;
      return;
    }

    // Firefox can linger after its last window closes. Gracefully stop that windowless process before relaunching it.
    if (runningPid) {
      process.kill(runningPid, "SIGTERM");
      if (!(await waitForExit(runningPid))) throw new Error("The windowless Firefox process did not close cleanly");
    }

    await closeMainWindow();
    await execFileAsync("/usr/bin/open", [
      "-n",
      firefoxAppPath,
      "--args",
      "-profile",
      profile.profilePath,
      "-no-remote",
      "-new-window",
      "about:blank",
    ]);
    const launchedPid = await waitForProfileWindow(profile.profilePath);
    await activateFirefox(launchedPid);
    toast.style = Toast.Style.Success;
    toast.title = `Opened ${profile.name}`;
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = "Could not open Firefox";
    toast.message = error instanceof Error ? error.message : String(error);
  }
}

export default function Command() {
  const { firefoxAppPath: firefoxApplication } = getPreferenceValues<Preferences.OpenFirefoxProfile>();
  const firefoxAppPath = firefoxApplication?.path ?? "/Applications/Firefox.app";
  const [profiles, setProfiles] = useState<FirefoxProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>();

  async function refresh() {
    setIsLoading(true);
    setError(undefined);
    try {
      setProfiles(await loadProfiles());
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : String(loadError));
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search Firefox profiles…">
      {!isLoading && error ? (
        <List.EmptyView
          icon={Icon.Warning}
          title="Could Not Read Firefox Profiles"
          description={`${error}\n\nExpected profile registry: ${profilesIniPath}`}
          actions={
            <ActionPanel>
              <Action title="Try Again" icon={Icon.ArrowClockwise} onAction={refresh} />
              <Action.Open title="Open Firefox" target={firefoxAppPath} />
            </ActionPanel>
          }
        />
      ) : (
        profiles.map((profile) => (
          <List.Item
            key={profile.id}
            icon={Icon.Person}
            title={profile.name}
            subtitle={profile.profilePath}
            accessories={profile.isDefault ? [{ tag: "Default" }] : undefined}
            keywords={[profile.profilePath, profile.isDefault ? "default" : ""]}
            actions={
              <ActionPanel>
                <Action
                  title={`Open ${profile.name}`}
                  icon={Icon.Globe}
                  onAction={() => launchProfile(profile, firefoxAppPath)}
                />
                <Action.Open title="Open Profile Folder" icon={Icon.Folder} target={profile.profilePath} />
                <Action
                  title="Copy Profile Name"
                  icon={Icon.Clipboard}
                  shortcut={{ modifiers: ["cmd"], key: "c" }}
                  onAction={() => Clipboard.copy(profile.name)}
                />
                <Action title="Refresh Profiles" icon={Icon.ArrowClockwise} onAction={refresh} />
                <Action
                  title="Open Firefox Profile Manager"
                  icon={Icon.Gear}
                  onAction={() => execFileAsync("/usr/bin/open", ["-n", firefoxAppPath, "--args", "-ProfileManager"])}
                />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}
