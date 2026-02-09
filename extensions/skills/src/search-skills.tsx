import { List, ActionPanel, Action, Icon, Detail } from "@raycast/api";
import { useState } from "react";

import { SkillListItem } from "./components/SkillListItem";
import { useCompanyFilter } from "./hooks/useCompanyFilter";
import { useDebouncedSearch } from "./hooks/useDebouncedSearch";
import { buildIssueUrl } from "./shared";

export default function Command() {
  const [searchText, setSearchText] = useState("");

  const { data, isLoading, error, revalidate, searchUrl } = useDebouncedSearch(searchText);

  const { company, setCompany, companyCounts, skills } = useCompanyFilter(data?.skills ?? []);

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
      searchBarAccessory={
        <List.Dropdown tooltip="Filter by Company" value={company} storeValue onChange={setCompany}>
          <List.Dropdown.Item title="All Companies" value="all" />
          <List.Dropdown.Section title="Companies">
            {[...companyCounts.entries()].map(([c, count]) => (
              <List.Dropdown.Item key={c} title={`${c} (${count})`} value={c} />
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
            <SkillListItem key={skill.id} skill={skill} />
          ))}
        </List.Section>
      )}
    </List>
  );
}
