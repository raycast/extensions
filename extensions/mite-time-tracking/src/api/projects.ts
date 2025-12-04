import { MiteClient } from "./client";
import type { MiteProject } from "./types";

export async function getProjects(): Promise<MiteProject[]> {
  const client = new MiteClient();
  const response =
    await client.get<Array<{ project: MiteProject }>>("/projects.json");

  return response
    .map((item) => item.project)
    .filter((project) => !project.archived)
    .sort((a, b) => a.name.localeCompare(b.name));
}
