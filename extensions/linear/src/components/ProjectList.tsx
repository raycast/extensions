import { useState, useMemo } from "react";
import { List } from "@raycast/api";

import useProjects from "../hooks/useProjects";
import usePriorities from "../hooks/usePriorities";
import useMe from "../hooks/useMe";
import useUsers from "../hooks/useUsers";
import useRoadmaps from "../hooks/useRoadmaps";

import Project from "./Project";
import { ProjectResult } from "../api/getProjects";

export default function ProjectList() {
  const [roadmap, setRoadmap] = useState("");

  const { projects, isLoadingProjects, mutateProjects } = useProjects();
  const { roadmaps, isLoadingRoadmaps } = useRoadmaps();
  const { priorities, isLoadingPriorities } = usePriorities();
  const { me, isLoadingMe } = useMe();
  const { users, isLoadingUsers } = useUsers();

  const filteredProjects = useMemo(() => {
    if (!projects) {
      return [];
    }

    if (roadmap === "") {
      return projects;
    }

    const projectsNormalizedById = projects.reduce((acc, project) => {
      return {
        ...acc,
        [project.id]: project,
      };
    }, {} as Record<string, ProjectResult>);

    const currentRoadmap = roadmaps?.find((r) => r.id === roadmap);

    return (
      currentRoadmap?.projects.nodes.map((project) => {
        return projectsNormalizedById[project.id];
      }) || []
    );
  }, [roadmap]);

  return (
    <List
      isLoading={isLoadingProjects || isLoadingRoadmaps || isLoadingPriorities || isLoadingMe || isLoadingUsers}
      {...(roadmaps && roadmaps.length > 1
        ? {
            searchBarAccessory: (
              <List.Dropdown tooltip="Change Roadmap" onChange={setRoadmap} storeValue>
                <List.Dropdown.Item value="" title="All Projects" />

                <List.Dropdown.Section>
                  {roadmaps?.map((roadmap) => (
                    <List.Dropdown.Item key={roadmap.id} value={roadmap.id} title={roadmap.name} />
                  ))}
                </List.Dropdown.Section>
              </List.Dropdown>
            ),
          }
        : {})}
      searchBarPlaceholder="Filter by project title, lead, or status"
      filtering={{ keepSectionOrder: true }}
    >
      {filteredProjects?.map((project) => (
        <Project
          project={project}
          key={project.id}
          priorities={priorities}
          users={users}
          me={me}
          mutateProjects={mutateProjects}
        />
      ))}
    </List>
  );
}
