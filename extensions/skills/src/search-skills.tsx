import { List, ActionPanel, Action, Icon } from "@raycast/api";
import { useState } from "react";

import { CommandEmptyView, CommandErrorDetail, RetryAction } from "./components/CommandStates";
import { SkillListItem } from "./components/SkillListItem";
import { useOwnerFilter } from "./hooks/useOwnerFilter";
import { useDebouncedSearch } from "./hooks/useDebouncedSearch";
import { buildGithubIssueUrl } from "./shared";

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isShowingDetail, setIsShowingDetail] = useState(true);
  const toggleDetail = () => setIsShowingDetail((prev) => !prev);

  const { data, isLoading, error, revalidate, searchUrl } = useDebouncedSearch(searchText);

  const { owner, setOwner, ownerCounts, skills } = useOwnerFilter(data?.skills ?? []);

  if (error && !data) {
    return (
      <CommandErrorDetail
        title="Unable to Load Search Results"
        message={error.message}
        detailsMarkdown="The Skills API request failed, so the primary search content could not be shown.\n\nRetry the search. If the problem persists, report it on GitHub."
        actions={
          <ActionPanel>
            <RetryAction onAction={revalidate} />
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
      isShowingDetail={skills.length > 0 && isShowingDetail}
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
        <CommandEmptyView
          title="Search Skills"
          description="Type at least 2 characters to search."
          icon={Icon.MagnifyingGlass}
        />
      ) : skills.length === 0 && !isLoading ? (
        <CommandEmptyView
          title="No Search Results"
          description={`No results found for "${searchText}". Try different keywords.`}
          icon={Icon.MagnifyingGlass}
          actions={
            <ActionPanel>
              <RetryAction onAction={revalidate} />
            </ActionPanel>
          }
        />
      ) : (
        <List.Section title={`Results for "${searchText}"`} subtitle={`${skills.length} skills`}>
          {skills.map((skill) => (
            <SkillListItem
              key={skill.id}
              skill={skill}
              isSelected={selectedId === skill.id}
              isShowingDetail={isShowingDetail}
              onToggleDetail={toggleDetail}
            />
          ))}
        </List.Section>
      )}
    </List>
  );
}
