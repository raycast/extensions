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
  const results = await Promise.allSettled(
    applicationUuids.map((uuid) => request<DeploymentHistory>(`deployments/applications/${uuid}?take=${take}`)),
  );
  const deploymentHistories = results
    .filter((result): result is PromiseFulfilledResult<DeploymentHistory> => result.status === "fulfilled")
    .map((result) => result.value);

  if (applicationUuids.length > 0 && deploymentHistories.length === 0) {
    const failure = results.find((result) => result.status === "rejected");
    throw failure?.status === "rejected" && failure.reason instanceof Error
      ? failure.reason
      : new Error("Failed to fetch deployment history");
  }

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
