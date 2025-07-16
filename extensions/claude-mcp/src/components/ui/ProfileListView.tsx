/**
 * Profile list view component following Single Responsibility Principle
 * Pure UI component that only handles rendering, no business logic
 */

import React from "react";
import { List, ActionPanel, Action, Icon, Color, confirmAlert, showToast, Toast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { ProfileSummary } from "../../types/profile-types";
import ProfileDetailView from "../ProfileDetailView";
import EditProfileForm from "../EditProfileForm";
import { deleteProfile } from "../../utils/storage";

export interface ProfileListViewProps {
  profiles: ProfileSummary[];
  isLoading: boolean;
  error: string | null;
  searchQuery: string;
  sortBy: "name" | "created" | "lastUsed" | "serverCount";
  sortOrder: "asc" | "desc";
  onSearchQueryChange: (query: string) => void;
  onSortToggle: (field: "name" | "created" | "lastUsed" | "serverCount") => void;
  onCreateProfile: () => void;
  onRefresh: () => void;
  onRetry: () => void;
}

export function ProfileListView({
  profiles,
  isLoading,
  error,
  searchQuery,
  sortBy,
  sortOrder,
  onSearchQueryChange,
  onSortToggle,
  onCreateProfile,
  onRefresh,
  onRetry,
}: ProfileListViewProps) {
  const handleDeleteProfile = async (profile: ProfileSummary) => {
    const shouldDelete = await confirmAlert({
      title: `Delete "${profile.name}"?`,
      message: `Are you sure you want to delete this profile? This action cannot be undone.${
        profile.isActive ? "\n\n⚠️ Warning: This is the currently active profile." : ""
      }`,
      primaryAction: {
        title: "Delete",
      },
      dismissAction: {
        title: "Cancel",
      },
    });

    if (!shouldDelete) {
      return;
    }

    try {
      const deleteResult = await deleteProfile(profile.id);

      if (!deleteResult.success) {
        await showFailureToast({
          title: "Failed to delete profile",
          message: deleteResult.error ?? "Unknown error occurred",
        });
        return;
      }

      await showToast({
        style: Toast.Style.Success,
        title: "Profile deleted",
        message: `"${profile.name}" has been deleted`,
      });

      onRefresh();
    } catch (error) {
      await showFailureToast({
        title: "Failed to delete profile",
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

  const getProfileSubtitle = (profile: ProfileSummary) => {
    const parts = [];

    if (profile.description) {
      parts.push(profile.description);
    }

    if (profile.serverCount > 0) {
      parts.push(`${profile.serverCount} server${profile.serverCount !== 1 ? "s" : ""}`);
    }

    return parts.join(" • ");
  };

  const getProfileAccessories = (profile: ProfileSummary) => {
    const accessories = [];

    if (profile.isActive) {
      accessories.push({
        text: "Active",
        icon: { source: Icon.CheckCircle, tintColor: Color.Green },
      });
    }

    // Show last used date if available
    if (profile.lastUsed) {
      const lastUsedDate = new Date(profile.lastUsed);
      const now = new Date();
      const diffMs = now.getTime() - lastUsedDate.getTime();
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      if (diffDays === 0) {
        accessories.push({ text: "Used today" });
      } else if (diffDays === 1) {
        accessories.push({ text: "Used yesterday" });
      } else if (diffDays < 7) {
        accessories.push({ text: `Used ${diffDays} days ago` });
      } else {
        accessories.push({ text: `Used ${lastUsedDate.toLocaleDateString()}` });
      }
    } else {
      // Show creation date for profiles that haven't been used
      const createdDate = new Date(profile.createdAt);
      const now = new Date();
      const diffMs = now.getTime() - createdDate.getTime();
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      if (diffDays === 0) {
        accessories.push({ text: "Created today" });
      } else if (diffDays === 1) {
        accessories.push({ text: "Created yesterday" });
      } else if (diffDays < 7) {
        accessories.push({ text: `Created ${diffDays} days ago` });
      } else {
        accessories.push({ text: `Created ${createdDate.toLocaleDateString()}` });
      }
    }

    return accessories;
  };

  if (error) {
    return (
      <List>
        <List.EmptyView
          icon={{ source: Icon.ExclamationMark, tintColor: Color.Red }}
          title="Error Loading Profiles"
          description={error}
          actions={
            <ActionPanel>
              <Action title="Retry" onAction={onRetry} icon={Icon.ArrowClockwise} />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search profiles..."
      navigationTitle="MCP Profiles"
      searchText={searchQuery}
      onSearchTextChange={onSearchQueryChange}
    >
      {profiles.length === 0 ? (
        <List.EmptyView
          icon={{ source: Icon.Folder, tintColor: Color.SecondaryText }}
          title="No Profiles Found"
          description="Create your first MCP profile to get started with managing your Claude Desktop configurations"
          actions={
            <ActionPanel>
              <Action title="Refresh" onAction={onRefresh} icon={Icon.ArrowClockwise} />
              <Action title="Create Profile" onAction={onCreateProfile} icon={Icon.Plus} />
            </ActionPanel>
          }
        />
      ) : (
        profiles.map((profile) => (
          <List.Item
            key={profile.id}
            icon={getProfileIcon(profile)}
            title={profile.name}
            subtitle={getProfileSubtitle(profile)}
            accessories={getProfileAccessories(profile)}
            actions={
              <ActionPanel>
                <ActionPanel.Section>
                  <Action.Push
                    title="View Details"
                    target={<ProfileDetailView profileId={profile.id} onRefresh={onRefresh} />}
                    icon={Icon.Eye}
                  />
                </ActionPanel.Section>
                <ActionPanel.Section>
                  <Action.Push
                    title="Edit Profile"
                    target={<EditProfileForm profileId={profile.id} onRefresh={onRefresh} />}
                    icon={Icon.Pencil}
                    shortcut={{ modifiers: ["cmd"], key: "e" }}
                  />
                  <Action
                    title="Delete Profile"
                    onAction={() => handleDeleteProfile(profile)}
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "d" }}
                  />
                </ActionPanel.Section>
                <ActionPanel.Section>
                  <Action
                    title="Refresh"
                    onAction={onRefresh}
                    icon={Icon.ArrowClockwise}
                    shortcut={{ modifiers: ["cmd"], key: "r" }}
                  />
                  <Action
                    title="Create New Profile"
                    onAction={onCreateProfile}
                    icon={Icon.Plus}
                    shortcut={{ modifiers: ["cmd"], key: "n" }}
                  />
                  <Action
                    title={`Sort by ${sortBy === "name" ? "Name" : sortBy === "created" ? "Created" : sortBy === "lastUsed" ? "Last Used" : "Server Count"} (${sortOrder === "asc" ? "A-Z" : "Z-A"})`}
                    onAction={() => onSortToggle(sortBy)}
                    icon={sortOrder === "asc" ? Icon.ArrowUp : Icon.ArrowDown}
                    shortcut={{ modifiers: ["cmd"], key: "s" }}
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}
