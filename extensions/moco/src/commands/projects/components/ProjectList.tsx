import { useState } from "react";
import { List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";

import { ProjectListItem } from "./ProjectListItem";
import { fetchProjects } from "../api";
import { StatusType } from "../../../utils/storage";
import { useStatuses } from "../../../utils/useStatuses";

export const ProjectList = () => {
  const [showHidden, setShowHidden] = useState<boolean>(false);
  // Projects come from the cache first, then from the API.
  const { data: projects = [], isLoading: isLoadingProjects } = useCachedPromise(fetchProjects, [], {
    keepPreviousData: true,
  });
  const { statuses, isLoading: isLoadingStatuses, changeStatus } = useStatuses("project");

  // Render nothing until the statuses are known, so favorites do not jump from "Projects" to "Favorites".
  const renderItems = (status: StatusType | undefined) =>
    (statuses === undefined ? [] : projects)
      .filter((project) => statuses?.get(project.id) === status)
      .map((project) => (
        <ProjectListItem
          key={project.id}
          project={project}
          status={status}
          showHidden={showHidden}
          onStatusChange={(project, status) => changeStatus(project.id, status)}
          onToggleShowHidden={() => setShowHidden(!showHidden)}
        />
      ));

  return (
    <List
      isLoading={isLoadingProjects || isLoadingStatuses}
      searchBarPlaceholder="Filter projects by name..."
      isShowingDetail={false}
    >
      <List.Section title="Favorites">{renderItems(StatusType.favorite)}</List.Section>
      <List.Section title="Projects">{renderItems(undefined)}</List.Section>
      {showHidden ? <List.Section title="Hidden">{renderItems(StatusType.hidden)}</List.Section> : null}
    </List>
  );
};
