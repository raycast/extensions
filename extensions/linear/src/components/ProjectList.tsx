import { useState } from "react";
import { List } from "@raycast/api";

import useTeams from "../hooks/useTeams";
import useProjects from "../hooks/useProjects";
import usePriorities from "../hooks/usePriorities";
import useMe from "../hooks/useMe";
import useUsers from "../hooks/useUsers";

import { getTeamIcon } from "../helpers/teams";

import Project from "./Project";

export default function ProjectList() {
  const { teamsWithProjects, isLoadingTeams } = useTeams();
  const [selectedTeam, setSelectedTeam] = useState<string>(
    teamsWithProjects && teamsWithProjects.length === 1 ? teamsWithProjects[0].id : ""
  );
  const { projects, isLoadingProjects, mutateProjects } = useProjects(selectedTeam);
  const { priorities, isLoadingPriorities } = usePriorities();
  const { me, isLoadingMe } = useMe();
  const { users, isLoadingUsers } = useUsers();

  return (
    <List
      isLoading={isLoadingProjects || isLoadingTeams || isLoadingPriorities || isLoadingMe || isLoadingUsers}
      {...(teamsWithProjects && teamsWithProjects.length > 1
        ? {
            searchBarAccessory: (
              <List.Dropdown tooltip="Change Team" onChange={setSelectedTeam} storeValue>
                <List.Dropdown.Item value="" title="All teams" />

                <List.Dropdown.Section>
                  {teamsWithProjects?.map((team) => (
                    <List.Dropdown.Item key={team.id} value={team.id} title={team.name} icon={getTeamIcon(team)} />
                  ))}
                </List.Dropdown.Section>
              </List.Dropdown>
            ),
          }
        : {})}
      searchBarPlaceholder="Filter by project title, lead, or status"
      filtering={{ keepSectionOrder: true }}
    >
      <List.Section title="Upcoming">
        {projects?.map((project) => (
          <Project
            project={project}
            key={project.id}
            teamId={selectedTeam}
            priorities={priorities}
            users={users}
            me={me}
            mutateProjects={mutateProjects}
          />
        ))}
      </List.Section>
    </List>
  );
}
