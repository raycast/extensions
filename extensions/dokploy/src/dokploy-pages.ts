import type { Project } from "./interfaces";
import { isModernProject } from "./utils";

interface ServiceRef {
  projectId: string;
  /** Unset for a service on an instance older than v0.25.0. */
  environmentId?: string;
  /** Dokploy's own route segment: `application`, `compose`, `postgres`, ... */
  type: string;
  id: string;
}

/**
 * Where a project, environment or service lives in Dokploy's web panel, relative to the panel root.
 * Since v0.25.0 everything sits under an environment; before that, services hung off the project
 * directly, so a service without an `environmentId` (a legacy project's) gets the old path.
 */
export function servicePagePath(service: ServiceRef): string {
  const scope = service.environmentId
    ? `dashboard/project/${service.projectId}/environment/${service.environmentId}`
    : `dashboard/project/${service.projectId}`;
  return `${scope}/services/${service.type}/${service.id}`;
}

/** The service page opened on its Deployments tab, the same `tab` query Dokploy's own tabs set. */
export function serviceDeploymentsPagePath(service: ServiceRef): string {
  return `${servicePagePath(service)}?tab=deployments`;
}

export function environmentPagePath(projectId: string, environmentId: string): string {
  return `dashboard/project/${projectId}/environment/${environmentId}`;
}

/**
 * A modern project has no page of its own, so this is the page Dokploy's own project list opens:
 * the default environment, else the first one. `undefined` when there's no environment to open.
 */
export function projectPagePath(project: Project): string | undefined {
  if (!isModernProject(project)) return `dashboard/project/${project.projectId}`;
  const environment = project.environments.find((env) => env.isDefault) ?? project.environments[0];
  return environment ? environmentPagePath(project.projectId, environment.environmentId) : undefined;
}

/**
 * `url` is the API base every screen already has (`<instance>/api/`). The panel is served from the
 * same place the API is, one level up.
 */
export function panelUrl(url: string, path: string): string {
  return new URL(`../${path}`, url).toString();
}
