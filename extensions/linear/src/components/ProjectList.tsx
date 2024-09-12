import { useMemo } from "react";
import { List } from "@raycast/api";
import { useCachedState } from "@raycast/utils";

import useProjects from "../hooks/useProjects";
import usePriorities from "../hooks/usePriorities";
import useMe from "../hooks/useMe";
import useRoadmaps from "../hooks/useRoadmaps";

import Project from "./Project";
import { ProjectResult } from "../api/getProjects";

export default function ProjectList() {
  const [roadmap, setRoadmap] = useCachedState<string>("");

  const { projects, isLoadingProjects, mutateProjects } = useProjects();
  const { roadmaps, isLoadingRoadmaps } = useRoadmaps();
  const { priorities, isLoadingPriorities } = usePriorities();
  const { me, isLoadingMe } = useMe();

  const filteredProjects = useMemo(() => {
    if (!projects) {
      return [];
    }

    if (!roadmap || !roadmaps || roadmaps.length < 1) {
      return projects;
    }

    const projectsNormalizedById = projects.reduce(
      (acc, project) => {
        return {
          ...acc,
          [project.id]: project,
        };
      },
      {} as Record<string, ProjectResult | undefined>,
    );

    const currentRoadmap = roadmaps?.find((r) => r.id === roadmap);

    return (
      currentRoadmap?.projects.nodes.map((project) => {
        return projectsNormalizedById[project.id];
      }) || []
    );
  }, [roadmap, projects, roadmaps]);

  return (
    <List
      isLoading={isLoadingProjects || isLoadingRoadmaps || isLoadingPriorities || isLoadingMe}
      {...(roadmaps && roadmaps.length > 0
        ? {
            searchBarAccessory: (
              <List.Dropdown tooltip="Change Roadmap" onChange={setRoadmap} value={roadmap}>
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
      searchBarPlaceholder="Filter by project title, lead, status, or team keys"
      filtering={{ keepSectionOrder: true }}
    >
      {filteredProjects?.map((project) => {
        if (!project) {
          return null;
        }

        return (
          <Project project={project} key={project.id} priorities={priorities} me={me} mutateProjects={mutateProjects} />
        );
      })}

      <List.EmptyView title="There are no projects in the roadmap yet." />
    </List>
  );
}
