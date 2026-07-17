import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { useMemo, useState } from "react";

import { getActiveCycleIssues } from "./api/getIssues";
import CreateIssueForm from "./components/CreateIssueForm";
import StateIssueList from "./components/StateIssueList";
import View from "./components/View";
import { getTeamIcon } from "./helpers/teams";
import useIssues from "./hooks/useIssues";
import useMe from "./hooks/useMe";
import usePriorities from "./hooks/usePriorities";
import useTeams from "./hooks/useTeams";

function ActiveCycle() {
  const [teamQuery, setTeamQuery] = useState<string>("");
  const { teams, org, supportsTeamTypeahead, isLoadingTeams } = useTeams(teamQuery);
  const [selectedTeam, setSelectedTeam] = useState<string>("");

  const { priorities, isLoadingPriorities } = usePriorities();
  const { me, isLoadingMe } = useMe();

  const cycleId = useMemo(() => {
    return teams?.find((team) => team.id === selectedTeam)?.activeCycle?.id;
  }, [selectedTeam]);

  const { issues, isLoadingIssues, mutateList } = useIssues(getActiveCycleIssues, [cycleId], {
    execute: !!cycleId && cycleId.trim().length > 0,
  });

  return (
    <List
      searchBarAccessory={
        <List.Dropdown
          tooltip="Change Team"
          onChange={setSelectedTeam}
          storeValue
          {...(supportsTeamTypeahead && {
            throttle: true,
            onSearchTextChange: setTeamQuery,
            isLoading: isLoadingTeams,
          })}
        >
          {(!teams || teams.length === 0) && (
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
