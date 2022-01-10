import { preferences, showToast, ToastStyle } from "@raycast/api";
import fetch, { Headers } from "node-fetch";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";

const headers = new Headers({
  Authorization: "Bearer " + preferences.token.value,
});
const apiURL = "https://api.vercel.com/";

export enum DeploymentState {
  ready,
  failed,
  deploying,
  canceled,
}

export interface Deployment {
  project: string;
  state: DeploymentState;
  timeSince: string;
  rawTime: number;
  id: string;
  url: string;
  domain: string;
  owner: string;
}

export interface Team {
  slug: string;
  id: string;
}

export interface EnvironmentVariable {
  type: string;
  id: string;
  key: string;
  value: string;
  target: string[];
  gitBranch: string;
  configurationId: string;
  createdAt: number;
  updatedAt: number;
}

// Fetch the username that belongs to the token given.
// Use for filtering deployments by user and providing links later on
export async function fetchUsername(): Promise<string> {
  try {
    const response = await fetch(apiURL + "www/user", {
      method: "get",
      headers: headers,
    });
    const json = await response.json();
    return json.user.username;
  } catch (err) {
    console.error(err);
    showToast(ToastStyle.Failure, "Failed to fetch username");
    throw new Error("Failed to fetch username");
  }
}

// Fetch teams that the user is apart of
export async function fetchTeams(ignoredTeamIDs: string[]): Promise<Team[]> {
  const response = await fetch(apiURL + "v1/teams", {
    method: "get",
    headers: headers,
  });
  const json = await response.json();
  const teams: Team[] = [];
  for (const team of json.teams) {
    teams.push({ id: team.id, slug: team.slug });
  }
  return teams.filter((t) => !ignoredTeamIDs.includes(t.id));
}

// Fetch deployments for the user and any teams they are apart of
export async function fetchDeployments(username: string, teams: Team[]): Promise<Deployment[]> {
  const deployments: Deployment[] = [...(await rawFetchDeployments(username))];
  for (const team of teams) {
    deployments.push(...(await rawFetchDeployments(username, team)));
  }
  return deployments.sort((a, b) => b.rawTime - a.rawTime);
}

// Raw function for fetching deployments
async function rawFetchDeployments(username: string, team?: Team): Promise<Deployment[]> {
  dayjs.extend(relativeTime);
  try {
    const deployments: Deployment[] = [];
    const response = await fetch(apiURL + `v8/projects${team ? "?teamId=" + team.id : ""}`, {
      method: "get",
      headers: headers,
    });
    const json = await response.json();
    for (const project of json.projects) {
      for (const deployment of project.latestDeployments) {
        if (deployment.creator.username === username) {
          let state: DeploymentState;
          switch (deployment.readyState.toUpperCase()) {
            case "READY":
              state = DeploymentState.ready;
              break;
            case "BUILDING":
            case "QUEUED":
            case "INITIALIZING":
              state = DeploymentState.deploying;
              break;
            case "CANCELED":
              state = DeploymentState.canceled;
              break;
            default:
              state = DeploymentState.failed;
              break;
          }
          const owner = team ? team.slug : username;
          deployments.push({
            project: project.name,
            state: state,
            timeSince: dayjs(deployment.createdAt).fromNow(),
            id: deployment.id,
            url: `https://vercel.com/${owner}/${project.name}/${deployment.id.replace("dpl_", "")}`,
            domain: deployment.alias[0],
            owner,
            rawTime: deployment.createdAt,
          });
          break;
        }
      }
    }

    return deployments;
  } catch (err) {
    console.error(err);
    showToast(ToastStyle.Failure, "Failed to fetch deployments");
    throw new Error("Failed to fetch deployments");
  }
}

// Fetch project environment variable
export async function fetchEnvironmentVariables(projectId: string): Promise<EnvironmentVariable[]> {
  const environmentVariables: EnvironmentVariable[] = [...(await rawFetchProjectEnvironmentVariables(projectId))];
  return environmentVariables.sort((a, b) => b.updatedAt - a.updatedAt);
}

// Raw function for fetching project environment variable
async function rawFetchProjectEnvironmentVariables(projectId: string): Promise<EnvironmentVariable[]> {
  dayjs.extend(relativeTime);
  try {
    const environmentVariables: EnvironmentVariable[] = [];
    const response = await fetch(apiURL + `v8/projects/${projectId}/env`, {
      method: "get",
      headers: headers,
    });
    const json = await response.json();

    return json.envs;
  } catch (err) {
    console.error(err);
    showToast(ToastStyle.Failure, "Failed to fetch environment variable");
    throw new Error("Failed to fetch environment variable");
  }
}

// Update project environment variable
export async function updateEnvironmentVariable(
  projectId: string,
  envId: string,
  envKey: string,
  envValue: string
): Promise<EnvironmentVariable> {
  const environmentVariable: EnvironmentVariable = await rawUpdateProjectEnvironmentVariable(
    projectId,
    envId,
    envKey,
    envValue
  );
  return environmentVariable;
}

// Raw function for updating project environment variable
async function rawUpdateProjectEnvironmentVariable(
  projectId: string,
  envId: string,
  envKey: string,
  envValue: string
): Promise<EnvironmentVariable> {
  dayjs.extend(relativeTime);
  try {
    const response = await fetch(apiURL + `v8/projects/${projectId}/env/${envId}`, {
      method: "patch",
      headers: headers,
      body: JSON.stringify({
        value: envValue,
      }),
    });
    const environmentVariable = (await response.json()) as EnvironmentVariable;
    return environmentVariable;
  } catch (err) {
    console.error(err);
    showToast(ToastStyle.Failure, "Failed to fetch environment variable");
    throw new Error("Failed to fetch environment variable");
  }
}
