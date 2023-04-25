import fetch from "node-fetch";
import { getToken } from ".";
import { groupBy } from "../util/util";
import { AppSlug, Build, BuildsByStatus, BuildStatus, ApiResponse, BuildParams, BuildTriggerResponse } from "./types";

export async function fetchBuilds(appSlug: AppSlug | "all"): Promise<BuildsByStatus> {
  const url =
    appSlug == "all" ? "https://api.bitrise.io/v0.1/builds" : `https://api.bitrise.io/v0.1/apps/${appSlug}/builds`;
  const response = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: getToken(),
    },
  });
  if (!response.ok) {
    throw new Error("HTTP error " + response.status);
  }
  const apiResponse = (await response.json()) as ApiResponse<Build[]>;

  if (apiResponse.message) {
    console.error(apiResponse.message);
    throw new Error(apiResponse.message);
  }

  const buildsByStatus = groupBy(apiResponse.data, (build) => build.status);

  let completedBuilds: Build[] = [];
  completedBuilds = completedBuilds.concat(buildsByStatus.get(BuildStatus.Successful) ?? []);
  completedBuilds = completedBuilds.concat(buildsByStatus.get(BuildStatus.Failed) ?? []);
  completedBuilds = completedBuilds.concat(buildsByStatus.get(BuildStatus.AbortedWithFailure) ?? []);
  completedBuilds = completedBuilds.concat(buildsByStatus.get(BuildStatus.AbortedWithSuccess) ?? []);

  completedBuilds.sort((a, b) => new Date(b.triggered_at).getTime() - new Date(a.triggered_at).getTime());

  return {
    inProgress: buildsByStatus.get(BuildStatus.InProgress) ?? [],
    completed: completedBuilds,
  };
}

export async function startBuild(appSlug: AppSlug, params: BuildParams): Promise<BuildTriggerResponse> {
  const response = await fetch(`https://api.bitrise.io/v0.1/apps/${appSlug}/builds`, {
    method: "POST",
    body: JSON.stringify({
      build_params: params,
      hook_info: {
        type: "bitrise",
      },
      triggered_by: "Bitrise Raycast extension",
    }),
    headers: {
      Authorization: getToken(),
    },
  });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`HTTP ${response.status}: ${body}`);
  }

  const apiResponse = (await response.json()) as BuildTriggerResponse;

  return apiResponse;
}
