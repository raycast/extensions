import shortcut from "../utils/shortcut";
import { useMemo } from "react";
import useSWR from "swr";
import { Project, Workflow } from "@useshortcut/client";

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

export const useProjectMap = () => {
  const { data: projects } = useProjects();

  return useMemo(() => {
    return projects?.reduce((map, project) => ({ ...map, [project.id]: project }), {} as Record<number, Project>) || {};
  }, [projects]);
};

export const useProjectStories = (projectId?: number) => {
  return useSWR(
    () => projectId && `/api/v3/stories/project/${projectId}`,
    () => shortcut.listStories(projectId!, {}).then((res) => res.data)
  );
};

export const useIterations = () => {
  return useSWR("/api/v3/iterations", () => shortcut.listIterations().then((res) => res.data));
};

export const useIterationStories = (iterationId?: number) => {
  return useSWR(
    () => iterationId && `/api/v3/stories/iteration/${iterationId}`,
    () => shortcut.listIterationStories(iterationId!, {}).then((res) => res.data)
  );
};

export const useWorkflows = () => {
  return useSWR("/api/v3/workflows", () => shortcut.listWorkflows().then((res) => res.data));
};

export const useWorkflowMap = () => {
  const { data: workflows } = useWorkflows();

  return useMemo(() => {
    return (
      workflows?.reduce((map, workflow) => ({ ...map, [workflow.id]: workflow }), {} as Record<number, Workflow>) || {}
    );
  }, [workflows]);
};
