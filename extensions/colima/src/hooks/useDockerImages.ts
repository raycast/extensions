import { useExec } from "@raycast/utils";
import { DockerImage } from "../utils/types";
import { CLI_ENV } from "../utils/cli";
import { parseNDJSON } from "../utils/ndjson";

export function useDockerImages() {
  return useExec("docker", ["images", "--format", "json"], {
    env: CLI_ENV,
    parseOutput: ({ stdout }) =>
      parseNDJSON<DockerImage>(stdout, (item) => ({
        id: String(item.ID || ""),
        repository: String(item.Repository || ""),
        tag: String(item.Tag || ""),
        size: String(item.Size || ""),
        createdAt: String(item.CreatedAt || ""),
        createdSince: String(item.CreatedSince || ""),
      })),
    keepPreviousData: true,
    initialData: [] as DockerImage[],
    failureToastOptions: {
      title: "Failed to list Docker images",
      message: "Make sure Docker is running",
    },
  });
}
