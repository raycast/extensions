import { URLSearchParams } from "url";
import { ApplicationsResponse, Application, Build, BuildsResponse } from "./types";
import { request } from "./util";

export async function fetchApps(signal: AbortSignal): Promise<Application[]> {
  const path = "/apps";
  const res = await request(path);
  const json = (await res.json()) as ApplicationsResponse;
  return json.applications;
}

export async function fetchBuilds(appId: string, signal: AbortSignal): Promise<Build[]> {
  const params = new URLSearchParams(`appId=${appId}`);
  const path = "/builds" + "?" + params.toString();
  const res = await request(path);
  const json = (await res.json()) as BuildsResponse;
  return json.builds;
}

export async function cancelBuild(build: Build): Promise<boolean> {
  const path = `/builds/${build._id}/cancel`;
  const res = await request(path);
  const success = res.status >= 200 && res.status < 400;
  return success;
}

export async function rerunBuild(build: Build): Promise<boolean> {
  const path = `/builds`;
  const body = {
    appId: build.appId,
    branch: build.branch,
    tag: null,
    workflowId: build.fileWorkflowId,
  };
  const headers = {
    "Content-Type": "application/json;charset=utf-8",
  };
  const res = await request(path, body, headers, "POST");
  const json = (await res.json()) as { buildId: string };
  return !!json.buildId;
}
