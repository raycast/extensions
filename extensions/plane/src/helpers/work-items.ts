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
