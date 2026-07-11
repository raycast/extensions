import { useExec } from "@raycast/utils";
import { DockerNetwork } from "../utils/types";
import { CLI_ENV } from "../utils/cli";
import { parseNDJSON } from "../utils/ndjson";

export function useDockerNetworks() {
  return useExec("docker", ["network", "ls", "--format", "json"], {
    env: CLI_ENV,
    parseOutput: ({ stdout }) =>
      parseNDJSON<DockerNetwork>(stdout, (item) => ({
        id: String(item.ID || ""),
        name: String(item.Name || ""),
        driver: String(item.Driver || ""),
        scope: String(item.Scope || ""),
      })),
    keepPreviousData: true,
    initialData: [] as DockerNetwork[],
    failureToastOptions: {
      title: "Failed to list Docker networks",
      message: "Make sure Docker is running",
    },
  });
}
