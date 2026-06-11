import { useExec } from "@raycast/utils";
import { DockerContainer } from "../utils/types";
import { CLI_ENV } from "../utils/cli";
import { parseNDJSON } from "../utils/ndjson";

export function useDockerContainers() {
  return useExec("docker", ["ps", "-a", "--format", "json"], {
    env: CLI_ENV,
    parseOutput: ({ stdout }) =>
      parseNDJSON<DockerContainer>(stdout, (item) => ({
        id: String(item.ID || ""),
        names: String(item.Names || ""),
        image: String(item.Image || ""),
        status: String(item.Status || ""),
        state: String(item.State || ""),
        ports: String(item.Ports || ""),
        createdAt: String(item.CreatedAt || ""),
      })),
    keepPreviousData: true,
    initialData: [] as DockerContainer[],
    failureToastOptions: {
      title: "Failed to list Docker containers",
      message: "Make sure Docker is running",
    },
  });
}
