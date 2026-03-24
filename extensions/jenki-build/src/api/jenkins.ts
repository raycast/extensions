import {
  RawJenkinsNode,
  JenkinsJob,
  BuildParameter,
  JenkinsParamType,
  LastBuild,
} from "../types";
import { normalizeJobStatus } from "../utils/status";
import { assertOk } from "../utils/errors";
import { getPreferenceValues } from "@raycast/api";

export function buildAuthHeader(username: string, apiToken: string): string {
  return "Basic " + Buffer.from(`${username}:${apiToken}`).toString("base64");
}

function toHttps(url: string): string {
  return url.replace(/^http:\/\//i, "https://");
}

export function buildTree(depth: number): string {
  if (depth === 0)
    return "name,url,color,_class,lastBuild[number,timestamp,result]";
  const inner = buildTree(depth - 1);
  return `name,url,color,_class,jobs[${inner}]`;
}

export function flattenJobs(
  nodes: RawJenkinsNode[],
  parentPath = "",
): JenkinsJob[] {
  return nodes.flatMap((node) => {
    const path = parentPath ? `${parentPath}/${node.name}` : node.name;
    const hasChildren = Array.isArray(node.jobs) && node.jobs.length > 0;
    const isMultiBranch = node._class?.includes("MultiBranch") ?? false;

    if (isMultiBranch && hasChildren) {
      return flattenJobs(node.jobs!, path);
    }
    if (isMultiBranch && !hasChildren) {
      return [];
    }
    if (hasChildren) {
      return flattenJobs(node.jobs!, path);
    }
    return [
      {
        name: node.name,
        url: toHttps(node.url),
        path,
        status: normalizeJobStatus(node.color ?? "notbuilt"),
        _class: node._class,
        lastBuild: node.lastBuild
          ? {
              number: node.lastBuild.number,
              timestamp: node.lastBuild.timestamp,
              result: node.lastBuild.result as LastBuild["result"],
            }
          : undefined,
      },
    ];
  });
}

export async function fetchJobTree(): Promise<JenkinsJob[]> {
  const prefs = getPreferenceValues<Preferences>();
  const treeQuery = buildTree(6);
  const url = `${prefs.jenkinsUrl.replace(/\/$/, "")}/api/json?tree=jobs[${treeQuery}]`;
  const response = await fetch(url, {
    headers: { Authorization: buildAuthHeader(prefs.username, prefs.apiToken) },
  });
  assertOk(response);
  const data = (await response.json()) as { jobs: RawJenkinsNode[] };
  return flattenJobs(data.jobs ?? []);
}

async function fetchCrumb(prefs: Preferences): Promise<Record<string, string>> {
  const url = `${prefs.jenkinsUrl.replace(/\/$/, "")}/crumbIssuer/api/json`;
  const response = await fetch(url, {
    headers: { Authorization: buildAuthHeader(prefs.username, prefs.apiToken) },
  });
  if (!response.ok) return {}; // crumb disabled or not available
  const data = (await response.json()) as {
    crumbRequestField: string;
    crumb: string;
  };
  return { [data.crumbRequestField]: data.crumb };
}

export async function fetchJobParameters(
  jobUrl: string,
): Promise<BuildParameter[]> {
  const prefs = getPreferenceValues<Preferences>();
  const url = `${toHttps(jobUrl).replace(/\/$/, "")}/api/json?tree=property[parameterDefinitions[name,description,type,defaultParameterValue[value],choices]]`;
  const response = await fetch(url, {
    headers: { Authorization: buildAuthHeader(prefs.username, prefs.apiToken) },
  });
  assertOk(response);
  const data = (await response.json()) as {
    property?: Array<{
      parameterDefinitions?: Array<{
        name: string;
        type: string;
        description?: string;
        defaultParameterValue?: { value: string | boolean };
        choices?: string[];
      }>;
    }>;
  };
  const paramsProp = data.property?.find((p) =>
    Array.isArray(p.parameterDefinitions),
  );
  if (!paramsProp?.parameterDefinitions) return [];
  return paramsProp.parameterDefinitions.map((p) => ({
    name: p.name,
    type: p.type as JenkinsParamType,
    description: p.description,
    defaultValue: p.defaultParameterValue?.value,
    choices: p.choices,
  }));
}

export async function triggerBuild(
  jobUrl: string,
  params: Record<string, string>,
): Promise<string> {
  const prefs = getPreferenceValues<Preferences>();
  const crumbHeaders = await fetchCrumb(prefs);
  const hasParams = Object.keys(params).length > 0;
  const endpoint = hasParams ? "buildWithParameters" : "build";
  const qs = hasParams
    ? `?${new URLSearchParams(params).toString()}`
    : "?delay=0sec";
  const url = `${toHttps(jobUrl).replace(/\/$/, "")}/${endpoint}${qs}`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: buildAuthHeader(prefs.username, prefs.apiToken),
      ...crumbHeaders,
    },
    redirect: "manual",
  });
  if (response.status !== 201) {
    assertOk(response);
  }
  return response.headers.get("location") ?? "";
}

export interface BuildStatus {
  building: boolean;
  result: "SUCCESS" | "FAILURE" | "ABORTED" | "UNSTABLE" | null;
  duration: number;
  estimatedDuration: number;
  timestamp: number;
  displayName: string;
  url: string;
}

export async function fetchBuildStatus(buildUrl: string): Promise<BuildStatus> {
  const prefs = getPreferenceValues<Preferences>();
  const url = `${toHttps(buildUrl).replace(/\/$/, "")}/api/json?tree=building,result,duration,estimatedDuration,timestamp,displayName,url`;
  const response = await fetch(url, {
    headers: { Authorization: buildAuthHeader(prefs.username, prefs.apiToken) },
  });
  assertOk(response);
  return (await response.json()) as BuildStatus;
}

export async function pollQueueItem(
  queueItemUrl: string,
): Promise<number | null> {
  const prefs = getPreferenceValues<Preferences>();
  const url = `${toHttps(queueItemUrl).replace(/\/$/, "")}/api/json`;
  const response = await fetch(url, {
    headers: { Authorization: buildAuthHeader(prefs.username, prefs.apiToken) },
  });
  if (!response.ok) return null;
  const data = (await response.json()) as {
    executable?: { number: number; url: string };
  };
  return data.executable?.number ?? null;
}
