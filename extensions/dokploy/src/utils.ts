import type { Environment, LegacyProject, ModernProject, Project, ServiceCollections } from "./interfaces";

export function getTotalServices(services: ServiceCollections): number {
  return (
    services.applications.length +
    services.mariadb.length +
    services.mongo.length +
    services.mysql.length +
    services.postgres.length +
    services.redis.length +
    services.compose.length
  );
}

export function isModernProject(project: Project): project is ModernProject {
  return "environments" in project;
}

export function isLegacyProject(project: Project): project is LegacyProject {
  return !isModernProject(project);
}

// `environmentId` is optional here (unlike the rest of `Environment`) because legacy projects - the
// pre-v0.25.0 `Project -> Services` shape, with no environments at all - use `LegacyProject` itself
// as their scope, which has no such field. Anything that needs a real environment id (like deploying
// a template) must check for it rather than assume it's always present.
export type ServiceScope = Pick<Environment, "name" | "projectId"> &
  Partial<Pick<Environment, "environmentId">> &
  ServiceCollections;

/**
 * Returns a scope that can be rendered by the Services screen.
 * - Legacy projects: the project itself is the scope (no environments exist)
 * - Modern projects with exactly one environment: return that single environment
 * - Otherwise: return null (caller should show the environment picker)
 */
export function getServiceScopeForProject(project: Project): ServiceScope | null {
  if (isLegacyProject(project)) return project;
  if (project.environments.length === 1) return project.environments[0];
  return null;
}
