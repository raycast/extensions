import shortcut from "../utils/shortcut";
import { useMemo } from "react";
import useSWR from "swr";
import { Group, IterationSlim, Member, Project, Workflow } from "@useshortcut/client";

export const useMemberInfo = () => {
  return useSWR("/member", () => shortcut.getCurrentMemberInfo().then((res) => res.data));
};

export const useMembers = () => {
  return useSWR("/members", () => shortcut.listMembers({}).then((res) => res.data));
};

export const useMemberMap = () => {
  const { data } = useMembers();
  return useMemo(() => {
    return data?.reduce(
      (acc, member) => ({
        ...acc,
        [member.id]: member,
      }),
      {} as Record<string, Member>
    );
  }, [data]);
};

export const useAssignedStories = (owner?: string) => {
  return useSWR(
    () => owner && `/stories/owner/${owner}`,
    () =>
      shortcut
        .searchStories({
          query: `owner:${owner}`,
        })
        .then((res) => res.data)
  );
};

export const useProjects = () => {
  return useSWR("/projects", () => shortcut.listProjects().then((res) => res.data));
};

export const useProjectMap = () => {
  const { data: projects } = useProjects();

  return useMemo(() => {
    return projects?.reduce((map, project) => ({ ...map, [project.id]: project }), {} as Record<number, Project>) || {};
  }, [projects]);
};

export const useProjectStories = (projectId?: number) => {
  return useSWR(
    () => projectId && `/stories/project/${projectId}`,
    () => shortcut.listStories(projectId!, {}).then((res) => res.data)
  );
};

export const useIterations = () => {
  return useSWR("/iterations", () => shortcut.listIterations().then((res) => res.data));
};

export const useIterationMap = () => {
  const { data: iterations } = useIterations();

  return useMemo(() => {
    return (
      iterations?.reduce(
        (map, iteration) => ({ ...map, [iteration.id]: iteration }),
        {} as Record<number, IterationSlim>
      ) || {}
    );
  }, [iterations]);
};

export const useIterationStories = (iterationId?: number) => {
  return useSWR(
    () => iterationId && `/stories/iteration/${iterationId}`,
    () => shortcut.listIterationStories(iterationId!, {}).then((res) => res.data)
  );
};

export const useWorkflows = () => {
  return useSWR("/workflows", () => shortcut.listWorkflows().then((res) => res.data));
};

export const useWorkflowMap = () => {
  const { data: workflows } = useWorkflows();

  return useMemo(() => {
    return (
      workflows?.reduce((map, workflow) => ({ ...map, [workflow.id]: workflow }), {} as Record<number, Workflow>) || {}
    );
  }, [workflows]);
};

export const useStory = (storyId?: number) => {
  return useSWR(
    () => storyId && `/stories/${storyId}`,
    () => shortcut.getStory(storyId!).then((res) => res.data)
  );
};

export const useGroups = () => {
  return useSWR("/groups", () => shortcut.listGroups().then((res) => res.data));
};

export const useGroupsMap = () => {
  const { data } = useGroups();

  return useMemo(() => {
    return data?.reduce((map, group) => ({ ...map, [group.id]: group }), {} as Record<number, Group>) || {};
  }, [data]);
};

export const useProject = (projectId?: number) => {
  return useSWR(
    () => projectId && `/projects/${projectId}`,
    () => shortcut.getProject(projectId!).then((res) => res.data)
  );
};

export const useEpics = () => {
  return useSWR("/epics", () => shortcut.listEpics({}).then((res) => res.data));
};

export const useEpicStories = (epicId?: number) => {
  return useSWR(
    () => epicId && `/stories/epic/${epicId}`,
    () => shortcut.listEpicStories(epicId!, {}).then((res) => res.data)
  );
};
