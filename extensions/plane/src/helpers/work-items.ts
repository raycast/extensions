import { Issue, Project } from "@makeplane/plane-node-sdk";
import { getPreferenceValues } from "@raycast/api";

const preferences = getPreferenceValues<Preferences>();

export const getWorkItemIdentifier = (project: Project, workItem: Issue) => {
  return `${project.identifier}-${workItem.sequenceId}`;
};

export const getWorkItemBrowseUrl = (slug: string, project: Project, workItem: Issue) => {
  const workItemIdentifier = getWorkItemIdentifier(project, workItem);
  return `${preferences.APP_BASE_URL}/${slug}/browse/${workItemIdentifier}`;
};

export const getWorkItemUrlWithIdentifier = (slug: string, workItemIdentifier: string) => {
  return `${preferences.APP_BASE_URL}/${slug}/browse/${workItemIdentifier}`;
};
