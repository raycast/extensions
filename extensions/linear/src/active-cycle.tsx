import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { useEffect, useMemo, useState } from "react";

import { getActiveCycleIssues } from "./api/getIssues";
import CreateIssueForm from "./components/CreateIssueForm";
import StateIssueList from "./components/StateIssueList";
import View from "./components/View";
import { useWorkspaces } from "./components/WorkspaceContext";
import {
  isWorkspaceDropdownValue,
  workspaceValueToKey,
  WorkspaceDropdownSection,
} from "./components/WorkspaceDropdown";
import { getTeamIcon } from "./helpers/teams";
import useIssues from "./hooks/useIssues";
import useMe from "./hooks/useMe";
import usePriorities from "./hooks/usePriorities";
import useTeams from "./hooks/useTeams";
import { useWorkspaceCachedState } from "./hooks/useWorkspaceCachedState";

function ActiveCycle() {
  const [teamQuery, setTeamQuery] = useState<string>("");
  const { teams, org, supportsTeamTypeahead, isLoadingTeams } = useTeams(teamQuery);
  const { switchWorkspace } = useWorkspaces();
  const [storedTeam, setStoredTeam] = useWorkspaceCachedState<string>("active-cycle-team", "");
  // Restore validation (§4.5) runs ONCE against the initial, query-less team load —
  // NOT against typeahead results, which would transiently "invalidate" the stored team
  // and flip the visible cycle while the user types. State (not a ref) so a cold-cache
  // resolution that lands after the first render still triggers a re-render to show it.
  const [validatedTeam, setValidatedTeam] = useState<string | null>(null);
  useEffect(() => {
    if (validatedTeam === null && teams && teamQuery === "") {
      setValidatedTeam(teams.some((team) => team.id === storedTeam) ? storedTeam : (teams[0]?.id ?? ""));
    }
    // Intentional deps: validatedTeam and storedTeam are read but not tracked —
    // this must run only when teams/teamQuery change, not on every storedTeam update.
  }, [teams, teamQuery]);
  const selectedTeam = validatedTeam ?? "";

  const { priorities, isLoadingPriorities } = usePriorities();
  const { me, isLoadingMe } = useMe();

  const cycleId = useMemo(() => {
    return teams?.find((team) => team.id === selectedTeam)?.activeCycle?.id;
  }, [selectedTeam, teams]);

  const { issues, isLoadingIssues, mutateList } = useIssues((id?: string) => getActiveCycleIssues(id), [cycleId], {
    execute: !!cycleId && cycleId.trim().length > 0,
  });

  return (
    <List
      searchBarAccessory={
        <List.Dropdown
          tooltip="Change Team"
          value={selectedTeam || "-"}
          onChange={(value) => {
            if (isWorkspaceDropdownValue(value)) {
              switchWorkspace(workspaceValueToKey(value));
              return;
            }
            if (value !== "-" && value !== selectedTeam) {
              setValidatedTeam(value);
              setStoredTeam(value); // S9: ignore mount echo (guarded by the !== check)
            }
          }}
          {...(supportsTeamTypeahead && {
            throttle: true,
            onSearchTextChange: setTeamQuery,
            isLoading: isLoadingTeams,
          })}
        >
          <WorkspaceDropdownSection />
          {/* Also render during the pre-validation frame (validatedTeam === null): on a warm
              cache teams can already be populated while selectedTeam still falls back to "-"
              (S9) — the controlled value must always match a rendered item, or Raycast's
              first-item snap could fire a persisted workspace switch. */}
          {(!teams || teams.length === 0 || validatedTeam === null) && (
            <List.Dropdown.Item title="No team" value="-" key="-" icon={Icon.TwoPeople} />
          )}
          {teams?.map((team) => (
            <List.Dropdown.Item key={team.id} value={team.id} title={team.name} icon={getTeamIcon(team, org)} />
          ))}
        </List.Dropdown>
      }
      isLoading={isLoadingIssues || isLoadingTeams || isLoadingPriorities || isLoadingMe}
      searchBarPlaceholder="Filter by ID, title, status, assignee or priority"
      filtering={{ keepSectionOrder: true }}
    >
      <List.EmptyView
        title={cycleId ? "No issues" : "No active cycles"}
        description={cycleId ? "There are no issues in the active cycle." : "This team does not have active cycles."}
        {...{
          ...((cycleId && {
            actions: (
              <ActionPanel>
                <Action.Push
                  title="Create Issue"
                  target={<CreateIssueForm cycleId={cycleId} teamId={selectedTeam} priorities={priorities} me={me} />}
                />
              </ActionPanel>
            ),
          }) ||
            {}),
        }}
      />
      <StateIssueList issues={issues} mutateList={mutateList} priorities={priorities} me={me} />
    </List>
  );
}

export default function Command() {
  return (
    <View>
      <ActiveCycle />
    </View>
  );
}
