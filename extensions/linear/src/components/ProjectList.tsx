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
  const [selectedTeam, setSelectedTeam] = useState<string | undefined>(
    teamsWithProjects && teamsWithProjects.length === 1 ? teamsWithProjects[0].id : undefined
  );
  const { milestones, projectsByMilestoneId, upcomingProjects, isLoadingProjects, mutateProjects } =
    useProjects(selectedTeam);
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
                {teamsWithProjects?.map((team) => (
                  <List.Dropdown.Item key={team.id} value={team.id} title={team.name} icon={getTeamIcon(team)} />
                ))}
              </List.Dropdown>
            ),
          }
        : {})}
      searchBarPlaceholder="Filter by project title, lead, status, or milestone name"
    >
      {milestones.map((milestone) => (
        <List.Section title={milestone.name} key={milestone.id}>
          {projectsByMilestoneId[milestone.id]?.map((project) => (
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
      ))}

      <List.Section title="Upcoming">
        {upcomingProjects?.map((project) => (
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
