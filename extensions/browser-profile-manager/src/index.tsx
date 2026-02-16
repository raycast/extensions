import {
  Action,
  ActionPanel,
  List,
  Toast,
  showToast,
  useNavigation,
} from "@raycast/api";
import { useEffect, useMemo, useState } from "react";
import { ManageTagsForm } from "./forms/ManageTagsForm";
import { RenameProfileForm } from "./forms/RenameProfileForm";
import { useBrowserIcons } from "./hooks/useBrowserIcons";
import { useBrowserProfiles } from "./hooks/useBrowserProfiles";
import { removeProfileAlias } from "./storage";
import { ResolvedBrowserProfile } from "./types";
import { BrowserLaunchError, launchBrowserProfile } from "./utils";

const ALL_TAGS = "all";

export default function Command() {
  const { push } = useNavigation();
  const { profiles, isLoading, refresh } = useBrowserProfiles();
  const { browserIcons } = useBrowserIcons();
  const [selectedTag, setSelectedTag] = useState(ALL_TAGS);
  const [searchText, setSearchText] = useState("");

  const allTags = useMemo(() => {
    const set = new Set<string>();
    for (const profile of profiles) {
      for (const tag of profile.tags) {
        set.add(tag);
      }
    }

    return [...set].sort((left, right) =>
      left.localeCompare(right, undefined, { sensitivity: "base" }),
    );
  }, [profiles]);

  const filteredProfiles = useMemo(() => {
    const searchTerms = normalizeForSearch(searchText)
      .split(/\s+/)
      .filter(Boolean);

    return profiles.filter((profile) => {
      if (selectedTag !== ALL_TAGS && !profile.tags.includes(selectedTag)) {
        return false;
      }

      if (searchTerms.length === 0) {
        return true;
      }

      const searchableText = normalizeForSearch(
        [
          profile.displayName,
          profile.originalName,
          profile.alias ?? "",
          profile.browser,
          ...profile.tags,
        ].join(" "),
      );

      return searchTerms.every((term) => searchableText.includes(term));
    });
  }, [profiles, searchText, selectedTag]);

  useEffect(() => {
    if (selectedTag !== ALL_TAGS && !allTags.includes(selectedTag)) {
      setSelectedTag(ALL_TAGS);
    }
  }, [allTags, selectedTag]);

  async function handleOpenProfile(profile: ResolvedBrowserProfile) {
    const openingToast = await showToast({
      style: Toast.Style.Animated,
      title: "Opening Profile",
      message: `${profile.displayName} (${profile.browser})`,
    });

    try {
      await launchBrowserProfile(profile);
      openingToast.style = Toast.Style.Success;
      openingToast.title = "Profile Opened";
      openingToast.message = `${profile.displayName} (${profile.browser})`;
    } catch (error) {
      openingToast.style = Toast.Style.Failure;
      openingToast.title =
        error instanceof BrowserLaunchError &&
        error.code === "BROWSER_NOT_FOUND"
          ? "Browser Not Found"
          : "Couldn't Open Profile";
      openingToast.message =
        error instanceof Error ? error.message : "Unknown error";
    }
  }

  async function handleRemoveAlias(profile: ResolvedBrowserProfile) {
    try {
      await removeProfileAlias(profile.id);
      await refresh();
      await showToast({
        style: Toast.Style.Success,
        title: "Alias Removed",
      });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Couldn't Remove Alias",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  return (
    <List
      filtering={false}
      isLoading={isLoading}
      searchBarPlaceholder="Search profiles by name or tag"
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarAccessory={
        <List.Dropdown
          tooltip="Filter by tag"
          storeValue
          onChange={setSelectedTag}
        >
          <List.Dropdown.Item title="All" value={ALL_TAGS} />
          {allTags.map((tag) => (
            <List.Dropdown.Item key={tag} title={tag} value={tag} />
          ))}
        </List.Dropdown>
      }
    >
      {filteredProfiles.map((profile) => (
        <List.Item
          key={profile.id}
          title={profile.displayName}
          subtitle={profile.browser}
          keywords={[
            profile.originalName,
            profile.alias ?? "",
            ...profile.tags,
          ]}
          accessories={[
            { icon: browserIcons[profile.browser], tooltip: profile.browser },
            ...profile.tags.map((tag) => ({ tag: { value: tag } })),
          ]}
          actions={
            <ActionPanel>
              <Action
                title="Open Profile"
                onAction={() => void handleOpenProfile(profile)}
              />
              <ActionPanel.Section title="Manage">
                <Action
                  title="Rename Profile"
                  onAction={() =>
                    push(
                      <RenameProfileForm
                        profile={profile}
                        onSaved={async () => {
                          await refresh();
                        }}
                      />,
                    )
                  }
                />
                <Action
                  title="Manage Tags"
                  onAction={() =>
                    push(
                      <ManageTagsForm
                        profile={profile}
                        availableTags={allTags}
                        onSaved={async () => {
                          await refresh();
                        }}
                      />,
                    )
                  }
                />
                {profile.alias ? (
                  <Action
                    title="Remove Alias"
                    style={Action.Style.Destructive}
                    onAction={() => void handleRemoveAlias(profile)}
                  />
                ) : null}
              </ActionPanel.Section>
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

function normalizeForSearch(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}
