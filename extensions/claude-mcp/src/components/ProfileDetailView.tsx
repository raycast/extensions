/**
 * Profile detail view component following Single Responsibility Principle
 * Displays comprehensive profile information and provides action options
 */

import { useState, useEffect } from "react";
import {
  Detail,
  ActionPanel,
  Action,
  showToast,
  Toast,
  useNavigation,
  Icon,
  Color,
  open,
  confirmAlert,
} from "@raycast/api";
import { getProfile, getActiveProfile, deleteProfile } from "../utils/storage";
import { MCPProfile } from "../types";
import EditProfileForm from "./EditProfileForm";

interface ProfileDetailViewProps {
  profileId: string;
  onRefresh?: () => void;
}

export default function ProfileDetailView({ profileId, onRefresh }: ProfileDetailViewProps) {
  const { pop } = useNavigation();
  const [isLoading, setIsLoading] = useState(true);
  const [profile, setProfile] = useState<MCPProfile | null>(null);
  const [isActive, setIsActive] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadProfile();
  }, [profileId]);

  const loadProfile = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const [profileResult, activeResult] = await Promise.all([getProfile(profileId), getActiveProfile()]);

      if (!profileResult.success || !profileResult.data) {
        throw new Error(profileResult.error || "Profile not found");
      }

      const profileData = profileResult.data;
      setProfile(profileData);

      if (activeResult.success && activeResult.data === profileId) {
        setIsActive(true);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to load profile";
      setError(errorMessage);
      await showToast({
        style: Toast.Style.Failure,
        title: "Error loading profile",
        message: errorMessage,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSwitchProfile = async () => {
    if (!profile || isActive) return;

    try {
      await open(`raycast://extensions/benkim0414/claude-mcp/switch-profile`);

      await showToast({
        style: Toast.Style.Success,
        title: "Opening switch profile",
        message: `Switching to "${profile.name}"`,
      });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to switch profile",
        message: error instanceof Error ? error.message : "Unknown error occurred",
      });
    }
  };

  const handleDeleteProfile = async () => {
    if (!profile) return;

    const shouldDelete = await confirmAlert({
      title: `Delete "${profile.name}"?`,
      message: `Are you sure you want to delete this profile? This action cannot be undone.${
        isActive ? "\n\n⚠️ Warning: This is the currently active profile." : ""
      }`,
      primaryAction: {
        title: "Delete",
        style: Action.Style.Destructive,
      },
      dismissAction: {
        title: "Cancel",
      },
    });

    if (!shouldDelete) {
      return;
    }

    try {
      const deleteResult = await deleteProfile(profileId);

      if (!deleteResult.success) {
        throw new Error(deleteResult.error || "Failed to delete profile");
      }

      await showToast({
        style: Toast.Style.Success,
        title: "Profile deleted",
        message: `"${profile.name}" has been deleted`,
      });

      // Refresh parent list before navigating back
      onRefresh?.();

      // Navigate back to profiles list
      pop();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to delete profile",
        message: error instanceof Error ? error.message : "Unknown error occurred",
      });
    }
  };

  const getProfileDetailsMarkdown = () => {
    if (!profile) return "";

    const serverList = Object.entries(profile.mcpServers)
      .map(([name, config]) => {
        const envVarCount = config.env ? Object.keys(config.env).length : 0;
        const argsList = config.args.length > 0 ? `\n  - **Args**: \`${config.args.join(" ")}\`` : "";
        const envInfo = envVarCount > 0 ? `\n  - **Environment variables**: ${envVarCount}` : "";

        return `### ${name}
- **Command**: \`${config.command}\`${argsList}${envInfo}`;
      })
      .join("\n\n");

    const activeStatus = isActive
      ? `
✅ **This profile is currently active**

`
      : `
⭕ **This profile is not active**

`;

    const lastUsedInfo = profile.lastUsed
      ? `**Last Used**: ${profile.lastUsed.toLocaleDateString()} at ${profile.lastUsed.toLocaleTimeString()}\n\n`
      : "";

    const serverSection =
      Object.keys(profile.mcpServers).length > 0
        ? `## MCP Servers (${Object.keys(profile.mcpServers).length})

${serverList}`
        : `## MCP Servers (0)

*No MCP servers configured for this profile.*`;

    return `# ${profile.name}

${activeStatus}${profile.description ? `**Description**: ${profile.description}\n\n` : ""}**Created**: ${profile.createdAt.toLocaleDateString()} at ${profile.createdAt.toLocaleTimeString()}

${lastUsedInfo}${serverSection}`;
  };

  if (error) {
    return (
      <Detail
        markdown={`# Error Loading Profile

${error}

Please check that the profile exists and try again.`}
        actions={
          <ActionPanel>
            <Action title="Retry" onAction={loadProfile} icon={Icon.ArrowClockwise} />
            <Action title="Go Back" onAction={pop} icon={Icon.ArrowLeft} />
          </ActionPanel>
        }
      />
    );
  }

  return (
    <Detail
      isLoading={isLoading}
      markdown={getProfileDetailsMarkdown()}
      actions={
        profile && (
          <ActionPanel>
            <ActionPanel.Section>
              <Action
                title={isActive ? "Already Active" : "Switch to Profile"}
                onAction={handleSwitchProfile}
                icon={isActive ? Icon.CheckCircle : Icon.ArrowRight}
                style={isActive ? Action.Style.Regular : Action.Style.Regular}
              />
            </ActionPanel.Section>
            <ActionPanel.Section>
              <Action.Push
                title="Edit Profile"
                target={<EditProfileForm profileId={profileId} onRefresh={onRefresh} />}
                icon={Icon.Pencil}
                shortcut={{ modifiers: ["cmd"], key: "e" }}
              />
              <Action
                title="Delete Profile"
                onAction={handleDeleteProfile}
                icon={Icon.Trash}
                style={Action.Style.Destructive}
                shortcut={{ modifiers: ["cmd", "shift"], key: "d" }}
              />
            </ActionPanel.Section>
            <ActionPanel.Section>
              <Action
                title="Refresh"
                onAction={loadProfile}
                icon={Icon.ArrowClockwise}
                shortcut={{ modifiers: ["cmd"], key: "r" }}
              />
              <Action
                title="Go Back"
                onAction={pop}
                icon={Icon.ArrowLeft}
                shortcut={{ modifiers: ["cmd"], key: "escape" }}
              />
            </ActionPanel.Section>
          </ActionPanel>
        )
      }
      metadata={
        profile && (
          <Detail.Metadata>
            <Detail.Metadata.Label title="Profile ID" text={profile.id} />
            <Detail.Metadata.Label title="Name" text={profile.name} />
            {profile.description && <Detail.Metadata.Label title="Description" text={profile.description} />}
            <Detail.Metadata.Separator />
            <Detail.Metadata.Label
              title="Status"
              text={isActive ? "Active" : "Inactive"}
              icon={isActive ? { source: Icon.CheckCircle, tintColor: Color.Green } : { source: Icon.Circle }}
            />
            <Detail.Metadata.Label title="Servers" text={Object.keys(profile.mcpServers).length.toString()} />
            <Detail.Metadata.Separator />
            <Detail.Metadata.Label
              title="Created"
              text={`${profile.createdAt.toLocaleDateString()} ${profile.createdAt.toLocaleTimeString()}`}
            />
            {profile.lastUsed && (
              <Detail.Metadata.Label
                title="Last Used"
                text={`${profile.lastUsed.toLocaleDateString()} ${profile.lastUsed.toLocaleTimeString()}`}
              />
            )}
          </Detail.Metadata>
        )
      }
    />
  );
}
