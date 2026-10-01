import { Action, Icon, Keyboard } from "@raycast/api";
import type { Project } from "./interfaces";
import { isModernProject } from "./utils";

/**
 * Where a project, environment or service lives in Dokploy's web panel, relative to the panel root.
 * Since v0.25.0 everything sits under an environment; before that, services hung off the project
 * directly, so a service without an `environmentId` (a legacy project's) gets the old path.
 */
export function servicePagePath(service: {
  projectId: string;
  environmentId?: string;
  type: string;
  id: string;
}): string {
  const scope = service.environmentId
    ? `dashboard/project/${service.projectId}/environment/${service.environmentId}`
    : `dashboard/project/${service.projectId}`;
  return `${scope}/services/${service.type}/${service.id}`;
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

export function OpenInDokployAction({ url, path, onOpen }: { url: string; path: string; onOpen?: () => void }) {
  return (
    <Action.OpenInBrowser
      icon={Icon.Window}
      title="Open in Dokploy"
      url={panelUrl(url, path)}
      shortcut={Keyboard.Shortcut.Common.OpenWith}
      onOpen={onOpen}
    />
  );
}
