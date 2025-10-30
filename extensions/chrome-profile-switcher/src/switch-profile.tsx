import { List, ActionPanel, Action, showToast, Toast, Icon, Color } from "@raycast/api";
import { useState, useEffect } from "react";
import fs from "fs";
import path from "path";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

interface ChromeProfile {
  directory: string;
  name: string;
  icon?: string;
  color?: string;
}

const CHROME_PATH = path.join(process.env.HOME || "", "Library/Application Support/Google/Chrome");

async function getChromeProfiles(): Promise<ChromeProfile[]> {
  try {
    if (!fs.existsSync(CHROME_PATH)) {
      throw new Error("Chrome not found. Make sure Google Chrome is installed.");
    }

    const localStatePath = path.join(CHROME_PATH, "Local State");

    if (!fs.existsSync(localStatePath)) {
      throw new Error("Chrome profile data not found.");
    }

    const localStateContent = fs.readFileSync(localStatePath, "utf8");
    const localState = JSON.parse(localStateContent);

    const profilesInfo = localState.profile?.info_cache || {};
    const profiles: ChromeProfile[] = [];

    for (const [directory, profileData] of Object.entries(profilesInfo)) {
      const profilePath = path.join(CHROME_PATH, directory);
      const profile = profileData as { name?: string; avatar_icon?: string; theme_color?: string };

      if (fs.existsSync(profilePath)) {
        profiles.push({
          directory,
          name: profile.name || directory,
          icon: profile.avatar_icon,
          color: profile.theme_color,
        });
      }
    }

    profiles.sort((a, b) => {
      if (a.directory === "Default") return -1;
      if (b.directory === "Default") return 1;
      return a.name.localeCompare(b.name);
    });

    return profiles;
  } catch (error) {
    throw new Error(`Failed to read Chrome profiles: ${error}`);
  }
}

async function openChromeProfile(profile: ChromeProfile) {
  try {
    const command = `open -na "Google Chrome" --args --profile-directory="${profile.directory}"`;
    await execAsync(command);

    await showToast({
      style: Toast.Style.Success,
      title: "Chrome Opened",
      message: profile.name,
    });
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to Open Chrome",
      message: String(error),
    });
  }
}

function getProfileIcon(iconName?: string): Icon {
  if (!iconName) return Icon.Person;

  const iconMap: { [key: string]: Icon } = {
    "chrome-logo-default": Icon.PersonCircle,
    "avatar-generic": Icon.Person,
    "avatar-generic-blue": Icon.Person,
    "avatar-generic-red": Icon.Person,
    "avatar-generic-green": Icon.Person,
    "avatar-generic-yellow": Icon.Person,
    "avatar-generic-purple": Icon.Person,
    "avatar-generic-aqua": Icon.Person,
    "avatar-generic-orange": Icon.Person,
  };

  return iconMap[iconName] || Icon.Person;
}

function getProfileColor(colorHex?: string): Color {
  if (!colorHex) return Color.Blue;

  const colorMap: { [key: string]: Color } = {
    "#5F6368": Color.SecondaryText,
    "#DB4437": Color.Red,
    "#1A73E8": Color.Blue,
    "#34A853": Color.Green,
    "#FBBC04": Color.Yellow,
    "#9334E6": Color.Purple,
    "#FF6D00": Color.Orange,
  };

  return colorMap[colorHex] || Color.Blue;
}

export default function Command() {
  const [profiles, setProfiles] = useState<ChromeProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadProfiles() {
      try {
        const chromeProfiles = await getChromeProfiles();
        setProfiles(chromeProfiles);
      } catch (error) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Error",
          message: String(error),
        });
      } finally {
        setIsLoading(false);
      }
    }

    loadProfiles();
  }, []);

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search Chrome profiles...">
      {profiles.map((profile) => (
        <List.Item
          key={profile.directory}
          title={profile.name}
          subtitle={profile.directory === "Default" ? "Default Profile" : ""}
          icon={{
            source: getProfileIcon(profile.icon),
            tintColor: getProfileColor(profile.color),
          }}
          actions={
            <ActionPanel>
              <Action title="Open Profile" icon={Icon.Window} onAction={() => openChromeProfile(profile)} />
              <Action.CopyToClipboard
                title="Copy Profile Directory"
                content={profile.directory}
                shortcut={{ modifiers: ["cmd"], key: "c" }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
