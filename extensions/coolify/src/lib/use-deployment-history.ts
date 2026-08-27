import { usePromise } from "@raycast/utils";
import { API_HEADERS } from "./config";
import { Deployment, DeploymentHistory, ResourceDetails } from "./types";
import { generateCoolifyUrl, parseCoolifyResponse } from "./utils";

export default function useDeploymentHistory(take: number) {
  return usePromise(fetchDeploymentHistory, [take], {
    failureToastOptions: {
      title: "Failed to fetch deployments",
    },
  });
}

async function fetchDeploymentHistory(take: number): Promise<Deployment[]> {
  const resources = await request<ResourceDetails[]>("resources");
  const applicationUuids = resources
    .filter((resource) => resource.type === "application")
    .map((resource) => resource.uuid);
  const deploymentHistories = await Promise.all(
    applicationUuids.map((uuid) => request<DeploymentHistory>(`deployments/applications/${uuid}?take=${take}`)),
  );

  return deploymentHistories
    .flatMap((history) => history.deployments)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

async function request<T>(endpoint: string): Promise<T> {
  const response = await fetch(generateCoolifyUrl(`api/v1/${endpoint}`), {
    headers: API_HEADERS,
  });
  return parseCoolifyResponse<T>(response);
}
