import { Icon, List } from "@raycast/api";
import { useMemo, useState } from "react";
import { useScenarios } from "./hooks/use-scenarios.js";
import { ScenarioItem, Team } from "./api/types.js";
import { ScenarioListItem } from "./components/scenario-list-item.js";
import { SkippedOrgsSection } from "./components/skipped-orgs-section.js";

export default function SearchScenarios() {
  const { data: items, isLoading, skippedOrgs, revalidate } = useScenarios();
  const [filter, setFilter] = useState<string>("all");

  const { orgs, teams } = useMemo(() => {
    return {
      orgs: uniqueBy(items, (i) => i.org.id).map((i) => i.org),
      teams: uniqueBy(items, (i) => i.team.id).map((i) => i.team),
    };
  }, [items]);

  const filtered = filterItems(items, filter);

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search scenarios..."
      searchBarAccessory={
        <List.Dropdown
          tooltip="Filter by Organization / Team"
          onChange={setFilter}
        >
          <List.Dropdown.Item title="All" value="all" />
          {orgs.map((org) => (
            <List.Dropdown.Section key={org.id} title={org.name}>
              <List.Dropdown.Item
                title={`All in ${org.name}`}
                value={`org:${org.id}`}
              />
              {teams
                .filter((t: Team) => t.organizationId === org.id)
                .map((team: Team) => (
                  <List.Dropdown.Item
                    key={team.id}
                    title={team.name}
                    value={`team:${team.id}`}
                  />
                ))}
            </List.Dropdown.Section>
          ))}
        </List.Dropdown>
      }
    >
      {!isLoading && filtered.length === 0 && (
        <List.EmptyView
          title="No scenarios found"
          description="Check your API token and zone in extension preferences."
          icon={Icon.MagnifyingGlass}
        />
      )}
      {filtered.map((item) => (
        <ScenarioListItem
          key={`${item.org.zone}-${item.org.id}-${item.team.id}-${item.scenario.id}`}
          item={item}
          onRefresh={revalidate}
        />
      ))}
      <SkippedOrgsSection names={skippedOrgs} />
    </List>
  );
}

function filterItems(items: ScenarioItem[], filter: string): ScenarioItem[] {
  if (filter === "all") return items;

  if (filter.startsWith("org:")) {
    const orgId = Number(filter.slice(4));
    return items.filter((i) => i.org.id === orgId);
  }

  if (filter.startsWith("team:")) {
    const teamId = Number(filter.slice(5));
    return items.filter((i) => i.team.id === teamId);
  }

  return items;
}

function uniqueBy<T, K>(arr: T[], keyFn: (item: T) => K): T[] {
  const seen = new Set<K>();
  return arr.filter((item) => {
    const key = keyFn(item);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
