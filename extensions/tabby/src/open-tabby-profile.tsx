import { Action, ActionPanel, Icon, List, getPreferenceValues } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { useEffect, useState } from "react";
import { execFileSync } from "child_process";
import { existsSync } from "fs";
import { homedir } from "os";
import { join } from "path";
import { getTabbyProfiles, getProfileGroups, TabbyProfile } from "./utils/get-tabby-profiles";

function resolveTabbyCli(): string {
  const { tabbyPath } = getPreferenceValues<Preferences>();
  if (tabbyPath && tabbyPath.trim().length > 0) {
    return tabbyPath;
  }

  if (process.platform === "win32") {
    const localAppData = process.env.LOCALAPPDATA ?? join(homedir(), "AppData", "Local");
    const programFiles = process.env["ProgramFiles"] ?? "C:\\Program Files";
    const candidates = [join(localAppData, "Programs", "Tabby", "Tabby.exe"), join(programFiles, "Tabby", "Tabby.exe")];
    return candidates.find((p) => existsSync(p)) ?? candidates[0];
  }

  return "/Applications/Tabby.app/Contents/MacOS/Tabby";
}

function getProfileIcon(type: string): Icon {
  switch (type) {
    case "ssh":
      return Icon.Globe;
    case "serial":
      return Icon.Link;
    case "telnet":
      return Icon.Network;
    default:
      return Icon.Terminal;
  }
}

export default function Command() {
  const [profiles, setProfiles] = useState<TabbyProfile[]>([]);
  const [groups, setGroups] = useState<Map<string, string>>(new Map());
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadedProfiles = getTabbyProfiles();
    const loadedGroups = getProfileGroups();
    setProfiles(loadedProfiles);
    setGroups(loadedGroups);
    setIsLoading(false);
  }, []);

  const openProfile = async (profile: TabbyProfile) => {
    try {
      const cli = resolveTabbyCli();
      // Use Tabby CLI to open profile by name
      execFileSync(cli, ["profile", profile.name], { encoding: "utf-8" });
    } catch (error) {
      await showFailureToast(error, { title: `Cannot open profile "${profile.name}"` });
    }
  };

  const getGroupName = (groupId?: string): string | undefined => {
    if (!groupId) return undefined;
    return groups.get(groupId);
  };

  // Group profiles by their group
  const groupedProfiles = profiles.reduce<Record<string, TabbyProfile[]>>(
    (acc, profile) => {
      const groupName = getGroupName(profile.group) || "Ungrouped";
      if (!acc[groupName]) {
        acc[groupName] = [];
      }
      acc[groupName].push(profile);
      return acc;
    },
    {} as Record<string, TabbyProfile[]>,
  );

  const hasGroups = Object.keys(groupedProfiles).length > 1 || !groupedProfiles["Ungrouped"];

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search Tabby profiles...">
      {hasGroups
        ? Object.entries(groupedProfiles).map(([groupName, groupProfiles]) => (
            <List.Section key={groupName} title={groupName}>
              {groupProfiles.map((profile) => (
                <List.Item
                  key={profile.id}
                  icon={getProfileIcon(profile.type)}
                  title={profile.name}
                  subtitle={profile.type}
                  actions={
                    <ActionPanel>
                      <Action title="Open Profile" icon={Icon.Terminal} onAction={() => openProfile(profile)} />
                    </ActionPanel>
                  }
                />
              ))}
            </List.Section>
          ))
        : profiles.map((profile) => (
            <List.Item
              key={profile.id}
              icon={getProfileIcon(profile.type)}
              title={profile.name}
              subtitle={profile.type}
              actions={
                <ActionPanel>
                  <Action title="Open Profile" icon={Icon.Terminal} onAction={() => openProfile(profile)} />
                </ActionPanel>
              }
            />
          ))}
      {!isLoading && profiles.length === 0 && (
        <List.EmptyView
          icon={Icon.ExclamationMark}
          title="No profiles found"
          description="Could not find any Tabby profiles. Make sure Tabby is installed and you have created profiles."
        />
      )}
    </List>
  );
}
