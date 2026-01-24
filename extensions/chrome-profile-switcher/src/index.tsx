import { Action, ActionPanel, List, showToast, Toast } from "@raycast/api";
import { promises as fs } from "fs";
import { homedir } from "os";
import path from "path";
import React, { useEffect, useState } from "react";
import { openChromeProfile } from "./chrome";

// const NEW_TAB_URL = "chrome://newtab";

export default function Command() {
  const [profiles, setProfiles] = useState<ResolvedProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchText, setSearchText] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadProfiles() {
      try {
        const localStatePath = path.join(
          homedir(),
          "Library",
          "Application Support",
          "Google",
          "Chrome",
          "Local State",
        );
        const raw = await fs.readFile(localStatePath, "utf8");
        const data = JSON.parse(raw) as LocalState;
        const infoCache = data.profile?.info_cache ?? {};
        const items = Object.entries(infoCache)
          .map(([directory, info]) => ({
            directory,
            name: info.name ?? directory,
          }))
          .sort((a, b) => a.name.localeCompare(b.name));

        if (isMounted) {
          setProfiles(items);
        }
      } catch (error) {
        if (isMounted) {
          await showToast({
            style: Toast.Style.Failure,
            title: "Failed to load Chrome profiles",
            message: error instanceof Error ? error.message : String(error),
          });
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadProfiles();

    return () => {
      isMounted = false;
    };
  }, []);

  const filteredProfiles = profiles.filter((profile) =>
    profile.name.toLowerCase().includes(searchText.toLowerCase()),
  );

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Type a Chrome profile name"
      onSearchTextChange={setSearchText}
      throttle
    >
      {filteredProfiles.map((profile) => (
        <List.Item
          key={profile.directory}
          title={profile.name}
          actions={
            <ActionPanel>
              <Action
                title="Open Profile"
                onAction={() => handleOpenProfile(profile)}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

async function handleOpenProfile(profile: ResolvedProfile) {
  try {
    await openChromeProfile(profile.directory, profile.name);
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to open Chrome profile",
      message: error instanceof Error ? error.message : String(error),
    });
  }
}

type LocalState = {
  profile?: {
    info_cache?: Record<string, { name?: string }>;
  };
};

type ResolvedProfile = {
  directory: string;
  name: string;
};
