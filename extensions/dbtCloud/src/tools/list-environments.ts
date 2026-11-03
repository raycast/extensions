import { fetchFromApi, buildApiUrl } from "../api";

type Input = {
  /**
   * Optional filter by environment type: "deployment" (PROD/STG), "development" (DEV), or leave empty for all
   */
  type?: "deployment" | "development";
};

interface Environment {
  id: number;
  name: string;
  type: string;
  use_custom_branch: boolean;
  custom_branch: string | null;
  dbt_version: string;
  supports_docs: boolean;
  state: number;
  project_id: number;
  credentials_id: number;
  connection: {
    id: number;
    name: string;
    type: string;
  } | null;
}

/**
 * List dbt Cloud environments (PROD, STG, DEV)
 */
export default async function tool(input: Input) {
  const environments = await fetchFromApi<Environment>(buildApiUrl("/environments/"));

  if (!environments || environments.length === 0) {
    return { environments: [], message: "No environments found." };
  }

  // Filter by type if provided
  let filteredEnvs = environments;
  if (input.type) {
    filteredEnvs = environments.filter((e) => e.type === input.type);
  }

  return {
    count: filteredEnvs.length,
    environments: filteredEnvs.map((env) => ({
      id: env.id,
      name: env.name,
      type: env.type,
      dbtVersion: env.dbt_version,
      projectId: env.project_id,
      supportsDocs: env.supports_docs,
      customBranch: env.use_custom_branch ? env.custom_branch : null,
      connection: env.connection
        ? {
            name: env.connection.name,
            type: env.connection.type,
          }
        : null,
    })),
  };
}
