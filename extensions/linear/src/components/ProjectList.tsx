import { useMemo, useState } from "react";
import { List } from "@raycast/api";

import useProjects from "../hooks/useProjects";
import usePriorities from "../hooks/usePriorities";
import useMe from "../hooks/useMe";

import Project from "./Project";
import { ProjectResult } from "../api/getProjects";
import { useInitiatives } from "../hooks/useInitiatives";
import { getInitiativeIcon } from "../helpers/initiatives";

export default function ProjectList() {
  const [initiativeId, setInitiativeId] = useState<string>("");

  const { projects, isLoadingProjects, mutateProjects } = useProjects();
  const { initiatives, isLoadingInitiatives } = useInitiatives();
  const { priorities, isLoadingPriorities } = usePriorities();
  const { me, isLoadingMe } = useMe();

  const filteredProjects = useMemo(() => {
    if (!projects) {
      return [];
    }

    if (!(initiatives ?? []).length || !initiativeId.length) {
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

    const currentInitiative = initiatives?.find((i) => i.id === initiativeId);

    return (currentInitiative?.projects?.nodes ?? []).map((project) => projectsNormalizedById[project.id]);
  }, [initiativeId, projects, initiatives]);

  return (
    <List
      isLoading={isLoadingProjects || isLoadingInitiatives || isLoadingPriorities || isLoadingMe}
      {...((initiatives ?? []).length > 0
        ? {
            searchBarAccessory: (
              <List.Dropdown tooltip="Change Initiative" onChange={setInitiativeId} storeValue>
                <List.Dropdown.Item value="" title="All Projects" />

                <List.Dropdown.Section title="Initiatives">
                  {initiatives?.map((initiative) => (
                    <List.Dropdown.Item
                      key={initiative.id}
                      value={initiative.id}
                      title={initiative.name}
                      icon={getInitiativeIcon(initiative)}
                    />
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
