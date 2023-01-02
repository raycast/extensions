import { Action, ActionPanel, List } from "@raycast/api";
import { useMemo, useState, useEffect } from "react";

import { getActiveCycleIssues } from "./api/getIssues";

import useIssues from "./hooks/useIssues";
import useTeams from "./hooks/useTeams";
import usePriorities from "./hooks/usePriorities";
import useMe from "./hooks/useMe";
import useUsers from "./hooks/useUsers";

import { getTeamIcon } from "./helpers/teams";

import StateIssueList from "./components/StateIssueList";
import CreateIssueForm from "./components/CreateIssueForm";
import View from "./components/View";

function ActiveCycle() {
  const { teamsWithCycles, isLoadingTeams } = useTeams();
  const [selectedTeam, setSelectedTeam] = useState<string | undefined>(
    teamsWithCycles && teamsWithCycles.length === 1 ? teamsWithCycles[0].id : undefined
  );

  const { priorities, isLoadingPriorities } = usePriorities();
  const { me, isLoadingMe } = useMe();
  const { users, isLoadingUsers } = useUsers();

  const cycleId = useMemo(() => {
    if (teamsWithCycles?.length === 1) {
      return teamsWithCycles[0].activeCycle?.id;
    }

    const correspondingTeam = teamsWithCycles?.find((team) => team.id === selectedTeam);
    return correspondingTeam?.activeCycle?.id;
  }, [selectedTeam]);

  const { issues, isLoadingIssues, mutateList } = useIssues(
    (cycleId: string | undefined) => getActiveCycleIssues(cycleId),
    [cycleId],
    { execute: !!cycleId }
  );

  useEffect(() => {
    if (teamsWithCycles && teamsWithCycles.length === 1 && teamsWithCycles[0].id !== selectedTeam) {
      setSelectedTeam(teamsWithCycles[0].id);
    }
  }, [teamsWithCycles, selectedTeam]);

  return (
    <List
      {...(teamsWithCycles && teamsWithCycles.length > 1
        ? {
            searchBarAccessory: (
              <List.Dropdown tooltip="Change Team" onChange={setSelectedTeam} storeValue>
                {teamsWithCycles?.map((team) => (
                  <List.Dropdown.Item key={team.id} value={team.id} title={team.name} icon={getTeamIcon(team)} />
                ))}
              </List.Dropdown>
            ),
          }
        : {})}
      isLoading={isLoadingIssues || isLoadingTeams || isLoadingPriorities || isLoadingMe || isLoadingUsers}
      searchBarPlaceholder="Filter by key, title, status, assignee or priority"
      filtering={{ keepSectionOrder: true }}
    >
      <List.EmptyView
        title="No issues"
        description="There are no issues in the active cycle."
        actions={
          <ActionPanel>
            <Action.Push
              title="Create Issue"
              target={
                <CreateIssueForm
                  cycleId={cycleId}
                  teamId={selectedTeam}
                  priorities={priorities}
                  users={users}
                  me={me}
                />
              }
            />
          </ActionPanel>
        }
      />
      <StateIssueList issues={issues} mutateList={mutateList} priorities={priorities} users={users} me={me} />
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
