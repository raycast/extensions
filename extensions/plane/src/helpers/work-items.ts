import { Issue, Project } from "@makeplane/plane-node-sdk";
import { getAppBaseUrl } from "./urls";

export const getWorkItemIdentifier = (project: Project, workItem: Issue) => {
  return `${project.identifier}-${workItem.sequenceId}`;
};

export const getWorkItemBrowseUrl = (slug: string, project: Project, workItem: Issue) => {
  const workItemIdentifier = getWorkItemIdentifier(project, workItem);
  return getWorkItemUrlWithIdentifier(slug, workItemIdentifier);
};

export const getWorkItemUrlWithIdentifier = (slug: string, workItemIdentifier: string) => {
  return `${getAppBaseUrl()}/${slug}/browse/${workItemIdentifier}`;
};

export const getProjectUrl = (slug: string, projectId: string) => {
  return `${getAppBaseUrl()}/${slug}/projects/${projectId}/issues`;
};

export const getCycleUrl = (slug: string, projectId: string, cycleId: string) => {
  return `${getAppBaseUrl()}/${slug}/projects/${projectId}/cycles/${cycleId}`;
};

export const getModuleUrl = (slug: string, projectId: string, moduleId: string) => {
  return `${getAppBaseUrl()}/${slug}/projects/${projectId}/modules/${moduleId}`;
};

export const getIntakeUrl = (slug: string, projectId: string) => {
  return `${getAppBaseUrl()}/${slug}/projects/${projectId}/intake`;
};

export const getPageUrl = (slug: string, pageId: string, projectId?: string) => {
  return projectId
    ? `${getAppBaseUrl()}/${slug}/projects/${projectId}/pages/${pageId}`
    : `${getAppBaseUrl()}/${slug}/pages/${pageId}`;
};

export const getPagesUrl = (slug: string, projectId?: string) => {
  return projectId ? `${getAppBaseUrl()}/${slug}/projects/${projectId}/pages` : `${getAppBaseUrl()}/${slug}/pages`;
};
