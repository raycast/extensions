import { CiProductsApi, Configuration } from "../appstore-connect";
import { BuildRun } from "../data/buildRun";
import { generate } from "../helpers/token";

export async function fetchBuilds(id: string) {
  const token = generate();

  const configuration = new Configuration();
  configuration.accessToken = token;
  const api = new CiProductsApi(configuration);
  const response = await api.ciProductsBuildRunsGetToManyRelated(
    id,
    undefined,
    undefined,
    [
      "cancelReason",
      "completionStatus",
      "createdDate",
      "executionProgress",
      "finishedDate",
      "number",
      "sourceBranchOrTag",
      "sourceCommit",
      "startReason",
      "startedDate",
      "workflow",
    ],
    ["macOsVersion", "name", "xcodeVersion"],
    undefined,
    ["workflows"],
    undefined,
    50,
    undefined,
    ["workflow"],
    undefined
  );

  return response.data.data
    .map((build) => {
      const inner = response.data.included?.filter((item) => {
        return item.id == build.relationships?.workflow?.data?.id;
      })[0];
      if (inner === undefined) {
        return [];
      }
      if (inner.type !== "ciWorkflows") {
        return [];
      }
      return new BuildRun(
        build.id,
        build.attributes!.number!,
        build.attributes!.sourceCommit!.message!,
        build.attributes!.startReason!,
        build.attributes!.executionProgress!,
        build.attributes!.completionStatus!,
        inner.attributes!.name!
      );
    })
    .flat();
}
