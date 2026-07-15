import {
  Action,
  ActionPanel,
  Clipboard,
  Color,
  Icon,
  Keyboard,
  List,
  showToast,
  Toast,
  useNavigation,
  confirmAlert,
  Alert,
} from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useState } from "react";
import path from "node:path";
import { parseSiiFileAuto, parseSiiFileStreaming, ProfileSii } from "sii-parse-ts";
import { Game, getProfiles, Profile, duplicateProfile, deleteProfile } from "../services/profileService";
import RenameProfileForm from "./rename-profile-form";

interface ProfileWithData extends Profile {
  parsedData?: ProfileSii;
}

type SortOption = "name" | "saveTime" | "creationTime";

export default function ProfileViewer({ game }: { game: Game }) {
  const { push } = useNavigation();
  const [sortBy, setSortBy] = useState<SortOption>("name");
  const {
    data: profiles,
    isLoading,
    revalidate,
  } = usePromise(
    async () => {
      const profs = await getProfiles(game);
      const profilesWithData: ProfileWithData[] = await Promise.all(
        profs.map(async (prof) => {
          try {
            const parsedSii = await parseSiiFileStreaming<ProfileSii>(path.join(prof.path, "profile.sii"));
            return { ...prof, parsedData: parsedSii };
          } catch {
            return prof;
          }
        }),
      );
      return profilesWithData;
    },
    [],
    { execute: true },
  );

  // Sort profiles based on selected option
  const sortedProfiles = profiles?.sort((a, b) => {
    if (sortBy === "name") {
      return a.name.localeCompare(b.name);
    } else if (sortBy === "saveTime") {
      const aTime = a.parsedData?.SiiNunit?.user_profile?.[0]?.save_time || 0;
      const bTime = b.parsedData?.SiiNunit?.user_profile?.[0]?.save_time || 0;
      return bTime - aTime; // Most recent first
    } else if (sortBy === "creationTime") {
      const aTime = a.parsedData?.SiiNunit?.user_profile?.[0]?.creation_time || 0;
      const bTime = b.parsedData?.SiiNunit?.user_profile?.[0]?.creation_time || 0;
      return bTime - aTime; // Most recent first
    }
    return 0;
  });

  async function handleParseSii(profile: Profile) {
    showToast({ title: "Parsing", style: Toast.Style.Animated });
    const parsedSii = await parseSiiFileAuto(path.join(profile.path, "profile.sii"));
    showToast({ title: "Copying to clipboard", style: Toast.Style.Animated });
    await Clipboard.copy(JSON.stringify(parsedSii));
    showToast({ title: "Copied to Clipboard", style: Toast.Style.Success });
  }

  async function handleDeleteProfile(profile: Profile) {
    const confirmed = await confirmAlert({
      title: "Delete Profile",
      message: `Are you sure you want to delete "${profile.name}"? This action cannot be undone.`,
      primaryAction: {
        title: "Delete",
        style: Alert.ActionStyle.Destructive,
      },
      dismissAction: {
        title: "Cancel",
      },
    });

    if (confirmed) {
      try {
        showToast({ title: "Deleting Profile", style: Toast.Style.Animated });
        await deleteProfile(profile);
        revalidate(); // Refresh the profiles list
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
        showToast({
          title: "Deletion Failed",
          message: errorMessage,
          style: Toast.Style.Failure,
        });
      }
    }
  }

  async function handleDuplicateProfile(profile: Profile) {
    try {
      showToast({ title: "Duplicating Profile", style: Toast.Style.Animated });
      await duplicateProfile(profile, game);
      revalidate(); // Refresh the profiles list
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      showToast({
        title: "Duplication Failed",
        message: errorMessage,
        style: Toast.Style.Failure,
      });
    }
  }

  function handleRenameProfile(profile: Profile) {
    push(<RenameProfileForm profile={profile} game={game} onRename={revalidate} />);
  }

  function formatDistance(km: number): string {
    return `${km.toLocaleString()} km`;
  }

  function formatExperience(xp: number): string {
    return xp.toLocaleString();
  }

  function formatDate(timestamp: number): string {
    return new Date(timestamp * 1000).toLocaleString();
  }

  return (
    <List
      isShowingDetail
      isLoading={isLoading}
      searchBarAccessory={
        <List.Dropdown
          tooltip="Sort profiles by"
          value={sortBy}
          onChange={(newValue) => setSortBy(newValue as SortOption)}
          storeValue
        >
          <List.Dropdown.Item title="Name (A-Z)" value="name" icon={Icon.TextCursor} />
          <List.Dropdown.Item title="Last Saved" value="saveTime" icon={Icon.Clock} />
          <List.Dropdown.Item title="Created" value="creationTime" icon={Icon.Calendar} />
        </List.Dropdown>
      }
    >
      {sortedProfiles?.map((profile) => {
        const parsedData = profile.parsedData?.SiiNunit?.user_profile?.[0];

        return (
          <List.Item
            key={profile.hexName}
            title={profile.name}
            actions={
              <ActionPanel>
                <ActionPanel.Section>
                  <Action.ShowInFinder path={profile.path} />
                </ActionPanel.Section>
                <ActionPanel.Section title="Profile Management">
                  <Action
                    title="Rename Profile"
                    icon={Icon.Pencil}
                    shortcut={{ modifiers: ["ctrl"], key: "e" }}
                    onAction={() => handleRenameProfile(profile)}
                  />
                  <Action
                    title="Duplicate Profile"
                    icon={Icon.Duplicate}
                    shortcut={Keyboard.Shortcut.Common.Duplicate}
                    onAction={() => handleDuplicateProfile(profile)}
                  />
                  <Action
                    title="Delete Profile"
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    shortcut={Keyboard.Shortcut.Common.Remove}
                    onAction={() => handleDeleteProfile(profile)}
                  />
                </ActionPanel.Section>
                <ActionPanel.Section title="Copy">
                  <Action
                    title="Copy Parsed JSON"
                    icon={Icon.Clipboard}
                    shortcut={{ modifiers: ["ctrl", "shift"], key: "c" }}
                    onAction={() => handleParseSii(profile)}
                  />
                  <Action.CopyToClipboard
                    title="Copy Name"
                    content={profile.name}
                    shortcut={Keyboard.Shortcut.Common.CopyName}
                  />
                  <Action.CopyToClipboard
                    title="Copy Path"
                    content={profile.path}
                    shortcut={Keyboard.Shortcut.Common.CopyPath}
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
            detail={
              <List.Item.Detail
                metadata={
                  <List.Item.Detail.Metadata>
                    <List.Item.Detail.Metadata.Label title="Profile Name" text={profile.name} icon={Icon.Person} />
                    <List.Item.Detail.Metadata.Label title="Hex Name" text={profile.hexName} />
                    <List.Item.Detail.Metadata.Separator />
                    {parsedData && (
                      <>
                        <List.Item.Detail.Metadata.Label
                          title="Company"
                          text={parsedData.company_name || "N/A"}
                          icon={Icon.Building}
                        />
                        <List.Item.Detail.Metadata.Label
                          title="Experience"
                          text={formatExperience(parsedData.cached_experience || 0)}
                          icon={Icon.Star}
                        />
                        <List.Item.Detail.Metadata.Label
                          title="Distance Traveled"
                          text={formatDistance(parsedData.cached_distance || 0)}
                          icon={Icon.Gauge}
                        />
                        <List.Item.Detail.Metadata.Label
                          title="Customization Points"
                          text={(parsedData.customization || 0).toLocaleString()}
                          icon={Icon.Brush}
                        />
                        <List.Item.Detail.Metadata.Separator />
                        <List.Item.Detail.Metadata.Label
                          title="Current Truck"
                          text={parsedData.brand?.replace(/_/g, " ").toUpperCase() || "N/A"}
                          icon={Icon.Car}
                        />
                        <List.Item.Detail.Metadata.Separator />
                        <List.Item.Detail.Metadata.TagList title="Active Mods">
                          {parsedData.active_mods !== 0 ? (
                            parsedData.active_mods.map((mod) => {
                              const modParts = mod.split("|");
                              const modId = modParts[0];
                              const modName = modParts[1];
                              return (
                                <List.Item.Detail.Metadata.TagList.Item
                                  key={modId}
                                  text={modName}
                                  color={Color.PrimaryText}
                                />
                              );
                            })
                          ) : (
                            <List.Item.Detail.Metadata.TagList.Item
                              text="No Mods"
                              icon={Icon.XMarkCircle}
                              color={Color.Red}
                            />
                          )}
                        </List.Item.Detail.Metadata.TagList>
                        <List.Item.Detail.Metadata.Separator />
                        <List.Item.Detail.Metadata.Label
                          title="Created"
                          text={formatDate(parsedData.creation_time || 0)}
                          icon={Icon.Calendar}
                        />
                        <List.Item.Detail.Metadata.Label
                          title="Last Saved"
                          text={formatDate(parsedData.save_time || 0)}
                          icon={Icon.Clock}
                        />
                        <List.Item.Detail.Metadata.Separator />
                      </>
                    )}
                    <List.Item.Detail.Metadata.Label title="Path" text={profile.path} icon={Icon.Folder} />
                  </List.Item.Detail.Metadata>
                }
              />
            }
          />
        );
      })}
    </List>
  );
}
