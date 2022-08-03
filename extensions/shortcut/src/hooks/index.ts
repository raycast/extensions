import shortcut from "../utils/shortcut";
import { useMemo } from "react";
import { useCachedPromise } from "@raycast/utils";
import {
  EpicSlim,
  Group,
  IterationSlim,
  Label,
  Member,
  MemberInfo,
  Project,
  Story,
  Workflow,
} from "@useshortcut/client";

export const useMemberInfo = () => {
  return useCachedPromise<() => Promise<MemberInfo>>(() => shortcut.getCurrentMemberInfo().then((res) => res.data));
};

export const useMembers = () => {
  return useCachedPromise<() => Promise<Member[]>>(() => shortcut.listMembers({}).then((res) => res.data));
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
  return useCachedPromise(
    (owner) =>
      shortcut
        .searchStories({
          query: `owner:${owner}`,
        })
        .then((res) => res.data),
    [owner],
    {
      execute: !!owner,
    }
  );
};

export const useProjects = () => {
  return useCachedPromise<() => Promise<Project[]>>(() => shortcut.listProjects().then((res) => res.data));
};

export const useProjectMap = () => {
  const { data: projects } = useProjects();

  return useMemo(() => {
    return projects?.reduce((map, project) => ({ ...map, [project.id]: project }), {} as Record<number, Project>) || {};
  }, [projects]);
};

export const useProjectStories = (projectId?: number) => {
  return useCachedPromise((projectId) => shortcut.listStories(projectId, {}).then((res) => res.data), [projectId], {
    execute: !!projectId,
  });
};

export const useIterations = () => {
  return useCachedPromise<() => Promise<IterationSlim[]>>(() => shortcut.listIterations().then((res) => res.data));
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
  return useCachedPromise(
    (iterationId) => shortcut.listIterationStories(iterationId, {}).then((res) => res.data),
    [iterationId],
    {
      execute: !!iterationId,
    }
  );
};

export const useWorkflows = () => {
  return useCachedPromise<() => Promise<Workflow[]>>(() => shortcut.listWorkflows().then((res) => res.data));
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
  return useCachedPromise<(storyId: number) => Promise<Story>>(
    (storyId) => shortcut.getStory(storyId).then((res) => res.data),
    [storyId!],
    {
      execute: !!storyId,
    }
  );
};

export const useGroups = () => {
  return useCachedPromise<() => Promise<Group[]>>(() => shortcut.listGroups().then((res) => res.data));
};

export const useGroupsMap = () => {
  const { data } = useGroups();

  return useMemo(() => {
    return data?.reduce((map, group) => ({ ...map, [group.id]: group }), {} as Record<number, Group>) || {};
  }, [data]);
};

export const useProject = (projectId?: number) => {
  return useCachedPromise((projectId) => shortcut.getProject(projectId).then((res) => res.data), [projectId], {
    execute: !!projectId,
  });
};

export const useEpics = () => {
  return useCachedPromise<() => Promise<EpicSlim[]>>(() => shortcut.listEpics({}).then((res) => res.data));
};

export const useEpicStories = (epicId?: number) => {
  return useCachedPromise((epicId) => shortcut.listEpicStories(epicId, {}).then((res) => res.data), [epicId], {
    execute: !!epicId,
  });
};

export const useLabels = () => {
  return useCachedPromise<() => Promise<Label[]>>(() => shortcut.listLabels({}).then((res) => res.data));
};

export const useLabelsMap = () => {
  const { data } = useLabels();

  return useMemo(() => {
    return data?.reduce((map, label) => ({ ...map, [label.id]: label }), {} as Record<number, Label>) || {};
  }, [data]);
};
