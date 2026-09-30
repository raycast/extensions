import { getProjects, initGlobalProjectInfo } from "../service/project";

export default async function () {
  await initGlobalProjectInfo();
  return getProjects();
}
