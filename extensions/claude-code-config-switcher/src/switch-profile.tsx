import { List, ActionPanel, Action, Icon, Color, showToast, Toast } from "@raycast/api";
import React, { useEffect, useState } from "react";
import { Profile } from "./types";
import { getProfiles, getActiveProfileId, ccSwitchDatabaseExists } from "./utils/cc-switch-db";
import { switchToProfile } from "./utils/profile-switcher";

export default function Command() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [activeProfileId, setActiveProfileId] = useState<string | undefined>();
  const [isLoading, setIsLoading] = useState(true);
  const [ccSwitchAvailable, setCcSwitchAvailable] = useState(false);

  useEffect(() => {
    loadProfiles();
  }, []);

  async function loadProfiles() {
    setIsLoading(true);
    try {
      const dbExists = await ccSwitchDatabaseExists();
      setCcSwitchAvailable(dbExists);

      if (!dbExists) {
        setProfiles([]);
        setActiveProfileId(undefined);
        return;
      }

      const [profilesList, activeId] = await Promise.all([getProfiles(), getActiveProfileId()]);
      setProfiles(profilesList);
      setActiveProfileId(activeId);
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to load profiles",
        message: (error as Error).message,
      });
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSwitchProfile(profile: Profile) {
    try {
      await switchToProfile(profile);
      setActiveProfileId(profile.id);
      showToast({
        style: Toast.Style.Success,
        title: "Profile Activated",
        message: `Switched to ${profile.name}`,
      });
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to switch profile",
        message: (error as Error).message,
      });
    }
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search profiles...">
      {!ccSwitchAvailable && !isLoading && (
        <List.EmptyView
          title="CC Switch Not Found"
          description="Install CC Switch to manage Claude Code profiles"
          icon={Icon.XMarkCircle}
        />
      )}

      {ccSwitchAvailable &&
        profiles.map((profile) => {
          const isActive = profile.id === activeProfileId;

          return (
            <List.Item
              key={profile.id}
              title={profile.name}
              subtitle={profile.description || "No description"}
              accessories={[isActive ? { tag: { value: "Active", color: Color.Green }, icon: Icon.CheckCircle } : {}]}
              icon={{
                source: Icon.Person,
                tintColor: isActive ? Color.Green : Color.SecondaryText,
              }}
              actions={
                <ActionPanel>
                  {!isActive && (
                    <Action
                      title="Switch to Profile"
                      icon={Icon.Switch}
                      onAction={() => handleSwitchProfile(profile)}
                    />
                  )}
                </ActionPanel>
              }
            />
          );
        })}

      {ccSwitchAvailable && profiles.length === 0 && !isLoading && (
        <List.EmptyView
          title="No Profiles Yet"
          description="Create profiles using 'Manage Profiles' command or in CC Switch"
          icon={Icon.Person}
        />
      )}
    </List>
  );
}
