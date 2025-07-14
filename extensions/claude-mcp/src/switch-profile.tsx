import { useState, useEffect } from "react";
import { List, ActionPanel, Action, Toast, showToast, Icon, Color, confirmAlert } from "@raycast/api";
import { getProfileSummaries, setActiveProfile, getActiveProfile } from "./utils/storage";
import { readClaudeConfig, writeClaudeConfig, backupConfig } from "./utils/config-manager";
import { validateProfile } from "./utils/validation";
import { restartClaudeWithRetry, isClaudeInstalled } from "./utils/process-manager";
import { ProfileSummary } from "./types";

interface SwitchProfileState {
  profiles: ProfileSummary[];
  activeProfileId: string | null;
  isLoading: boolean;
  error: string | null;
}

export default function SwitchProfile() {
  const [state, setState] = useState<SwitchProfileState>({
    profiles: [],
    activeProfileId: null,
    isLoading: true,
    error: null,
  });

  // Load profiles and active profile on mount
  useEffect(() => {
    loadProfiles();
  }, []);

  const loadProfiles = async () => {
    try {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      // Load profiles and active profile in parallel
      const [profilesResult, activeProfileResult] = await Promise.all([getProfileSummaries(), getActiveProfile()]);

      if (!profilesResult.success) {
        throw new Error(profilesResult.error || "Failed to load profiles");
      }

      if (!activeProfileResult.success) {
        throw new Error(activeProfileResult.error || "Failed to get active profile");
      }

      setState({
        profiles: profilesResult.data || [],
        activeProfileId: activeProfileResult.data ?? null,
        isLoading: false,
        error: null,
      });
    } catch (error) {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : "Failed to load profiles",
      }));

      await showToast({
        style: Toast.Style.Failure,
        title: "Error loading profiles",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  const switchToProfile = async (profile: ProfileSummary) => {
    try {
      // Show initial progress
      const toast = await showToast({
        style: Toast.Style.Animated,
        title: `Switching to ${profile.name}`,
        message: "Validating profile...",
      });

      // Check if Claude Desktop is installed
      const installedResult = await isClaudeInstalled();
      if (!installedResult.success) {
        throw new Error(installedResult.error || "Failed to check Claude Desktop installation");
      }

      if (!installedResult.data) {
        throw new Error("Claude Desktop is not installed at /Applications/Claude.app");
      }

      // Get the full profile for validation
      toast.message = "Loading profile configuration...";
      const profileResult = await import("./utils/storage").then((m) => m.getProfile(profile.id));

      if (!profileResult.success || !profileResult.data) {
        throw new Error(profileResult.error || "Failed to load profile");
      }

      const fullProfile = profileResult.data;

      // Validate profile before switching
      toast.message = "Validating profile configuration...";
      const validationResult = await validateProfile(fullProfile);

      if (!validationResult.valid) {
        const errorMessages = validationResult.errors.join(", ");
        throw new Error(`Profile validation failed: ${errorMessages}`);
      }

      if (validationResult.warnings.length > 0) {
        const warningMessages = validationResult.warnings.map((w) => w.message).join(", ");
        const shouldContinue = await confirmAlert({
          title: "Profile has warnings",
          message: `The profile has warnings: ${warningMessages}\n\nDo you want to continue switching?`,
          primaryAction: {
            title: "Continue",
          },
          dismissAction: {
            title: "Cancel",
          },
        });

        if (!shouldContinue) {
          toast.style = Toast.Style.Success;
          toast.title = "Profile switch cancelled";
          toast.message = "";
          return;
        }
      }

      // Check if already active
      if (profile.id === state.activeProfileId) {
        toast.style = Toast.Style.Success;
        toast.title = `${profile.name} is already active`;
        toast.message = "";
        return;
      }

      // Create backup of current configuration
      toast.message = "Creating backup of current configuration...";
      const backupResult = await backupConfig("profile_switch");

      if (!backupResult.success) {
        throw new Error(`Failed to create backup: ${backupResult.error}`);
      }

      const backupPath = backupResult.data!;

      // Read current configuration to preserve non-MCP settings
      toast.message = "Reading current configuration...";
      const currentConfigResult = await readClaudeConfig();

      if (!currentConfigResult.success) {
        throw new Error(`Failed to read current config: ${currentConfigResult.error}`);
      }

      const currentConfig = currentConfigResult.data || {};

      // Create new configuration with profile's MCP servers
      const newConfig = {
        ...currentConfig,
        mcpServers: fullProfile.mcpServers,
      };

      // Write new configuration
      toast.message = "Writing new configuration...";
      const writeResult = await writeClaudeConfig(newConfig, "profile_switch");

      if (!writeResult.success) {
        throw new Error(`Failed to write configuration: ${writeResult.error}`);
      }

      // Update active profile in storage
      toast.message = "Updating active profile...";
      const setActiveResult = await setActiveProfile(profile.id);

      if (!setActiveResult.success) {
        console.warn("Failed to update active profile in storage:", setActiveResult.error);
        // Don't fail the entire operation for this
      }

      // Restart Claude Desktop
      toast.message = "Restarting Claude Desktop...";
      const restartResult = await restartClaudeWithRetry();

      if (!restartResult.success) {
        // Attempt to restore backup
        console.error("Failed to restart Claude Desktop:", restartResult.error);

        toast.message = "Restart failed, attempting to restore backup...";
        try {
          const restoreResult = await import("./utils/config-manager").then((m) => m.restoreConfig(backupPath));

          if (restoreResult.success) {
            throw new Error(
              `Failed to restart Claude Desktop: ${restartResult.error}. Configuration has been restored from backup.`,
            );
          } else {
            throw new Error(
              `Failed to restart Claude Desktop: ${restartResult.error}. CRITICAL: Failed to restore backup. You may need to manually restore your Claude Desktop configuration.`,
            );
          }
        } catch (restoreError) {
          throw new Error(
            `Failed to restart Claude Desktop: ${restartResult.error}. CRITICAL: Failed to restore backup: ${restoreError instanceof Error ? restoreError.message : String(restoreError)}`,
          );
        }
      }

      // Update local state
      setState((prev) => ({
        ...prev,
        activeProfileId: profile.id,
        profiles: prev.profiles.map((p) => ({
          ...p,
          isActive: p.id === profile.id,
        })),
      }));

      // Show success
      toast.style = Toast.Style.Success;
      toast.title = `Switched to ${profile.name}`;
      toast.message = `Claude Desktop restarted in ${Math.round(restartResult.data!.totalTime / 1000)}s`;
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to switch profile",
        message: error instanceof Error ? error.message : "Unknown error occurred",
      });
    }
  };

  const getProfileIcon = (profile: ProfileSummary) => {
    if (profile.isActive) {
      return { source: Icon.CheckCircle, tintColor: Color.Green };
    }
    return { source: Icon.Circle, tintColor: Color.SecondaryText };
  };

  const getProfileAccessories = (profile: ProfileSummary) => {
    const accessories = [];

    if (profile.isActive) {
      accessories.push({ text: "Active", icon: { source: Icon.CheckCircle, tintColor: Color.Green } });
    }

    accessories.push({ text: `${profile.serverCount} server${profile.serverCount !== 1 ? "s" : ""}` });

    if (profile.lastUsed) {
      const lastUsedDate = new Date(profile.lastUsed);
      const now = new Date();
      const diffMs = now.getTime() - lastUsedDate.getTime();
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      if (diffDays === 0) {
        accessories.push({ text: "Today" });
      } else if (diffDays === 1) {
        accessories.push({ text: "Yesterday" });
      } else if (diffDays < 7) {
        accessories.push({ text: `${diffDays} days ago` });
      } else {
        accessories.push({ text: lastUsedDate.toLocaleDateString() });
      }
    }

    return accessories;
  };

  if (state.error) {
    return (
      <List>
        <List.EmptyView
          icon={{ source: Icon.ExclamationMark, tintColor: Color.Red }}
          title="Error Loading Profiles"
          description={state.error}
          actions={
            <ActionPanel>
              <Action title="Retry" onAction={loadProfiles} icon={Icon.ArrowClockwise} />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  return (
    <List isLoading={state.isLoading} searchBarPlaceholder="Search profiles..." navigationTitle="Switch MCP Profile">
      {state.profiles.length === 0 ? (
        <List.EmptyView
          icon={{ source: Icon.Folder, tintColor: Color.SecondaryText }}
          title="No Profiles Found"
          description="Create your first MCP profile to get started"
          actions={
            <ActionPanel>
              <Action title="Refresh" onAction={loadProfiles} icon={Icon.ArrowClockwise} />
            </ActionPanel>
          }
        />
      ) : (
        state.profiles.map((profile) => (
          <List.Item
            key={profile.id}
            icon={getProfileIcon(profile)}
            title={profile.name}
            subtitle={profile.description}
            accessories={getProfileAccessories(profile)}
            actions={
              <ActionPanel>
                <Action
                  title={profile.isActive ? "Already Active" : "Switch to Profile"}
                  onAction={() => switchToProfile(profile)}
                  icon={profile.isActive ? Icon.CheckCircle : Icon.ArrowRight}
                  style={profile.isActive ? Action.Style.Regular : Action.Style.Regular}
                />
                <Action title="Refresh" onAction={loadProfiles} icon={Icon.ArrowClockwise} />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}
