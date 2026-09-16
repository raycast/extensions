import { buildApiUrl, fetchFromApi } from "./api";
import { EnvironmentDeploymentType, EnvironmentModel, ProjectModel } from "./types";

export interface EnvironmentWithProject extends EnvironmentModel {
  projectName: string;
}

export interface DeploymentTypeGroup {
  deploymentType: EnvironmentDeploymentType;
  displayName: string;
  description: string;
  icon: string;
  projects: {
    projectId: number;
    projectName: string;
    environments: EnvironmentWithProject[];
  }[];
}

export const DEPLOYMENT_TYPE_INFO: Record<
  EnvironmentDeploymentType,
  { displayName: string; description: string; icon: string; sortOrder: number }
> = {
  production: {
    displayName: "Production",
    description: "End users interact with this environment",
    icon: "✅",
    sortOrder: 1,
  },
  staging: { displayName: "Staging", description: "Pre-production testing environment", icon: "🔶", sortOrder: 2 },
  development: {
    displayName: "Development",
    description: "Engineers work in this environment",
    icon: "🔧",
    sortOrder: 3,
  },
  general: { displayName: "General", description: "Unclassified deployment environment", icon: "📦", sortOrder: 4 },
};

export function inferDeploymentType(env: EnvironmentModel): EnvironmentDeploymentType {
  if (env.deployment_type) return env.deployment_type;

  const nameLower = env.name.toLowerCase();
  if (nameLower.includes("prod") || nameLower === "production") return "production";
  if (nameLower.includes("stag") || nameLower === "staging" || nameLower === "stg") return "staging";
  if (nameLower.includes("dev") || nameLower === "development") return "development";
  return "general";
}

export async function fetchProductionEnvironments(): Promise<EnvironmentWithProject[]> {
  const envEndpoint = buildApiUrl("/environments/");
  const projectEndpoint = buildApiUrl("/projects/");

  const [environments, projects] = await Promise.all([
    fetchFromApi<EnvironmentModel>(envEndpoint, "Could not fetch environments"),
    fetchFromApi<ProjectModel>(projectEndpoint, "Could not fetch projects"),
  ]);

  const projectMap = new Map<number, string>();
  projects.forEach((project) => projectMap.set(project.id, project.name));

  return environments
    .filter((env) => env.type === "deployment")
    .map((env) => ({
      ...env,
      projectName: projectMap.get(env.project_id) || env.project?.name || "Unknown Project",
    }));
}

export function groupByDeploymentType(environments: EnvironmentWithProject[]): DeploymentTypeGroup[] {
  const typeGroups = new Map<
    EnvironmentDeploymentType,
    Map<number, { projectName: string; environments: EnvironmentWithProject[] }>
  >();

  for (const env of environments) {
    const deploymentType = inferDeploymentType(env);
    if (!typeGroups.has(deploymentType)) typeGroups.set(deploymentType, new Map());
    const projectMap = typeGroups.get(deploymentType);
    if (!projectMap) {
      continue;
    }
    if (!projectMap.has(env.project_id)) {
      projectMap.set(env.project_id, { projectName: env.projectName, environments: [] });
    }
    const projectGroup = projectMap.get(env.project_id);
    if (projectGroup) {
      projectGroup.environments.push(env);
    }
  }

  const result: DeploymentTypeGroup[] = [];
  for (const [deploymentType, projectMap] of typeGroups.entries()) {
    const info = DEPLOYMENT_TYPE_INFO[deploymentType];
    result.push({
      deploymentType,
      displayName: info.displayName,
      description: info.description,
      icon: info.icon,
      projects: Array.from(projectMap.entries())
        .map(([projectId, data]) => ({
          projectId,
          projectName: data.projectName,
          environments: data.environments.sort((a, b) => a.name.localeCompare(b.name)),
        }))
        .sort((a, b) => a.projectName.localeCompare(b.projectName)),
    });
  }

  return result.sort(
    (a, b) => DEPLOYMENT_TYPE_INFO[a.deploymentType].sortOrder - DEPLOYMENT_TYPE_INFO[b.deploymentType].sortOrder
  );
}

export function selectOneEnvPerProject(environments: EnvironmentWithProject[]): EnvironmentWithProject[] {
  const projectEnvs = new Map<number, EnvironmentWithProject[]>();
  for (const env of environments) {
    if (!projectEnvs.has(env.project_id)) {
      projectEnvs.set(env.project_id, []);
    }
    const projectGroup = projectEnvs.get(env.project_id);
    if (projectGroup) {
      projectGroup.push(env);
    }
  }

  const selected: EnvironmentWithProject[] = [];
  for (const [, envs] of projectEnvs) {
    const staging = envs.find((env) => inferDeploymentType(env) === "staging");
    const production = envs.find((env) => inferDeploymentType(env) === "production");
    selected.push(staging || production || envs[0]);
  }

  return selected;
}
