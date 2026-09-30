import {
  List,
  Action,
  ActionPanel,
  showToast,
  Toast,
  Icon,
} from "@raycast/api";
import { useState, useEffect } from "react";
import { getCachedProfiles, discoverProfiles } from "./utils/discovery";
import { execWallpaperEngine } from "./utils/cli";

export default function OpenProfile() {
  const [profiles, setProfiles] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const cached = await getCachedProfiles();
        if (cached.length > 0) {
          setProfiles(cached);
          setIsLoading(false);
        }
        const discovered = await discoverProfiles();
        setProfiles(discovered);
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, []);

  const refreshProfiles = async () => {
    setIsLoading(true);
    try {
      const discovered = await discoverProfiles();
      setProfiles(discovered);
      await showToast({
        style: Toast.Style.Success,
        title: "Profile list refreshed",
      });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Refresh failed",
        message: String(error),
      });
    } finally {
      setIsLoading(false);
    }
  };

  async function handleOpen(profile: string) {
    try {
      await execWallpaperEngine(["openProfile", "-profile", profile]);
      await showToast({ style: Toast.Style.Success, title: "Profile applied" });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed",
        message: String(error),
      });
    }
  }

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search profiles..."
      actions={
        <ActionPanel>
          <Action
            title="Refresh Profile List"
            icon={Icon.ArrowClockwise}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
            onAction={refreshProfiles}
          />
        </ActionPanel>
      }
    >
      <List.Section title="Profiles">
        {profiles.map((profile) => (
          <List.Item
            key={profile}
            title={profile}
            actions={
              <ActionPanel>
                <Action
                  title="Apply Profile"
                  icon={Icon.Checkmark}
                  onAction={() => handleOpen(profile)}
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
