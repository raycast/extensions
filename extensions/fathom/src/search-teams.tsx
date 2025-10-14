import { List, Icon } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useMemo, useState } from "react";
import { listTeams, listTeamMembers } from "./fathom/api";
import type { Team } from "./types/Types";
import { TeamActions } from "./actions/TeamActions";
import { useDebouncedValue } from "./utils/debounce";
import { useTeamColor } from "./hooks/useTeamColor";

export default function Command() {
  const [query, setQuery] = useState<string>("");
  const debounced = useDebouncedValue(query, 300);

  const {
    data: teamsPage,
    isLoading: isLoadingTeams,
    revalidate: revalidateTeams,
  } = useCachedPromise(async () => listTeams({}), [], {
    keepPreviousData: true,
  });

  const filteredTeams: Team[] = useMemo(() => {
    const raw = teamsPage?.items ?? [];
    const q = debounced.trim().toLowerCase();
    if (!q) return raw;
    return raw.filter((t) => t.name.toLowerCase().includes(q));
  }, [teamsPage?.items, debounced]);

  return (
    <List isLoading={isLoadingTeams} searchBarPlaceholder="Search teams…" onSearchTextChange={setQuery}>
      {filteredTeams.length === 0 && !isLoadingTeams ? (
        <List.EmptyView
          icon={Icon.PersonLines}
          title="No Teams Found"
          description={query ? `No teams match "${query}"` : "Your teams will appear here"}
        />
      ) : (
        <List.Section
          title="Teams"
          subtitle={`${filteredTeams.length} ${filteredTeams.length === 1 ? "team" : "teams"}`}
        >
          {filteredTeams.map((team) => (
            <TeamListItem key={team.id} team={team} onRefresh={revalidateTeams} />
          ))}
        </List.Section>
      )}
    </List>
  );
}

function TeamListItem({ team, onRefresh }: { team: Team; onRefresh: () => void }) {
  // Fetch members for this specific team when needed
  const { data: membersPage } = useCachedPromise(async (teamId: string) => listTeamMembers(teamId, {}), [team.id], {
    keepPreviousData: true,
  });

  const teamColor = useTeamColor(team.name);

  const teamMembers = membersPage?.items ?? [];
  const memberCount = teamMembers.length;

  return (
    <List.Item
      icon={Icon.PersonLines}
      title={team.name}
      subtitle={team.createdAt ? new Date(team.createdAt).toLocaleDateString() : undefined}
      accessories={[
        memberCount > 0
          ? {
              tag: {
                value: `${memberCount} ${memberCount === 1 ? "member" : "members"}`,
                color: teamColor || "#007AFF",
              },
            }
          : undefined,
      ].filter((x): x is NonNullable<typeof x> => x !== undefined)}
      actions={<TeamActions team={team} members={teamMembers} onRefresh={onRefresh} />}
    />
  );
}
