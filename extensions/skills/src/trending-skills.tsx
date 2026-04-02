import { List, ActionPanel, Action, Icon, Detail } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { SkillListItem } from "./components/SkillListItem";
import { useOwnerFilter } from "./hooks/useOwnerFilter";
import { type SearchResponse, buildIssueUrl } from "./shared";
import { buildSkillsSearchUrl } from "./api";

const BROWSE_URL = buildSkillsSearchUrl("skill", 100);

export default function Command() {
  const { data, isLoading, error, revalidate } = useFetch<SearchResponse>(BROWSE_URL, {
    keepPreviousData: true,
  });

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
      {skills.length === 0 && !isLoading ? (
        <List.EmptyView
          title={owner === "all" ? "No Skills Available" : "No Skills for This Owner"}
          description={
            owner === "all"
              ? "Could not load trending skills. Check your connection and try again."
              : "No skills match this owner filter. Try selecting a different owner."
          }
          icon={owner === "all" ? Icon.Stars : Icon.Filter}
          actions={
            <ActionPanel>
              <Action title="Retry" onAction={revalidate} icon={Icon.RotateClockwise} />
            </ActionPanel>
          }
        />
      ) : (
        <List.Section title="Popular Skills" subtitle={`${skills.length} skills`}>
          {skills.map((skill, index) => (
            <SkillListItem key={skill.id} skill={skill} rank={index + 1} />
          ))}
        </List.Section>
      )}
    </List>
  );
}
