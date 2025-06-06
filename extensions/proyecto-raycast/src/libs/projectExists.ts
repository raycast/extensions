import { listProjects } from "./listProjects";

export async function projectExists(name: string) {
  const dir = await listProjects();
  return dir.map((p) => p.toLowerCase()).includes(name.toLowerCase());
}
