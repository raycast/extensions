import { LocalStorage, open } from "@raycast/api";
import { Project } from "../models/project";
import { getConfig } from "../config";

export async function getAllProjects() {
  const response = await LocalStorage.allItems();

  return (
    (Object.values(response).map((value) => JSON.parse(value)) as Project[]) ??
    []
  );
}

export async function createNewServer(projectId: string) {
  const { consoleURL } = getConfig();
  await open(`${consoleURL}/projects/${projectId}/servers/create`);
}
