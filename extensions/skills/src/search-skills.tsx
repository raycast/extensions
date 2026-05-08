import { List, ActionPanel, Action, Detail, Icon } from "@raycast/api";
import { useCallback, useState } from "react";

import { SkillListItem } from "./components/SkillListItem";
import { useInstalledSkillMatches } from "./hooks/useInstalledSkillMatches";
import { useOwnerFilter } from "./hooks/useOwnerFilter";
import { useDebouncedSearch } from "./hooks/useDebouncedSearch";
import { buildGithubIssueUrl } from "./shared";

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data, isLoading, error, revalidate: revalidateSearch, searchUrl } = useDebouncedSearch(searchText);
  const { getInstalledMatch, revalidate: revalidateInstalledSkillMatches } = useInstalledSkillMatches();
  const { owner, setOwner, ownerCounts, skills } = useOwnerFilter(data?.skills ?? []);

  const refreshCurrentResults = useCallback(async () => {
    await Promise.all([revalidateSearch(), revalidateInstalledSkillMatches()]);
  }, [revalidateSearch, revalidateInstalledSkillMatches]);

  if (error && !data) {
    return (
      <Detail
        markdown={`# Unable to Load Search Results\n\n**Error:** ${error.message}\n\n---\n\nThe Skills API request failed, so the primary search content could not be shown.\n\nRetry the search. If the problem persists, report it on GitHub.`}
        actions={
          <ActionPanel>
            <Action title="Retry" onAction={revalidateSearch} icon={Icon.RotateClockwise} />
            <Action.OpenInBrowser
              title="Report Issue on GitHub"
              url={buildGithubIssueUrl({
                title: "API Error",
                description: `Failed to fetch data from the Skills API: ${searchUrl}`,
                error,
                reproductionSteps: [
                  "Open Raycast and run the 'Search Skills' command.",
                  `Search for skills with the search query "${searchText}".`,
                  "Observe the resulting error.",
                ],
              })}
              icon={Icon.Bug}
            />
          </ActionPanel>
        }
      />
    );
  }

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search skills..."
      onSearchTextChange={setSearchText}
      onSelectionChange={setSelectedId}
      selectedItemId={selectedId ?? undefined}
      searchBarAccessory={
        <List.Dropdown tooltip="Filter by Owner" value={owner} storeValue onChange={setOwner}>
          <List.Dropdown.Item title="All Owners" value="all" />
          <List.Dropdown.Section title="Owners">
            {[...ownerCounts.entries()].map(([owner, count]) => (
              <List.Dropdown.Item key={owner} title={`${owner} (${count})`} value={owner} />
            ))}
          </List.Dropdown.Section>
        </List.Dropdown>
      }
    >
      {searchText.length < 2 ? (
        <List.EmptyView
          title="Search Skills"
          description="Type at least 2 characters to search."
          icon={Icon.MagnifyingGlass}
        />
      ) : skills.length === 0 && !isLoading ? (
        <List.EmptyView
          title="No Search Results"
          description={`No results found for "${searchText}". Try different keywords.`}
          icon={Icon.MagnifyingGlass}
          actions={
            <ActionPanel>
              <Action title="Retry" onAction={revalidateSearch} icon={Icon.RotateClockwise} />
            </ActionPanel>
          }
        />
      ) : (
        <List.Section title={`Results for "${searchText}"`} subtitle={`${skills.length} skills`}>
          {skills.map((skill) => (
            <SkillListItem
              key={skill.id}
              skill={skill}
              installedMatch={getInstalledMatch(skill)}
              onViewedSkillChange={setSelectedId}
              onSkillInstalled={refreshCurrentResults}
            />
          ))}
        </List.Section>
      )}
    </List>
  );
}
