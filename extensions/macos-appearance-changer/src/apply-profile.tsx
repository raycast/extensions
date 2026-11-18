import { Action, ActionPanel, Alert, confirmAlert, Grid, Icon, showToast, Toast, useNavigation } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { applyProfile as applyProfileToSystem } from "swift:../swift";
import { Profiles } from "./lib/profiles";
import { Thumbnails } from "./lib/thumbnails";
import { resolveIconThemePreference } from "./utils/resolve-icon-theme.util";
import { profileSubtitle } from "./utils/profile-subtitle.util";
import CreateProfile from "./create-profile";
import { capitalize } from "./utils/capitalize.util";
import { APPEARANCE_ICONS } from "./constants/appearance-icons.constant";
import type { Profile } from "./types/types";

export default function ApplyProfile() {
  const { push } = useNavigation();
  const { data: profiles, isLoading: profilesLoading, revalidate } = usePromise(Profiles.getAll);

  const { data: thumbnails, isLoading: thumbnailsLoading } = usePromise(Thumbnails.generateAll, [profiles ?? []], {
    execute: !!profiles?.length,
  });

  const isLoading = profilesLoading || thumbnailsLoading;

  const applySelectedProfile = async (profile: Profile) => {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Applying profile…",
      message: profile.name,
    });

    try {
      const iconTheme = resolveIconThemePreference(profile.iconStyle, profile.iconMode);
      await applyProfileToSystem(profile.wallpaperPath, iconTheme, profile.appearance);
      toast.style = Toast.Style.Success;
      toast.title = "Profile applied";
      toast.message = profile.name;
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to apply profile";
      toast.message = String(error);
    }
  };

  const confirmDeleteProfile = async (profile: Profile) => {
    const confirmed = await confirmAlert({
      title: "Delete Profile",
      message: `Are you sure you want to delete "${profile.name}"?`,
      primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
    });
    if (confirmed) {
      await Profiles.delete(profile.id);
      await showToast({ style: Toast.Style.Success, title: "Profile deleted" });
      revalidate();
    }
  };

  const profileContent = (profile: Profile, thumbnails?: Record<string, string>) => {
    const thumbnail = thumbnails?.[profile.id];
    if (thumbnail) {
      return { source: thumbnail };
    }
    if (profile.wallpaperPath) {
      return { source: profile.wallpaperPath };
    }
    return {
      source: APPEARANCE_ICONS[profile.appearance].source,
      tintColor: APPEARANCE_ICONS[profile.appearance].tintColor,
    };
  };

  return (
    <Grid
      isLoading={isLoading}
      columns={2}
      aspectRatio="16/9"
      fit={Grid.Fit.Fill}
      searchBarPlaceholder="Search profiles…"
    >
      {!profiles?.length ? (
        <Grid.EmptyView
          title="No Profiles"
          description="Create your first appearance profile"
          actions={
            <ActionPanel>
              <Action title="Create Profile" icon={Icon.Plus} onAction={() => push(<CreateProfile />, revalidate)} />
            </ActionPanel>
          }
        />
      ) : (
        profiles.map((profile) => (
          <Grid.Item
            key={profile.id}
            content={profileContent(profile, thumbnails)}
            title={capitalize(profile.name)}
            subtitle={profileSubtitle(profile)}
            actions={
              <ActionPanel>
                <Action title="Apply Profile" icon={Icon.Play} onAction={() => applySelectedProfile(profile)} />
                <Action
                  title="Edit Profile"
                  icon={Icon.Pencil}
                  shortcut={{ modifiers: ["cmd"], key: "e" }}
                  onAction={() => push(<CreateProfile existingProfile={profile} />, revalidate)}
                />
                <Action
                  title="Delete Profile"
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  shortcut={{ modifiers: ["ctrl"], key: "x" }}
                  onAction={() => confirmDeleteProfile(profile)}
                />
                <Action
                  title="Create Profile"
                  icon={Icon.Plus}
                  shortcut={{ modifiers: ["cmd"], key: "n" }}
                  onAction={() => push(<CreateProfile />, revalidate)}
                />
              </ActionPanel>
            }
          />
        ))
      )}
    </Grid>
  );
}
