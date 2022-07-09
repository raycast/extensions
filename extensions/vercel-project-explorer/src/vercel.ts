import { environment, getPreferenceValues, List, showToast, Toast } from "@raycast/api";
import fetch, { Headers } from "node-fetch";
import type { Team, Deployment, Project, Environment, User, CreateEnvironmentVariableResponse, Build, Pagination, Paginated, CreateEnvironment } from "./types";

export const token = getPreferenceValues().accessToken;
const headers = new Headers({
  Authorization: "Bearer " + token,
});
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

/*
 * Fetch all projects for the user and optional teams
 */
export async function fetchProjects(username: User['username'], teams?: Team[]): Promise<Project[]> {
  const projects: Project[] = [];
  if (teams?.length) {
    for (const team of teams) {
      projects.push(...(await _rawFetchProjects(team)));
    }
  } else {
    projects.push(...(await _rawFetchProjects()));
  }
  const projectsWithoutDuplicates = projects.filter(
    (value, index, self) => index === self.findIndex((t) => t.id === value.id)
  );

  return projectsWithoutDuplicates.sort((a, b) => (a.updatedAt && b.updatedAt ? b.updatedAt - a.updatedAt : 0));
}

async function _rawFetchProjects(team?: Team, limit = 100): Promise<Project[]> {
  try {
    const projects: Project[] = [];
    const query = new URLSearchParams({
      teamId: team ? team.id : "",
      limit: limit.toString(),
    });

    const response = await fetch(apiURL + `v8/projects?${query.toString()}`, {
      method: "get",
      headers: headers,
    });
    const json = (await response.json()) as { projects: Project[] };
    for (const project of json.projects) {
      projects.push(project);
    }

    return projects;
  } catch (err) {
    console.error(err);
    showToast({
      style: Toast.Style.Failure,
      title: "Failed to fetch projects",
    });
    throw new Error("Failed to fetch projects");
  }
}

export async function deleteProjectById(projectId: Project['id'], teamId?: Team['id']) {
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

export async function deleteEnvironmentVariableById(projectId: Project['id'], envId: Environment['id']): Promise<Environment> {
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

export async function fetchProjectById(projectId: Project['id'], teamId?: string) {
  try {
    const response = await fetch(apiURL + `v8/projects/${projectId}`, {
      method: "get",
      headers: headers,
    });

    const json = (await response.json()) as Project;
    return json;
  } catch (err) {
    console.error(err);
    showToast({
      style: Toast.Style.Failure,
      title: "Failed to fetch project",
    });
    throw new Error("Failed to fetch project");
  }
}

// https://vercel.com/api/v6/now/deployments?projectId=QmV9keBmvL9dHT4gaCpxaSAAk6Qq5mNYpBRi5aT2mt9yeb&limit=50&target=production
export async function fetchDeploymentsForProject(project: Project, teamId?: string, limit = 75, target = "production") {
  try {
    const query = new URLSearchParams({
      projectId: project.id,
      limit: limit.toString(),
      teamId: teamId?.toString() || "",
      target,
    });
    const response = await fetch(apiURL + `v6/deployments?${query.toString()}`, {
      method: "get",
      headers: headers,
    });
    const json = (await response.json()) as { deployments: Deployment[] };
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

export async function fetchDeployments(teamId?: string, limit = 100, maxToFetch = 200) {
  try {
    const fetchURL = apiURL + `v6/deployments?teamId=${teamId ?? ""}&limit=${limit}`;
    const response = await fetch(fetchURL, {
      method: "get",
      headers: headers,
    });
    const json = (await response.json()) as { deployments: Deployment[], pagination: Pagination };

    const { deployments, pagination } = json;

    while (pagination.next && deployments.length < maxToFetch) {
      const next = await fetch(fetchURL + "&after=" + pagination.next, {
        method: "get",
        headers: headers,
      });
      const nextJson = (await next.json()) as { deployments: Deployment[], pagination: Pagination };
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

export async function fetchDeploymentBuildsByDeploymentId(deploymentId: string) {
  try {
    const response = await fetch(apiURL + `v11/deployments/${deploymentId}/builds`, {
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
  projectId: Project['id'],
  envId: Environment['id'],
  envVar: Partial<Environment>
): Promise<Environment> {
  const environmentVariable: Environment = await _rawUpdateProjectEnvironmentVariable(projectId, envId, envVar);
  return environmentVariable;
}

export async function updateProject(projectId: string, project: Partial<Project>, teamId?: string): Promise<Project> {
  const response = await fetch(apiURL + `v8/projects/${projectId}?teamId=${teamId ? teamId : ""}`, {
    method: "patch",
    headers: headers,
    body: JSON.stringify(project),
  });
  const json = (await response.json()) as Project;
  return json;
}

// TODO: use Omit<>
export async function createEnvironmentVariable(
  projectId: Project['id'],
  envVar: CreateEnvironment,
  teamId?: Team['id']
): Promise<CreateEnvironmentVariableResponse> {
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
  projectId: Project['id'],
  envId: Environment['id'],
  envVar: Partial<Environment>
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

export async function getScreenshotImageURL(deploymentId: Deployment['id']) {
  function arrayBufferToBase64(buffer: ArrayBuffer) {
    let binary = '';
    const bytes = [].slice.call(new Uint8Array(buffer));

    bytes.forEach((b) => binary += String.fromCharCode(b));

    return btoa(binary);
  };

  const theme = environment.theme === "light" ? "0" : "1";
  const image = await fetch(`https://vercel.com/api/screenshot?dark=${theme}&deploymentId=${deploymentId}&withStatus=false`,
    {
      method: "get",
      headers: headers,
    })

  const arrayBuffer = await image.arrayBuffer();
  const base64Flag = 'data:image/png;base64,';
  const imageStr = base64Flag + arrayBufferToBase64(arrayBuffer);

  return imageStr;
}

// requests are of the form (for deployments):
// deployments: Deployment[], pagination: Pagination,