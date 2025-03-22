import fetch from "node-fetch";
import { getToken } from ".";
import { AppSlug, ApiResponse, PipelinesAndWorkflows } from "./types";

export async function fetchWorkflows(appSlug: AppSlug): Promise<PipelinesAndWorkflows> {
  const url = `https://api.bitrise.io/v0.1/apps/${appSlug}/pipelines/active-pipelineables`;
  const response = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: getToken(),
    },
  });

  const apiResponse = (await response.json()) as ApiResponse<PipelinesAndWorkflows>;
  if (apiResponse.message) {
    console.error(url);
    throw new Error(apiResponse.message);
  }

  return apiResponse.data;
}
