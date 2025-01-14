import { ProjectFieldsFragment } from "./../generated/graphql";
import { getGitHubUser } from "./users";

export function getProjectCreator(project: ProjectFieldsFragment) {
  return getGitHubUser(project.creator);
}
