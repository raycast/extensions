import { ActionPanel, Action, Icon, List, showToast, Toast, closeMainWindow, Image } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import fs from "fs";
import path from "path";
import { exec } from "child_process";
import os from "os";

interface ChromeProfile {
  key: string;
  name: string;
  userName: string;
  icon: Image.ImageLike;
  lastUsed: number;
  profilePath: string;
}

export default function Command() {
  const { data: profiles, isLoading, error } = usePromise(getChromeProfiles, []);

  if (error) {
    showToast({
      style: Toast.Style.Failure,
      title: "Failed to load Chrome profiles",
      message: String(error),
    });
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search Chrome profiles...">
      {profiles?.map((profile) => (
        <List.Item
          key={profile.key}
          icon={profile.icon}
          title={profile.name}
          subtitle={profile.userName}
          accessories={[{ tooltip: `Last Used: ${new Date(profile.lastUsed * 1000).toLocaleDateString()}` }]}
          actions={
            <ActionPanel>
              <Action title="Open Profile" icon={Icon.Globe} onAction={() => openChromeProfile(profile.key)} />
              <Action
                title="Open Incognito"
                icon={Icon.EyeDisabled}
                onAction={() => openChromeProfile(profile.key, true)}
              />
              <Action.ShowInFinder
                title={os.platform() === "win32" ? "Show in Explorer" : "Show in Finder"}
                path={profile.profilePath}
              />
              <Action.CopyToClipboard title="Copy Profile Path" content={profile.profilePath} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

interface LocalState {
  profile?: {
    info_cache?: Record<
      string,
      {
        name?: string;
        user_name?: string;
        avatar_icon?: string;
        active_time?: number;
      }
    >;
  };
}

function getChromeUserDataPath(): string {
  if (os.platform() === "win32") {
    return path.join(os.homedir(), "AppData", "Local", "Google", "Chrome", "User Data");
  } else if (os.platform() === "darwin") {
    return path.join(os.homedir(), "Library", "Application Support", "Google", "Chrome");
  } else {
    throw new Error("Unsupported platform");
  }
}

async function getChromeProfiles(): Promise<ChromeProfile[]> {
  const userDataDir = getChromeUserDataPath();
  const localStatePath = path.join(userDataDir, "Local State");

  if (!fs.existsSync(localStatePath)) {
    throw new Error(`Chrome Local State file not found at ${localStatePath}. Is Chrome installed?`);
  }

  const fileContent = await fs.promises.readFile(localStatePath, "utf-8");
  const localState = JSON.parse(fileContent) as LocalState;

  const infoCache = localState.profile?.info_cache;
  if (!infoCache) {
    return [];
  }

  return Object.entries(infoCache)
    .map(([key, value]) => {
      let icon: Image.ImageLike = Icon.Person;
      const profileDir = path.join(userDataDir, key);
      const customIconPath = path.join(profileDir, "Google Profile Picture.png");

      if (fs.existsSync(customIconPath)) {
        icon = { source: customIconPath, mask: Image.Mask.Circle };
      }

      return {
        key: key,
        name: value.name || key,
        userName: value.user_name || "",
        icon: icon,
        lastUsed: value.active_time || 0,
        profilePath: profileDir,
      };
    })
    .sort((a, b) => b.lastUsed - a.lastUsed);
}

function openChromeProfile(profileKey: string, incognito = false) {
  let command = "";

  if (os.platform() === "win32") {
    const paths = [
      path.join("C:", "Program Files", "Google", "Chrome", "Application", "chrome.exe"),
      path.join("C:", "Program Files (x86)", "Google", "Chrome", "Application", "chrome.exe"),
    ];

    let chromePath = "chrome";
    for (const p of paths) {
      if (fs.existsSync(p)) {
        chromePath = `"${p}"`;
        break;
      }
    }
    command = `${chromePath} --profile-directory="${profileKey}"${incognito ? " --incognito" : ""}`;
  } else if (os.platform() === "darwin") {
    command = `open -na "Google Chrome" --args --profile-directory="${profileKey}"${incognito ? " --incognito" : ""}`;
  }

  if (!command) return;

  exec(command, (error) => {
    if (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to open Chrome profile",
        message: error.message,
      });
    } else {
      closeMainWindow();
    }
  });
}
