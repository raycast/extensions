import { getLocalProjects } from "../lib/apps";
import { editWithAgent } from "../lib/deeplinks";
type Input = {
  /** The exact project ID returned by list-projects. */
  projectId: string;
};
export default async function tool({ projectId }: Input) {
  const project = (await getLocalProjects()).find(
    (item) => item.id === projectId,
  );
  if (!project?.runtimePath)
    throw new Error("Project not found. List projects and use an exact ID.");
  await editWithAgent(project.runtimePath, project.id);
  return { status: "opened", name: project.displayName };
}
