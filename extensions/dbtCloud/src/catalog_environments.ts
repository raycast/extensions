import { fetchModels, fetchSources } from "./api";
import { EnvironmentWithProject, fetchProductionEnvironments, inferDeploymentType } from "./environment_utils";
import { EnvironmentDeploymentType, ModelNode, SourceNode } from "./types";

export interface CatalogEnvironment {
  id: number;
  name: string;
  projectName: string;
}

export interface InEnvironment<T> {
  node: T;
  environment: CatalogEnvironment;
}

const DEPLOYMENT_PREFERENCE: Record<EnvironmentDeploymentType, number> = {
  production: 0,
  staging: 1,
  general: 2,
  development: 3,
};

// Environments the AI tools search: the requested one, otherwise the best deployment environment of every project
export async function resolveCatalogEnvironments(environmentId?: number): Promise<CatalogEnvironment[]> {
  if (environmentId) {
    return [{ id: environmentId, name: `Environment ${environmentId}`, projectName: "" }];
  }

  const byProject = new Map<number, EnvironmentWithProject>();
  for (const env of await fetchProductionEnvironments()) {
    const current = byProject.get(env.project_id);
    if (
      !current ||
      DEPLOYMENT_PREFERENCE[inferDeploymentType(env)] < DEPLOYMENT_PREFERENCE[inferDeploymentType(current)]
    ) {
      byProject.set(env.project_id, env);
    }
  }

  return Array.from(byProject.values()).map((env) => ({ id: env.id, name: env.name, projectName: env.projectName }));
}

async function fetchAcross<T>(
  environments: CatalogEnvironment[],
  fetcher: (environmentId: number) => Promise<T[]>,
): Promise<InEnvironment<T>[]> {
  const perEnvironment = await Promise.all(
    environments.map(async (environment) => (await fetcher(environment.id)).map((node) => ({ node, environment }))),
  );
  return perEnvironment.flat();
}

export const fetchModelsAcross = (environments: CatalogEnvironment[]): Promise<InEnvironment<ModelNode>[]> =>
  fetchAcross(environments, (environmentId) => fetchModels(environmentId));

export const fetchSourcesAcross = (environments: CatalogEnvironment[]): Promise<InEnvironment<SourceNode>[]> =>
  fetchAcross(environments, (environmentId) => fetchSources(environmentId));

export const describeEnvironment = (environment: CatalogEnvironment): string =>
  environment.projectName ? `${environment.projectName} / ${environment.name}` : environment.name;
