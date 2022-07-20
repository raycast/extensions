import shortcut from "../utils/shortcut";
import useSWR from "swr";

export const useMemberInfo = () => {
  return useSWR("/api/v3/member", () => shortcut.getCurrentMemberInfo().then((res) => res.data));
};

export const useAssignedStories = (owner?: string) => {
  return useSWR(
    () => owner && `/api/v3/stories/owner/${owner}`,
    () =>
      shortcut
        .searchStories({
          query: `owner:${owner}`,
        })
        .then((res) => res.data)
  );
};

export const useProjects = () => {
  return useSWR("/api/v3/projects", () => shortcut.listProjects().then((res) => res.data));
};

export const useProjectStories = (projectId: number) => {
  return useSWR(
    () => `/api/v3/stories/project/${projectId}`,
    () => shortcut.listStories(projectId, {}).then((res) => res.data)
  );
};

export const useIterations = () => {
  return useSWR("/api/v3/iterations", () => shortcut.listIterations().then((res) => res.data));
};
