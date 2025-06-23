import { Akiflow } from "../../utils/akiflow";
import { getPreferenceValues } from "@raycast/api";

/**
 * @returns a list of projects with values title, id, color, and icon. If color is null, the project is a folder. If color is not null, it is a project.
 */
export default async function () {
  const refreshToken = getPreferenceValues<Preferences>().refreshToken;
  const akiflow = new Akiflow(refreshToken);
  await akiflow.refreshProjects();
  await akiflow.projectsPromise;
  return akiflow.projects;
}
