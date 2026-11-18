import {
  List,
  ActionPanel,
  Action,
  Icon,
  Color,
  confirmAlert,
  Alert,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import React, { useEffect, useState } from "react";
import { Profile } from "./types";
import { getProfiles, deleteProfile, getActiveProfileId, ccSwitchDatabaseExists } from "./utils/cc-switch-db";
import { switchToProfile } from "./utils/profile-switcher";
import CreateProfileForm from "./components/CreateProfileForm";
import EditProfileForm from "./components/EditProfileForm";

export default function Command() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [activeProfileId, setActiveProfileId] = useState<string | undefined>();
  const [isLoading, setIsLoading] = useState(true);
  const [ccSwitchAvailable, setCcSwitchAvailable] = useState(false);
  const { push } = useNavigation();

  useEffect(() => {
    loadProfiles();
  }, []);

  async function loadProfiles() {
    setIsLoading(true);
    try {
      // Check if CC Switch database exists
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
      await loadProfiles();
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to switch profile",
        message: (error as Error).message,
      });
    }
  }

  async function handleDeleteProfile(profile: Profile) {
    const confirmed = await confirmAlert({
      title: "Delete Profile",
      message: `Are you sure you want to delete "${profile.name}"? This action cannot be undone.`,
      primaryAction: {
        title: "Delete",
        style: Alert.ActionStyle.Destructive,
      },
    });

    if (confirmed) {
      try {
        await deleteProfile(profile.id);
        showToast({
          style: Toast.Style.Success,
          title: "Profile Deleted",
          message: `Deleted ${profile.name}`,
        });
        await loadProfiles();
      } catch (error) {
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to delete profile",
          message: (error as Error).message,
        });
      }
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

      {ccSwitchAvailable && (
        <>
          <List.Section title="Profiles" subtitle={`${profiles.length} profiles`}>
            {profiles.map((profile) => {
              const isActive = profile.id === activeProfileId;

              return (
                <List.Item
                  key={profile.id}
                  title={profile.name}
                  subtitle={profile.description || "No description"}
                  accessories={[
                    isActive ? { tag: { value: "Active", color: Color.Green }, icon: Icon.CheckCircle } : {},
                    { date: new Date(profile.updatedAt), tooltip: "Last updated" },
                  ]}
                  icon={{
                    source: Icon.Person,
                    tintColor: isActive ? Color.Green : Color.SecondaryText,
                  }}
                  actions={
                    <ActionPanel>
                      <ActionPanel.Section title="Profile Actions">
                        {!isActive && (
                          <Action
                            title="Switch to Profile"
                            icon={Icon.Switch}
                            onAction={() => handleSwitchProfile(profile)}
                          />
                        )}
                        <Action
                          title="Edit Profile"
                          icon={Icon.Pencil}
                          shortcut={{ modifiers: ["cmd"], key: "e" }}
                          onAction={() => push(<EditProfileForm profile={profile} onUpdate={loadProfiles} />)}
                        />
                        <Action
                          title="Duplicate Profile"
                          icon={Icon.Duplicate}
                          shortcut={{ modifiers: ["cmd"], key: "d" }}
                          onAction={() =>
                            push(
                              <CreateProfileForm
                                initialValues={{
                                  name: `${profile.name} (Copy)`,
                                  description: profile.description || "",
                                  config: profile.config,
                                }}
                                onSuccess={loadProfiles}
                              />
                            )
                          }
                        />
                      </ActionPanel.Section>
                      <ActionPanel.Section title="Dangerous Actions">
                        <Action
                          title="Delete Profile"
                          icon={Icon.Trash}
                          style={Action.Style.Destructive}
                          shortcut={{ modifiers: ["cmd"], key: "backspace" }}
                          onAction={() => handleDeleteProfile(profile)}
                        />
                      </ActionPanel.Section>
                    </ActionPanel>
                  }
                />
              );
            })}
          </List.Section>

          {profiles.length === 0 && !isLoading && (
            <List.EmptyView
              title="No Profiles Yet"
              description="Create your first profile in CC Switch or using this extension"
              icon={Icon.Person}
              actions={
                <ActionPanel>
                  <Action
                    title="Create Profile"
                    icon={Icon.Plus}
                    onAction={() => push(<CreateProfileForm onSuccess={loadProfiles} />)}
                  />
                </ActionPanel>
              }
            />
          )}

          <List.Section title="Actions">
            <List.Item
              title="Create New Profile"
              icon={Icon.Plus}
              actions={
                <ActionPanel>
                  <Action
                    title="Create Profile"
                    icon={Icon.Plus}
                    onAction={() => push(<CreateProfileForm onSuccess={loadProfiles} />)}
                  />
                </ActionPanel>
              }
            />
          </List.Section>
        </>
      )}
    </List>
  );
}
