import { List, getPreferenceValues, LocalStorage } from "@raycast/api";
import { useEffect, useState } from "react";

import type { PreferencesState } from "./types";
import { checkTokenScopes, useGithubRepos } from "./api/github";
import RepositoryListItem from "./components/RepositoryListItem";
import ConfigurationRequired from "./components/ConfigurationRequired";
import InvalidToken from "./components/InvalidToken";
import EmptyScreen from "./components/EmptyScreen";

export default function SearchRepositories() {
  const [searchText, setSearchText] = useState("");
  const [tokenValid, setTokenValid] = useState<boolean | null>(null);
  const [tokenScopes, setTokenScopes] = useState<string[]>([]);
  const [bookmarkedRepos, setBookmarkedRepos] = useState<Set<number>>(
    new Set(),
  );

  const preferences = getPreferenceValues<PreferencesState>();

  const orgs = preferences.organizations
    .split(",")
    .map((org) => org.trim())
    .filter(Boolean);

  // Load bookmarks from LocalStorage on mount
  useEffect(() => {
    async function loadBookmarks() {
      const stored = await LocalStorage.getItem<string>("bookmarked-repos");
      if (stored) {
        try {
          const parsed = JSON.parse(stored) as number[];
          setBookmarkedRepos(new Set(parsed));
        } catch {
          // Invalid data, ignore
        }
      }
    }
    loadBookmarks();
  }, []);

  // Check token validity on mount
  useEffect(() => {
    async function validateToken() {
      if (!preferences.githubToken) {
        setTokenValid(false);
        return;
      }
      const { valid, scopes } = await checkTokenScopes(preferences.githubToken);
      setTokenValid(valid);
      setTokenScopes(scopes);
    }
    validateToken();
  }, [preferences.githubToken]);

  const { repositories, isLoading, error } = useGithubRepos(
    searchText,
    preferences,
  );

  const toggleBookmark = async (repoId: number) => {
    const newBookmarks = new Set(bookmarkedRepos);
    if (newBookmarks.has(repoId)) {
      newBookmarks.delete(repoId);
    } else {
      newBookmarks.add(repoId);
    }
    setBookmarkedRepos(newBookmarks);
    await LocalStorage.setItem(
      "bookmarked-repos",
      JSON.stringify(Array.from(newBookmarks)),
    );
  };

  // Sort repositories: bookmarked ones first, then by stars
  const sortedRepositories = [...repositories].sort((a, b) => {
    const aBookmarked = bookmarkedRepos.has(a.id);
    const bBookmarked = bookmarkedRepos.has(b.id);
    if (aBookmarked && !bBookmarked) return -1;
    if (!aBookmarked && bBookmarked) return 1;
    return 0; // Keep original order (already sorted by stars from API)
  });

  if (!preferences.githubToken || orgs.length === 0) {
    return (
      <ConfigurationRequired
        missingToken={!preferences.githubToken}
        missingOrganizations={orgs.length === 0}
      />
    );
  }

  if (tokenValid === false) {
    return <InvalidToken scopes={tokenScopes} />;
  }

  if (tokenValid === null) {
    return <List isLoading={true} searchBarPlaceholder="Validating token..." />;
  }

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search repositories..."
      throttle
    >
      {sortedRepositories.length === 0 && !isLoading ? (
        <EmptyScreen error={error} hasSearchText={searchText.length > 0} />
      ) : (
        sortedRepositories.map((repo) => (
          <RepositoryListItem
            key={repo.id}
            repo={repo}
            isBookmarked={bookmarkedRepos.has(repo.id)}
            onToggleBookmark={toggleBookmark}
            cloneDirectory={preferences.cloneDirectory}
          />
        ))
      )}
    </List>
  );
}
