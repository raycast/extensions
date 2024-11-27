import { CiProductsApi, Configuration, ScmRepositoriesApi } from "../appstore-connect";
import { GitRef } from "../data/gitRef";
import { Workflow } from "../data/workflow";
import { generate } from "../helpers/token";

export async function fetchWorkflows(id: string): Promise<{ workflows: Workflow[]; refs: GitRef[] }> {
  const token = generate();

  const configuration = new Configuration();
  configuration.accessToken = token;
  const productsApi = new CiProductsApi(configuration);
  const workflows = await productsApi.ciProductsWorkflowsGetToManyRelated(
    id,
    undefined,
    undefined,
    undefined,
    undefined,
    ["gitReferences", "ownerName", "repositoryName"],
    200,
    ["repository"]
  );

  const scmRepositoriesApi = new ScmRepositoriesApi(configuration);
  const refs = await scmRepositoriesApi.scmRepositoriesGitReferencesGetToManyRelated(workflows.data.included![0].id);

  return {
    workflows: workflows.data.data
      .map((workflow) => {
        return new Workflow(workflow.id, `${workflow.attributes?.name ?? "unknown"}`);
      })
      .flat(),
    refs: refs.data.data
      .map((ref) => {
        if (ref.attributes?.kind !== "BRANCH") {
          return [];
        }
        return new GitRef(ref.id, ref.attributes?.name ?? "unknown");
      })
      .flat(),
  };
}
