import { CiBuildRunsApi, Configuration } from "../appstore-connect";
import { generate } from "../helpers/token";

export async function startBuild(id: string, branch: string) {
  const token = generate();

  const configuration = new Configuration();
  configuration.accessToken = token;

  const api = new CiBuildRunsApi(configuration);
  const response = await api.ciBuildRunsCreateInstance({
    data: {
      type: "ciBuildRuns",
      relationships: {
        workflow: {
          data: {
            type: "ciWorkflows",
            id: id,
          },
        },
        sourceBranchOrTag: {
          data: {
            type: "scmGitReferences",
            id: branch,
          },
        },
      },
    },
  });
  return response.data.data;
}
