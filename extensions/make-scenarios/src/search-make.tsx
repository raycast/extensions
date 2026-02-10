import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import { useState } from "react";
import { useOrganizations } from "./hooks/use-organizations.js";
import { useScenarios } from "./hooks/use-scenarios.js";
import { ScenarioListItem } from "./components/scenario-list-item.js";
import { SkippedOrgsSection } from "./components/skipped-orgs-section.js";
import { buildOrgScenariosUrl, zoneLabel } from "./utils/url.js";

type Filter = "all" | "scenarios" | "organizations";

export default function SearchMake() {
  const orgs = useOrganizations();
  const scenarios = useScenarios();
  const [filter, setFilter] = useState<Filter>("all");

  const isLoading = orgs.isLoading || scenarios.isLoading;

  function revalidate() {
    orgs.revalidate();
    scenarios.revalidate();
  }

  const allSkipped = [
    ...new Set([...scenarios.skippedOrgs, ...orgs.skippedOrgs]),
  ];

  const showScenarios = filter === "all" || filter === "scenarios";
  const showOrgs = filter === "all" || filter === "organizations";
  const hasResults =
    (showScenarios && scenarios.data.length > 0) ||
    (showOrgs && orgs.data.length > 0);

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search Make.com..."
      searchBarAccessory={
        <List.Dropdown
          tooltip="Filter type"
          onChange={(v) => setFilter(v as Filter)}
        >
          <List.Dropdown.Item title="All" value="all" />
          <List.Dropdown.Item title="Scenarios" value="scenarios" />
          <List.Dropdown.Item title="Organizations" value="organizations" />
        </List.Dropdown>
      }
    >
      {!isLoading && !hasResults && (
        <List.EmptyView
          title="No results found"
          description="Check your API token and zone in extension preferences."
          icon={Icon.MagnifyingGlass}
        />
      )}
      {showScenarios && (
        <List.Section
          title="Scenarios"
          subtitle={String(scenarios.data.length)}
        >
          {scenarios.data.map((item) => (
            <ScenarioListItem
              key={`sc-${item.org.zone}-${item.org.id}-${item.team.id}-${item.scenario.id}`}
              item={item}
              onRefresh={revalidate}
            />
          ))}
        </List.Section>
      )}
      {showOrgs && (
        <List.Section title="Organizations" subtitle={String(orgs.data.length)}>
          {orgs.data.map((item) => {
            const { org, team } = item;
            const url = buildOrgScenariosUrl(org.zone, team.id);

            return (
              <List.Item
                key={`org-${org.id}-${team.id}`}
                title={org.name}
                subtitle={team.name}
                accessories={[
                  { tag: { value: zoneLabel(org.zone), color: Color.Blue } },
                ]}
                icon={Icon.Building}
                actions={
                  <ActionPanel>
                    <Action.OpenInBrowser title="Open Scenarios" url={url} />
                    <Action.CopyToClipboard
                      title="Copy URL"
                      content={url}
                      shortcut={{ modifiers: ["cmd"], key: "c" }}
                    />
                    <Action
                      title="Refresh"
                      icon={Icon.ArrowClockwise}
                      shortcut={{ modifiers: ["cmd"], key: "r" }}
                      onAction={revalidate}
                    />
                  </ActionPanel>
                }
              />
            );
          })}
        </List.Section>
      )}
      <SkippedOrgsSection names={allSkipped} />
    </List>
  );
}
