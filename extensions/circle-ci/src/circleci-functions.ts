import { getPreferenceValues } from "@raycast/api";
import fetch from "node-fetch";
import { Job, Pipeline, Preferences, Workflow } from "./types";

const { apiKey, myPipelines }: Preferences = getPreferenceValues();

export const circleCIListProjects = (): Promise<string[]> => {
  return fetch("https://circleci.com/api/v1.1/me", headers)
    .then((resp) => resp.json())
    .then((json) => json as { projects: Record<string, unknown>; message?: string })
    .then((json) => (json.projects ? json.projects : Promise.reject(new Error(json.message || JSON.stringify(json)))))
    .then(Object.keys)
    .then((list) => list.sort());
};

export const circleCIProjectPipelines = (uri: string): Promise<Pipeline[]> =>
  projectPipelines(uriToVCSAndFullName(uri));

const projectPipelines = ({ vcs, full_name }: { vcs: string; full_name: string }) => {
  const baseUrl = `https://circleci.com/api/v2/project/${vcs}/${full_name}/pipeline`;
  const filteredUrl = baseUrl + (myPipelines ? "/mine" : "");

  return fetch(filteredUrl, headers)
    .then((resp) => resp.json())
    .then((json) => json as { items: Pipeline[] })
    .then((json) => json.items);
};

export const circleCIWorkflows = ({ id }: { id: string }): Promise<Workflow[]> =>
  fetch(`https://circleci.com/api/v2/pipeline/${id}/workflow`, headers)
    .then((resp) => resp.json())
    .then((json) => json as { items: Workflow[] })
    .then((json) => json.items);

export const circleCIWorkflowsPipelines = ({ pipelines }: { pipelines: Pipeline[] }): Promise<Workflow[][]> =>
  Promise.all(
    pipelines.map((pipeline) =>
      circleCIWorkflows({ id: pipeline.id }).then((workflows) =>
        workflows
          .map((workflow) => {
            workflow.repository = pipeline.vcs;
            workflow.pipeline_number = pipeline.number;

            return workflow;
          })
          .flat()
      )
    )
  );

export const circleCIJobs = ({ id }: { id: string }): Promise<Job[]> =>
  fetch(`https://circleci.com/api/v2/workflow/${id}/job`, headers)
    .then((resp) => resp.json())
    .then((json) => json as { items: Job[] })
    .then((json) => json.items);

const uriToVCSAndFullName = (uri: string): { vcs: string; full_name: string } => {
  const groups = uri.match(/https?:\/\/(?<host>[^/]+)\/(?<full_name>.+$)/)?.groups;
  if (!groups) {
    throw new Error("Bad URI: " + uri);
  }

  const { host, full_name } = groups;
  const vcs = host === "github.com" ? "gh" : host;

  return { vcs, full_name };
};

const headers = {
  headers: {
    "Circle-Token": apiKey,
    Accept: "application/json",
  },
};
