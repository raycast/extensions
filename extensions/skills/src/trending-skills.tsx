import { List, ActionPanel, Action, Icon, Detail } from "@raycast/api";
import { useState } from "react";
import { useFetch } from "@raycast/utils";
import { SkillListItem } from "./components/SkillListItem";
import { useOwnerFilter } from "./hooks/useOwnerFilter";
import { type SearchResponse, API_BASE_URL, buildIssueUrl, deduplicateSkills } from "./shared";

const BROWSE_URL = `${API_BASE_URL}/search?q=skill&limit=100`;

export default function Command() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isShowingDetail, setIsShowingDetail] = useState(true);
  const toggleDetail = () => setIsShowingDetail((prev) => !prev);

  const { data, isLoading, error, revalidate } = useFetch<SearchResponse>(BROWSE_URL, {
    keepPreviousData: true,
  });

  const { owner, setOwner, ownerCounts, skills } = useOwnerFilter(deduplicateSkills(data?.skills ?? []));

  if (error && !data) {
    return (
      <Detail
        markdown={`# API Error\n\nFailed to fetch data from the Skills API.\n\n**Error:** ${error.message}\n\n---\n\nIf the problem persists, please report it via **Report Issue on GitHub**.`}
        actions={
          <ActionPanel>
            <Action title="Clear Cache & Retry" onAction={revalidate} icon={Icon.RotateClockwise} />
            <Action.OpenInBrowser
              title="Report Issue on GitHub"
              url={buildIssueUrl(BROWSE_URL, error)}
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
      searchBarPlaceholder="Filter skills..."
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
      <List.Section title="Popular Skills" subtitle={`${skills.length} skills`}>
        {skills.map((skill, index) => (
          <SkillListItem
            key={skill.id}
            skill={skill}
            rank={index + 1}
            isSelected={selectedId === skill.id}
            isShowingDetail={isShowingDetail}
            onToggleDetail={toggleDetail}
          />
        ))}
      </List.Section>
    </List>
  );
}
