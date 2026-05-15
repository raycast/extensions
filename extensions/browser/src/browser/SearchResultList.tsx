import { Action, ActionPanel, List, Toast, showToast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { useMemo, useState } from "react";

import { DEFAULT_BROWSER_ITEM_ID } from "./constants";
import { ProfileEditor } from "./ProfileEditor";
import { ProfileManager } from "./ProfileManager";
import { buildSearchUrl, openSearch } from "./search";
import {
  findProfileByHint,
  matchesProfileHint,
  normalize,
  setDefaultProfile,
  sortProfiles,
  upsertProfile,
} from "./profileUtils";
import type { BrowserProfile, ProfilesState } from "./types";

type SearchResultListProps = ProfilesState & {
  isLoading: boolean;
  query: string;
  profileHint: string;
};

export function SearchResultList({ query, profileHint, profiles, setProfiles, isLoading }: SearchResultListProps) {
  const [profileFilter, setProfileFilter] = useState(profileHint);

  const sortedProfiles = useMemo(() => sortProfiles(profiles), [profiles]);
  const profileFromArgument = useMemo(
    () => findProfileByHint(sortedProfiles, profileHint),
    [sortedProfiles, profileHint],
  );

  const filteredProfiles = useMemo(() => {
    const normalizedFilter = normalize(profileFilter);

    if (!normalizedFilter) {
      return sortedProfiles;
    }

    return sortedProfiles.filter((profile) => matchesProfileHint(profile, normalizedFilter));
  }, [sortedProfiles, profileFilter]);

  const normalizedFilter = normalize(profileFilter);
  const showDefaultBrowserItem = !normalizedFilter || "default browser".includes(normalizedFilter);

  async function makeDefaultProfile(profile: BrowserProfile) {
    await setProfiles(setDefaultProfile(sortProfiles(upsertProfile(profiles, profile)), profile.id));
  }

  async function deleteProfile(profileId: string) {
    await setProfiles(profiles.filter((entry) => entry.id !== profileId));
  }

  async function launchSearch(profile?: BrowserProfile) {
    try {
      await openSearch(query, profile);
      await showToast({
        style: Toast.Style.Success,
        title: profile ? `Opened in ${profile.name}` : "Opened in default browser",
      });
    } catch (error) {
      await showFailureToast(error, { title: "Could not open browser search" });
    }
  }

  return (
    <List
      isLoading={isLoading}
      filtering={false}
      searchBarPlaceholder="Filter profiles like a dropdown"
      searchText={profileFilter}
      onSearchTextChange={setProfileFilter}
      selectedItemId={
        profileFromArgument?.id ?? (showDefaultBrowserItem ? DEFAULT_BROWSER_ITEM_ID : filteredProfiles[0]?.id)
      }
    >
      {query.length === 0 ? (
        <List.EmptyView
          title="Type your search query when launching Browser"
          description="Open the command with text after its name, then pick a browser profile from the list."
          actions={
            <ActionPanel>
              <Action.Push
                title="Manage Profiles"
                target={<ProfileManager profiles={profiles} setProfiles={setProfiles} />}
              />
            </ActionPanel>
          }
        />
      ) : (
        <>
          <List.Section title={`Search for ${query}`}>
            {showDefaultBrowserItem ? (
              <List.Item
                id={DEFAULT_BROWSER_ITEM_ID}
                title="Default browser"
                subtitle={buildSearchUrl(query)}
                actions={
                  <ActionPanel>
                    <Action title="Search" onAction={() => launchSearch()} />
                    <Action.Push
                      title="Manage Profiles"
                      target={<ProfileManager profiles={profiles} setProfiles={setProfiles} />}
                    />
                  </ActionPanel>
                }
              />
            ) : null}
            {filteredProfiles.map((profile) => (
              <List.Item
                key={profile.id}
                id={profile.id}
                title={profile.name}
                subtitle={`${profile.browserApp} · ${profile.profileDirectory}${profile.isDefault ? " · Default" : ""}`}
                accessories={profileFromArgument?.id === profile.id ? [{ tag: { value: "From argument" } }] : undefined}
                actions={
                  <ActionPanel>
                    <Action title="Search" onAction={() => launchSearch(profile)} />
                    <Action.Push
                      title="Edit Profile"
                      target={<ProfileEditor profile={profile} profiles={profiles} setProfiles={setProfiles} />}
                    />
                    <Action title="Make Default" onAction={() => makeDefaultProfile(profile)} />
                    <Action title="Delete Profile" onAction={() => deleteProfile(profile.id)} />
                    <Action.Push
                      title="Manage Profiles"
                      target={<ProfileManager profiles={profiles} setProfiles={setProfiles} />}
                    />
                  </ActionPanel>
                }
              />
            ))}
          </List.Section>
          {!showDefaultBrowserItem && filteredProfiles.length === 0 ? (
            <List.EmptyView
              title="No matching profile"
              description={`No profile matches. Press Enter to create a new profile using that name.`}
              actions={
                <ActionPanel>
                  <Action.Push
                    title={`Create Profile "${profileFilter}"`}
                    target={<ProfileEditor initialName={profileFilter} profiles={profiles} setProfiles={setProfiles} />}
                  />
                  <Action.Push
                    title="Manage Profiles"
                    target={<ProfileManager profiles={profiles} setProfiles={setProfiles} />}
                  />
                </ActionPanel>
              }
            />
          ) : null}
        </>
      )}
    </List>
  );
}
