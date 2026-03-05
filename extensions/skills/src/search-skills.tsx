import { List, ActionPanel, Action, Icon, Detail } from "@raycast/api";
import { useState } from "react";

import { SkillListItem } from "./components/SkillListItem";
import { useOwnerFilter } from "./hooks/useOwnerFilter";
import { useDebouncedSearch } from "./hooks/useDebouncedSearch";
import { buildIssueUrl } from "./shared";

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isShowingDetail, setIsShowingDetail] = useState(true);
  const toggleDetail = () => setIsShowingDetail((prev) => !prev);

  const { data, isLoading, error, revalidate, searchUrl } = useDebouncedSearch(searchText);

  const { owner, setOwner, ownerCounts, skills } = useOwnerFilter(data?.skills ?? []);

  if (error && !data) {
    return (
      <Detail
        markdown={`# API Error\n\nFailed to fetch data from the Skills API.\n\n**Error:** ${error.message}\n\n---\n\nIf the problem persists, please report it via **Report Issue on GitHub**.`}
        actions={
          <ActionPanel>
            <Action title="Clear Cache & Retry" onAction={revalidate} icon={Icon.RotateClockwise} />
            <Action.OpenInBrowser
              title="Report Issue on GitHub"
              url={buildIssueUrl(searchUrl, error)}
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
      {searchText.length < 2 || (skills.length === 0 && !isLoading) ? (
        <List.EmptyView
          title={searchText.length >= 2 ? "No Skills Found" : "Search Skills"}
          description={
            searchText.length >= 2 ? `No results for "${searchText}"` : "Type at least 2 characters to search"
          }
          icon={Icon.MagnifyingGlass}
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
