import { useState, useEffect, useMemo } from "react";
import { List, showToast, Toast, Icon } from "@raycast/api";
import { useProjects } from "../hooks/useGitLab";
import { filterProjects, filterProjectsByIds } from "../utils/filters";
import { generateProjectMarkdown } from "../templates/projectTemplate";
import { ProjectActions } from "./ProjectActions";
import { getProjectIds, showProjectIdsError } from "../utils/preferences";
import { SEARCH_PLACEHOLDERS, NAVIGATION_TITLES, EMPTY_VIEW_MESSAGES } from "../constants/app";

export const ProjectsList = () => {
  const [searchText, setSearchText] = useState("");
  const [isShowingDetail, setIsShowingDetail] = useState(false);

  const { data: projects, isLoading: projectsLoading, error: projectsError } = useProjects();

  useEffect(() => {
    if (projectsError) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to fetch projects",
        message: projectsError.message,
      });
    }
  }, [projectsError]);

  // Get project IDs from preferences and filter projects (memoized for performance)
  const projectIdsResult = useMemo(() => getProjectIds(), []);

  // Show error toast if project IDs parsing failed
  useEffect(() => {
    if (!projectIdsResult.success && projectIdsResult.error) {
      showProjectIdsError(projectIdsResult.error);
    }
  }, [projectIdsResult]);

  // If no project IDs are configured or parsing failed, show empty view with prompt
  if (!projectIdsResult.success || !projectIdsResult.projectIds) {
    return (
      <List navigationTitle={NAVIGATION_TITLES.PROJECTS} searchBarPlaceholder={SEARCH_PLACEHOLDERS.PROJECTS}>
        <List.EmptyView
          title={EMPTY_VIEW_MESSAGES.NO_PROJECT_IDS_CONFIGURED.title}
          description={projectIdsResult.error || EMPTY_VIEW_MESSAGES.NO_PROJECT_IDS_CONFIGURED.description}
        />
      </List>
    );
  }

  const filteredProjectsById = projects ? filterProjectsByIds(projects, projectIdsResult.projectIds) : [];

  // Filter projects based on search text from allowed projects
  const filteredProjects = filterProjects(filteredProjectsById, searchText);

  const handleToggleDetail = () => setIsShowingDetail(!isShowingDetail);

  return (
    <List
      isLoading={projectsLoading}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder={SEARCH_PLACEHOLDERS.PROJECTS}
      navigationTitle={NAVIGATION_TITLES.PROJECTS}
      isShowingDetail={isShowingDetail}
    >
      {filteredProjects.map((project) => (
        <List.Item
          key={project.id}
          title={project.name}
          subtitle={project.path_with_namespace}
          accessories={[{ text: project.description || "No description" }]}
          icon={Icon.Folder}
          detail={<List.Item.Detail markdown={generateProjectMarkdown(project)} />}
          actions={
            <ProjectActions project={project} isShowingDetail={isShowingDetail} onToggleDetail={handleToggleDetail} />
          }
        />
      ))}
      {filteredProjects.length === 0 && !projectsLoading && (
        <List.EmptyView
          title={EMPTY_VIEW_MESSAGES.NO_PROJECTS.title}
          description={EMPTY_VIEW_MESSAGES.NO_PROJECTS.description}
        />
      )}
    </List>
  );
};
