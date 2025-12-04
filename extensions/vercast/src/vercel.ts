import { environment, getPreferenceValues, showToast, Toast } from "@raycast/api";
import type {
  Team,
  Deployment,
  Project,
  Environment,
  User,
  CreateEnvironmentVariableResponse,
  Build,
  Pagination,
  CreateEnvironment,
  Domain,
} from "./types";

export const token = getPreferenceValues().accessToken;
const headers = {
  Authorization: "Bearer " + token,
};

export const FetchHeaders = Object.entries(headers);

const apiURL = "https://api.vercel.com/";

// Fetch the username that belongs to the token given.
// Use for filtering deployments by user and providing links later on
export async function fetchUser(): Promise<User> {
  try {
    const response = await fetch(apiURL + "www/user", {
      method: "get",
      headers: headers,
    });

    const json = (await response.json()) as { user: User };

    return json.user;
  } catch (err) {
    console.error(err);
    showToast({
      style: Toast.Style.Failure,
      title: "Failed to fetch user info",
    });
    throw new Error("Failed to fetch user info");
  }
}

/*
 * Fetch all teams for user
 */
export async function fetchTeams(): Promise<Team[]> {
  const response = await fetch(apiURL + "v1/teams", {
    method: "get",
    headers: headers,
  });
  const json = (await response.json()) as { teams: Team[] };
  const teams: Team[] = [];
  for (const team of json.teams) {
    teams.push(team);
  }
  return teams;
}

export async function deleteProjectById(projectId: Project["id"], teamId?: Team["id"]) {
  try {
    const response = await fetch(apiURL + `v8/projects/${projectId}?teamId=${teamId ?? ""}`, {
      method: "delete",
      headers: headers,
    });
    const json = (await response.json()) as { project: Project };
    return json.project;
  } catch (e) {
    console.error(e);
    showToast({
      style: Toast.Style.Failure,
      title: "Failed to delete project",
    });
    throw new Error("Failed to delete project");
  }
}

export async function deleteEnvironmentVariableById(
  projectId: Project["id"],
  envId: Environment["id"],
): Promise<Environment> {
  try {
    const response = await fetch(apiURL + `v8/projects/${projectId}/env/${envId}`, {
      method: "delete",
      headers: headers,
    });
    const json = (await response.json()) as { environment: Environment };
    return json.environment;
  } catch (e) {
    console.error(e);
    showToast({
      style: Toast.Style.Failure,
      title: "Failed to delete environment variable",
    });
    throw new Error("Failed to delete environment variable");
  }
}

export function getFetchDeploymentsURL(teamId?: string, projectId?: string, limit = 100) {
  const url = apiURL + `v6/deployments`;

  let query = `?limit=${limit}&teamId=${teamId ?? ""}`;
  if (projectId) {
    query += `&projectId=${projectId}`;
  }

  return url + query;
}

export async function fetchDeployments(teamId?: string, limit = 100, maxToFetch = 300) {
  try {
    const fetchURL = getFetchDeploymentsURL(teamId, undefined, limit);
    const response = await fetch(fetchURL, {
      method: "get",
      headers: headers,
    });
    const json = (await response.json()) as { deployments: Deployment[]; pagination: Pagination };

    // eslint-disable-next-line prefer-const
    let { deployments, pagination } = json;

    while (pagination?.next && deployments.length < maxToFetch) {
      const next = await fetch(fetchURL + "&until=" + pagination.next, {
        method: "get",
        headers: headers,
      });
      const nextJson = (await next.json()) as { deployments: Deployment[]; pagination: Pagination };
      pagination = nextJson.pagination;
      json.deployments.push(...nextJson.deployments);
    }

    return json.deployments;
  } catch (err) {
    console.error(err);
    showToast({
      style: Toast.Style.Failure,
      title: "Failed to fetch deployments",
    });
    throw new Error("Failed to fetch deployments");
  }
}

export function getFetchDeploymentBuildsURL(
  deploymentId: Deployment["uid"] | string,
  teamId?: Team["id"],
  limit = 100,
) {
  return apiURL + `v11/deployments/${deploymentId}/builds?limit=${limit}&teamId=${teamId ?? ""}`;
}

export async function fetchDeploymentBuildsByDeploymentId(deploymentId: string, teamId?: string, limit?: number) {
  try {
    const response = await fetch(getFetchDeploymentBuildsURL(deploymentId, teamId, limit), {
      method: "get",
      headers: headers,
    });
    const json = (await response.json()) as { builds: Build[] };
    return json.builds;
  } catch (err) {
    console.error(err);
    showToast({
      style: Toast.Style.Failure,
      title: "Failed to fetch deployment builds",
    });
    throw new Error("Failed to fetch deployment builds");
  }
}

// Fetch project environment variable
export async function fetchEnvironmentVariables(projectId: string, teamId?: string): Promise<Environment[]> {
  const environmentVariables: Environment[] = [...(await _rawFetchProjectEnvironmentVariables(projectId, teamId))];
  return environmentVariables.sort((a, b) => b.updatedAt - a.updatedAt);
}

