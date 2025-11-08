import { List, Icon } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useMemo, useState } from "react";
import { listTeamMembers, listTeams } from "./fathom/api";
import type { Paginated, TeamMember } from "./types/Types";
import { TeamMemberActions } from "./actions/TeamMemberActions";
import { useDebouncedValue } from "./utils/debounce";

export default function Command() {
  const [query, setQuery] = useState<string>("");
  const [selectedTeam, setSelectedTeam] = useState<string>("");
  const debounced = useDebouncedValue(query, 300);

  // Fetch teams list separately
  const { data: teamsData } = useCachedPromise(async () => listTeams({}), [], {
    keepPreviousData: true,
  });

  const teams = useMemo(() => {
    return (teamsData?.items ?? []).sort((a, b) => a.name.localeCompare(b.name));
  }, [teamsData]);

  // Fetch team members, optionally filtered by team
  const {
    data: membersData,
    isLoading,
    revalidate,
  } = useCachedPromise(
    async (teamName: string) => {
      // If team is selected, filter by that team name
      return listTeamMembers(teamName || undefined, {});
    },
    [selectedTeam],
    {
      keepPreviousData: true,
    },
  );

  const page: Paginated<TeamMember> | undefined = membersData;

  const items = useMemo(() => {
    const raw = page?.items ?? [];
    const q = debounced.trim().toLowerCase();

    // Filter by search query
    if (q) {
      return raw.filter(
        (m) => m.name.toLowerCase().includes(q) || (m.email ? m.email.toLowerCase().includes(q) : false),
      );
    }

    return raw;
  }, [page?.items, debounced]);

  // Group members by team (only when showing all teams)
  const groupedMembers = useMemo(() => {
    if (selectedTeam) {
      // If team is selected, show as single section
      return new Map([[selectedTeam, items]]);
    }

    // When showing all members, we don't have team info from API
    // So just show them ungrouped
    return new Map([["All Members", items]]);
  }, [items, selectedTeam]);

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search team members by name or email…"
      onSearchTextChange={setQuery}
      searchBarAccessory={
        <List.Dropdown tooltip="Filter by Team" value={selectedTeam} onChange={setSelectedTeam}>
          <List.Dropdown.Item title="All Teams" value="" />
          {teams.map((team) => (
            <List.Dropdown.Item key={team.id} title={team.name} value={team.name} icon={Icon.PersonLines} />
          ))}
        </List.Dropdown>
      }
    >
      {items.length === 0 && !isLoading ? (
        <List.EmptyView
          icon={Icon.Person}
          title="No Team Members Found"
          description={
            query
              ? `No team members match "${query}"`
              : "You may not be on a team, or your organization may not have teams set up."
          }
        />
      ) : (
        Array.from(groupedMembers.entries()).map(([teamName, members]) => (
          <List.Section
            key={teamName}
            title={teamName}
            subtitle={`${members.length} ${members.length === 1 ? "member" : "members"}`}
          >
            {members.map((tm) => (
              <List.Item
                key={tm.id}
                icon={Icon.Person}
                title={tm.name}
                subtitle={tm.email}
                accessories={[
                  tm.emailDomain ? { tag: { value: tm.emailDomain, color: "#8E8E93" } } : undefined,
                  tm.createdAt ? { text: new Date(tm.createdAt).toLocaleDateString(), icon: Icon.Calendar } : undefined,
                ].filter((x): x is NonNullable<typeof x> => x !== undefined)}
                actions={
                  <TeamMemberActions
                    member={tm}
                    onRefresh={revalidate}
                    allMembers={items}
                    teamName={selectedTeam || undefined}
                  />
                }
              />
            ))}
          </List.Section>
        ))
      )}
    </List>
  );
}
