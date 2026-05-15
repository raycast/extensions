import { useState, useEffect, useCallback } from "react";
import {
  List,
  Icon,
  Color,
  Action,
  ActionPanel,
  showToast,
  Toast,
  Clipboard,
  confirmAlert,
  Alert,
  LaunchProps,
} from "@raycast/api";
import {
  readProfiles,
  activateProfile,
  getCurrentProfile,
  getTrafficInfo,
  formatTime,
  formatExpire,
  switchProfileFast,
  updateProfileContent,
  findUidByShortcut,
  ProfileItem,
  ProfilesConfig,
} from "./utils/profiles";
import ProfileForm from "./profile-form";
import { reloadConfigs } from "./utils/api";

// --- Type icons ---

function profileTypeIcon(type: string): Icon {
  switch (type) {
    case "remote":
      return Icon.Globe;
    case "local":
      return Icon.Document;
    case "merge":
      return Icon.Layers;
    case "script":
      return Icon.Code;
    default:
      return Icon.Document;
  }
}

function profileTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    remote: "Remote",
    local: "Local",
    merge: "Merge",
    script: "Script",
  };
  return labels[type] || type;
}

// --- Main Command ---

interface Arguments {
  shortcut?: string;
}

export default function ManageProfiles(
  props: LaunchProps<{ arguments: Arguments }>,
) {
  const [profiles, setProfiles] = useState<ProfilesConfig>({ items: [] });
  const [isLoading, setIsLoading] = useState(true);

  const fetchProfiles = useCallback(() => {
    try {
      setIsLoading(true);
      const data = readProfiles();
      setProfiles(data);
      return data;
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to read profiles",
        message: error instanceof Error ? error.message : String(error),
      });
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const data = fetchProfiles();
    if (data && props.arguments.shortcut) {
      const shortcut = props.arguments.shortcut.trim();
      const targetUid = findUidByShortcut(shortcut);
      const targetProfile = data.items?.find((p) => p.uid === targetUid);

      if (targetProfile) {
        handleActivate(targetProfile);
      } else {
        showToast({
          style: Toast.Style.Failure,
          title: "Profile not found",
          message: `No profile found with shortcut "${shortcut}"`,
        });
      }
    }
  }, [fetchProfiles]);

  const handleActivate = async (profile: ProfileItem) => {
    try {
      await showToast({
        style: Toast.Style.Animated,
        title: "Switching profile...",
      });

      // Step 1: Update profiles.yaml
      activateProfile(profile.uid);

      // Step 2: Merge infrastructure + new profile content, write clash-verge.yaml
      if (profile.file) {
        const configPath = switchProfileFast(profile.file);
        console.log("[Profile] Fast switch: merged config at", configPath);

        // Step 3: Reload Mihomo core with the merged config
        await reloadConfigs(configPath);
      }

      fetchProfiles();

      await showToast({
        style: Toast.Style.Success,
        title: "Profile activated",
        message: `Switched to: ${profile.name || profile.uid}`,
      });
    } catch (error) {
      console.error("[Profile] Activation failed:", error);
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to activate profile",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  };

  const handleCopyUrl = async (url: string) => {
    await Clipboard.copy(url);
    showToast({
      style: Toast.Style.Success,
      title: "URL copied to clipboard",
    });
  };

  const currentProfile = getCurrentProfile(profiles);
  const items = profiles.items || [];

  // Separate into main profiles (remote/local) and enhanced profiles (merge/script)
  const mainProfiles = items.filter(
    (p) => p.type === "remote" || p.type === "local",
  );
  const enhancedProfiles = items.filter(
    (p) => p.type === "merge" || p.type === "script",
  );

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search profiles...">
      {mainProfiles.length > 0 && (
        <List.Section
          title="Subscriptions"
          subtitle={`${mainProfiles.length} profiles`}
        >
          {mainProfiles.map((profile) => {
            const isActive = profile.uid === profiles.current;
            const trafficInfo = getTrafficInfo(profile);

            return (
              <List.Item
                key={profile.uid}
                title={profile.name || profile.uid}
                subtitle={profile.desc || profileTypeLabel(profile.type)}
                icon={{
                  source: isActive
                    ? Icon.CheckCircle
                    : profileTypeIcon(profile.type),
                  tintColor: isActive ? Color.Green : Color.SecondaryText,
                }}
                accessories={[
                  ...(trafficInfo ? [{ text: trafficInfo }] : []),
                  ...(profile.extra?.expire
                    ? [{ text: formatExpire(profile.extra.expire) }]
                    : []),
                  ...(isActive
                    ? [{ tag: { value: "Active", color: Color.Green } }]
                    : []),
                  { text: profileTypeLabel(profile.type) },
                ]}
                actions={
                  <ActionPanel>
                    {!isActive && (
                      <Action
                        title="Activate Profile"
                        icon={Icon.CheckCircle}
                        onAction={() => handleActivate(profile)}
                      />
                    )}
                    <Action.Push
                      title="Edit Profile"
                      icon={Icon.Pencil}
                      shortcut={{ modifiers: ["cmd"], key: "e" }}
                      target={
                        <ProfileForm
                          profile={profile}
                          onRefresh={fetchProfiles}
                        />
                      }
                    />
                    {profile.url && (
                      <Action
                        title="Copy Subscription URL"
                        icon={Icon.Clipboard}
                        shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                        onAction={() => handleCopyUrl(profile.url!)}
                      />
                    )}
                    <Action
                      title="Refresh List"
                      icon={Icon.ArrowClockwise}
                      shortcut={{ modifiers: ["cmd"], key: "r" }}
                      onAction={fetchProfiles}
                    />
                  </ActionPanel>
                }
              />
            );
          })}
        </List.Section>
      )}

      {enhancedProfiles.length > 0 && (
        <List.Section
          title="Enhanced Profiles"
          subtitle={`${enhancedProfiles.length} profiles`}
        >
          {enhancedProfiles.map((profile) => {
            const isActive = profile.uid === profiles.current;

            return (
              <List.Item
                key={profile.uid}
                title={profile.name || profile.uid}
                subtitle={profile.desc || profileTypeLabel(profile.type)}
                icon={{
                  source: profileTypeIcon(profile.type),
                  tintColor: Color.SecondaryText,
                }}
                accessories={[{ text: profileTypeLabel(profile.type) }]}
                actions={
                  <ActionPanel>
                    <Action.Push
                      title="Edit Profile"
                      icon={Icon.Pencil}
                      shortcut={{ modifiers: ["cmd"], key: "e" }}
                      target={
                        <ProfileForm
                          profile={profile}
                          onRefresh={fetchProfiles}
                        />
                      }
                    />
                    <Action
                      title="Refresh List"
                      icon={Icon.ArrowClockwise}
                      shortcut={{ modifiers: ["cmd"], key: "r" }}
                      onAction={fetchProfiles}
                    />
                  </ActionPanel>
                }
              />
            );
          })}
        </List.Section>
      )}
    </List>
  );
}
