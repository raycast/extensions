import { MergeRequest, Project } from "../types/gitlab";

export const filterMergeRequests = (mergeRequests: MergeRequest[], searchText: string): MergeRequest[] => {
  if (!searchText) return mergeRequests;

  const searchLower = searchText.toLowerCase();
  return mergeRequests.filter(
    (mr) =>
      mr.title.toLowerCase().includes(searchLower) ||
      mr.author.name.toLowerCase().includes(searchLower) ||
      mr.source_branch.toLowerCase().includes(searchLower) ||
      mr.target_branch.toLowerCase().includes(searchLower)
  );
};

export const filterProjects = (projects: Project[], searchText: string): Project[] => {
  if (!searchText) return projects;

  const searchLower = searchText.toLowerCase();
  return projects.filter(
    (project) =>
      project.name.toLowerCase().includes(searchLower) ||
      project.path_with_namespace.toLowerCase().includes(searchLower)
  );
};

export const filterProjectsByIds = (projects: Project[], allowedIds: number[]): Project[] => {
  return projects.filter((project) => allowedIds.includes(project.id));
};
