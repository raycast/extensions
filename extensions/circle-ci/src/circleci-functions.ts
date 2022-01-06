import { getPreferenceValues } from "@raycast/api";
import fetch from "node-fetch";
import { Pipeline, Workflow } from "./types";


const API_TOKEN = getPreferenceValues()["apiKey"];


export const circleCIListProjects = (): Promise<string[]> =>
  fetch("https://circleci.com/api/v1.1/me", circleCIHeaders)
    .then(resp => resp.json())
    .then((json) => (json as { projects: Record<string, unknown> }).projects)
    .then(Object.keys);


interface PipelinesParams {
  vcs: string;
  full_name: string;
}

export const circleCIProjectPipelines = (uri: string): Promise<Pipeline[]> =>
  projectPipelines(uriToVCSAndFullName(uri));

const projectPipelines = ({ vcs, full_name }: PipelinesParams) =>
  fetch(`https://circleci.com/api/v2/project/${vcs}/${full_name}/pipeline`, circleCIHeaders)
    .then(resp => resp.json())
    .then(json => json as { items: Pipeline[] })
    .then(json => json.items);


interface WorkflowParams {
  id: string;
}

export const circleCIWorkflows = ({ id }: WorkflowParams): Promise<Workflow[]> =>
  fetch(`https://circleci.com/api/v2/pipeline/${id}/workflow`, circleCIHeaders)
    .then(resp => resp.json())
    .then(json => json as { items: Workflow[] })
    .then(json => json.items);


const uriToVCSAndFullName = (uri: string): { vcs: string, full_name: string } => {
  const groups = uri.match(/https?:\/\/(?<host>[^/]+)\/(?<full_name>.+$)/)?.groups;
  if (!groups) {
    throw new Error("Bad URI: " + uri);
  }

  const { host, full_name } = groups;
  const vcs = host === "github.com" ? "gh" : host;

  return { vcs, full_name };
};


const circleCIHeaders = {
  headers: {
    "Circle-Token": API_TOKEN,
    "Accept": "application/json"
  }
};
