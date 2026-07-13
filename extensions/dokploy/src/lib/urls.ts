import { ServiceRef } from "../types/dokploy";

/**
 * Deep links into the Dokploy dashboard. The route segment for a service is the same string as
 * the API namespace (`application`, `compose`, `postgres`, …), which is why one helper covers
 * all eight kinds.
 */
export function projectsUrl(webUrl: string): string {
  return `${webUrl}/dashboard/projects`;
}

/** The instance-wide deployment feed, the web equivalent of `deployment.allCentralized`. */
export function deploymentsUrl(webUrl: string): string {
  return `${webUrl}/dashboard/deployments`;
}

export function projectUrl(webUrl: string, projectId: string): string {
  return `${webUrl}/dashboard/project/${projectId}`;
}

export function environmentUrl(webUrl: string, projectId: string, environmentId: string): string {
  return `${projectUrl(webUrl, projectId)}/environment/${environmentId}`;
}

export function serviceUrl(webUrl: string, service: ServiceRef): string {
  const base = environmentUrl(webUrl, service.projectId, service.environmentId);
  return `${base}/services/${service.kind}/${service.id}`;
}
