import { open } from "@raycast/api";
import { getConfig } from "./config";

export default async function Command() {
  const { consoleURL, projectId } = getConfig();
  await open(`${consoleURL}/projects/${projectId}/servers/create`);
}
