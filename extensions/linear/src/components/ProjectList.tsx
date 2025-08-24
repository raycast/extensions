import { List } from "@raycast/api";
import { useMemo, useState } from "react";

import { ProjectResult } from "../api/getProjects";
import { getInitiativeIcon } from "../helpers/initiatives";
import { useInitiatives } from "../hooks/useInitiatives";
import useMe from "../hooks/useMe";
import usePriorities from "../hooks/usePriorities";
import useProjects from "../hooks/useProjects";

import Project from "./Project";

export default function ProjectList() {
  const [initiativeId, setInitiativeId] = useState<string>("");
  const [searchText, setSearchText] = useState<string>("");
  const { projects, isLoadingProjects, mutateProjects, pagination } = useProjects(undefined, {
    searchText,
    pageSize: 20,
  });
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
      filtering={{ keepSectionOrder: true }}
      onSearchTextChange={setSearchText}
      pagination={pagination}
      searchBarPlaceholder="Filter by project title, lead, status, or team keys"
      searchText={searchText}
      throttle={true}
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
