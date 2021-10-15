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
}

export interface Deployment {
  project: string;
  state: DeploymentState;
  time: string;
  id: string;
  url: string;
  domain: string;
}

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
  }
  return Promise.resolve("");
}

export async function fetchDeployments(username: string): Promise<Deployment[]> {
  dayjs.extend(relativeTime);

  try {
    const response = await fetch(apiURL + "v8/projects", {
      method: "get",
      headers: headers,
    });
    const json = await response.json();
    const deployments: Deployment[] = [];
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
              state = DeploymentState.deploying;
              break;
            default:
              state = DeploymentState.failed;
              break;
          }
          deployments.push({
            project: project.name,
            state: state,
            time: dayjs(deployment.createdAt).fromNow(),
            id: deployment.id,
            url: `https://vercel.com/${username}/${project.name}/${deployment.id.replace("dpl_", "")}`,
            domain: deployment.alias[0],
          });
          break;
        }
      }
    }
    return deployments;
  } catch (err) {
    console.error(err);
    showToast(ToastStyle.Failure, "Failed to fetch deployments");
  }
  return Promise.resolve([]);
}