export function getFetchProjectsURL(teamId?: string, limit = 100) {
  return apiURL + `v8/projects?teamId=${teamId ?? ""}&limit=${limit}`;
}

export async function fetchProjects(teamId?: string, limit = 100): Promise<Project[]> {
  const response = await fetch(getFetchProjectsURL(teamId, limit), {
    method: "get",
    headers: headers,
  });
  const json = (await response.json()) as { projects: Project[] };
  return json.projects;
}

// Raw function for fetching project environment variable
async function _rawFetchProjectEnvironmentVariables(projectId: string, teamId?: string): Promise<Environment[]> {
  try {
    const response = await fetch(apiURL + `v8/projects/${projectId}/env?teamId=${teamId ?? ""}`, {
      method: "get",
      headers: headers,
    });
    const json = (await response.json()) as { envs: Environment[] };

    return json.envs;
  } catch (err) {
    console.error(err);
    showToast({
      style: Toast.Style.Failure,
      title: "Failed to fetch environment variable",
    });
    throw new Error("Failed to fetch environment variable");
  }
}

// Update project environment variable
export async function updateEnvironmentVariable(
  projectId: Project["id"],
  envId: Environment["id"],
  envVar: Partial<Environment>,
): Promise<Environment> {
  const environmentVariable: Environment = await _rawUpdateProjectEnvironmentVariable(projectId, envId, envVar);
  return environmentVariable;
}

// TODO: use Omit<>
export async function createEnvironmentVariable(
  projectId: Project["id"],
  envVar: CreateEnvironment,
  teamId?: Team["id"],
): Promise<CreateEnvironmentVariableResponse> {
  envVar["type"] = "encrypted";

  try {
    const response = await fetch(apiURL + `v9/projects/${projectId}/env?teamId=${teamId ? teamId : ""}`, {
      method: "post",
      headers: headers,
      body: JSON.stringify(envVar),
    });
    const json = (await response.json()) as CreateEnvironmentVariableResponse;
    return json;
  } catch (e) {
    console.error(e);
    showToast({
      style: Toast.Style.Failure,
      title: "Failed to create environment variable",
    });
    throw new Error("Failed to create environment variable");
  }
}

async function _rawUpdateProjectEnvironmentVariable(
  projectId: Project["id"],
  envId: Environment["id"],
  envVar: Partial<Environment>,
): Promise<Environment> {
  try {
    const response = await fetch(apiURL + `v8/projects/${projectId}/env/${envId}`, {
      method: "patch",
      headers: headers,
      body: JSON.stringify(envVar),
    });
    const environmentVariable = (await response.json()) as Environment;
    return environmentVariable;
  } catch (err) {
    console.error(err);
    showToast({
      style: Toast.Style.Failure,
      title: "Failed to fetch environment variable",
    });
    throw new Error("Failed to fetch environment variable");
  }
}

function arrayBufferToBase64(buffer: ArrayBuffer) {
  let binary = "";
  const bytes = [].slice.call(new Uint8Array(buffer));

  bytes.forEach((b) => (binary += String.fromCharCode(b)));

  return btoa(binary);
}

export async function getScreenshotImageURL(deploymentId: Deployment["uid"], teamId?: string) {
  try {
    const theme = environment.appearance === "light" ? "0" : "1";
    const response = await fetch(
      `https://vercel.com/api/screenshot?dark=${theme}&deploymentId=${deploymentId}&withStatus=false&teamId=${teamId ?? ""}`,
      {
        method: "get",
        headers: headers,
      },
    );

    if (response.status !== 200) {
      return null;
    }

    const arrayBuffer = await response.arrayBuffer();
    const base64Flag = "data:image/png;base64,";
    const imageStr = base64Flag + arrayBufferToBase64(arrayBuffer);
    return imageStr;
  } catch (e) {
    console.error(e);
    return null;
  }
}

export function getDeploymentURL(userOrTeamSlug: string, projectName: string, deploymentId: Deployment["uid"]) {
  if (deploymentId.startsWith("dpl_")) {
    deploymentId = deploymentId.substring(4);
  }

  return `https://vercel.com/${userOrTeamSlug}/${projectName}/${deploymentId}`;
}

export function getFetchDomainsURL(teamId?: string, limit = 100) {
  return apiURL + `v5/domains?teamId=${teamId ?? ""}&limit=${limit}`;
}

export async function fetchDomains(teamId?: string, limit = 100) {
  const response = await fetch(getFetchDomainsURL(teamId, limit), {
    method: "get",
    headers: headers,
  });
  const json = (await response.json()) as { domains: Domain[] };
  return json.domains;
}

export async function checkDomainAvailability(domain: string) {
  const response = await fetch(apiURL + `v4/domains/status?name=${domain}`, {
    method: "get",
    headers: headers,
  });
  const json = (await response.json()) as { available: string; error?: { code: string; message: string } };
  if (json.error) {
    return "Check domain availability failed. Please verify that the domain is valid or try again later.";
  }
  return json.available;
}
