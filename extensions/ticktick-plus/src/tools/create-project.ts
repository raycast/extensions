import { createProject } from "../api/ticktick";

type Input = {
  /** Project name */
  name: string;
  /** Optional hex color (e.g. #4A90E2) */
  color?: string;
};

/**
 * Create a new TickTick project/list.
 */
export default async function tool(input: Input) {
  const name = input.name?.trim();
  if (!name) throw new Error("Project name is required.");
  const project = await createProject(name, input.color);
  return {
    project: {
      id: project.id,
      name: project.name,
      color: project.color,
    },
  };
}
