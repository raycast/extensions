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
 * Builds a `ServiceScope` for one of a modern project's environments.
 *
 * Dokploy's `project.all` response nests each environment without its own `projectId` field
 * (confirmed live - it's simply absent, not just empty), even though `Environment` declares one.
 * Every consumer of `ServiceScope.projectId` (the `project.one` refetch in `services.tsx`, and the
 * `application.create`/`<kind>.create` bodies in `CreateApplication`/`CreateDatabase`) needs a real
 * value, so it's filled in here from the parent project - the one place that reliably has it -
 * rather than trusted from the raw environment object.
 */
export function serviceScopeForEnvironment(project: ModernProject, environment: Environment): ServiceScope {
  return { ...environment, projectId: project.projectId };
}

/**
 * Returns a scope that can be rendered by the Services screen.
 * - Legacy projects: the project itself is the scope (no environments exist)
 * - Modern projects with exactly one environment: return that single environment
 * - Otherwise: return null (caller should show the environment picker)
 */
export function getServiceScopeForProject(project: Project): ServiceScope | null {
  if (isLegacyProject(project)) return project;
  if (project.environments.length === 1) return serviceScopeForEnvironment(project, project.environments[0]);
  return null;
}
