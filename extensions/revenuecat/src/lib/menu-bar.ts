import { demoProject } from "./demo";
import { loadOverview } from "./dashboard-metrics";
import { Metric, Overview, Project, RevenueCatClient } from "./revenuecat";

export const DEFAULT_MENU_BAR_METRIC = "mrr";
export interface MenuBarOverview {
  project: Project;
  projects: Project[];
  overview: Overview;
}
export function selectedMenuBarMetric(metrics: Metric[], id = DEFAULT_MENU_BAR_METRIC) {
  // A missing metric must not silently become a different metric or a zero value.
  return metrics.find((metric) => metric.id === id);
}
export async function loadMenuBarOverview(
  client: Pick<RevenueCatClient, "projects" | "overview">,
  options: { demo: boolean; currency: string; selectedProjectId?: string; chartsV3?: boolean },
  signal: AbortSignal,
): Promise<MenuBarOverview> {
  const projects = options.demo ? [demoProject] : await client.projects(signal);
  signal.throwIfAborted();
  const project = projects.find((project) => project.id === options.selectedProjectId) || projects[0];
  if (!project) throw new Error("No accessible projects. Open Dashboard to check your RevenueCat connection.");
  const overview = await loadOverview(
    client,
    project.id,
    options.currency,
    options.demo,
    signal,
    options.chartsV3 ?? true,
  );
  signal.throwIfAborted();
  return { project, projects, overview };
}

export function menuBarCacheKey(options: { projectId?: string; demo: boolean; currency: string; chartsV3: boolean }) {
  return JSON.stringify(["menu-bar", options.projectId ?? null, options.demo, options.currency, options.chartsV3]);
}

export function matchingMenuBarOverview(value: unknown, projectId: string | undefined): MenuBarOverview | undefined {
  if (!projectId || !value || typeof value !== "object") return undefined;
  const data = value as MenuBarOverview;
  return data.project?.id === projectId && Array.isArray(data.projects) && Array.isArray(data.overview?.metrics)
    ? data
    : undefined;
}
