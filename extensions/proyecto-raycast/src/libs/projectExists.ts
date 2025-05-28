import { listProjects } from "./listProjects";

export async function projectExists(name: string) {
  const dir = await listProjects();
  return dir.includes(name);
}
