import { Cycle, CycleIssue } from "@makeplane/plane-node-sdk";
import { planeClient, requirePlaneClient } from "./auth";
import { getMemberProjects } from "./projects";
import { planeRequest, toPage, toResults, workspacePath } from "./request";
import type { RawCycle, RawPaginated, RawWorkItem } from "./types";
import { mapWithConcurrency } from "../helpers/concurrency";
import { isCycleActive } from "../helpers/cycles";
import { MAX_PROJECTS, SCAN_CONCURRENCY } from "../helpers/limits";
import { toWorkItemSummary } from "../helpers/work-item-summary";

export type CycleResponse = {
  data: Cycle[];
  hasMore: boolean;
  cursor: string | undefined;
};

export async function getCycles({ projectId, cursor }: { projectId: string; cursor?: string }): Promise<CycleResponse> {
  const response = await planeClient?.cyclesApi.listCycles({
    projectId,
    slug: planeClient?.workspaceSlug,
    perPage: 100,
    cursor,
  });
  return {
    data: response?.results || [],
    hasMore: !!response?.nextCursor,
    cursor: response?.nextCursor,
  };
}

export async function addWorkItemsToCycle({
  projectId,
  cycleId,
  workItemIds,
}: {
  projectId: string;
  cycleId: string;
  workItemIds: string[];
}): Promise<CycleIssue | undefined> {
  const response = await planeClient?.cyclesApi.addCycleWorkItems({
    slug: planeClient?.workspaceSlug,
    projectId,
    cycleId,
    cycleIssueRequestRequest: {
      issues: workItemIds,
    },
  });
  return response;
}

export type ActiveCycle = {
  cycle: RawCycle;
  project: { id: string; identifier: string; name: string };
};

/**
 * `GET .../cycles/?cycle_view=current` returns a bare array (not paginated) in v1.3.1,
 * which SDK 0.1.3 can't parse, so this uses a raw request.
 */
export async function getCurrentCycles(projectId: string): Promise<RawCycle[]> {
  const response = await planeRequest<RawCycle[] | RawPaginated<RawCycle>>(
    workspacePath("projects", projectId, "cycles"),
    {
      query: { cycle_view: "current" },
    },
  );
  return toResults(response);
}

/** Active cycles across member projects with cycles enabled (capped, 3 requests in parallel). */
export async function getActiveCycles(): Promise<ActiveCycle[]> {
  const projects = (await getMemberProjects())
    .filter((project) => !!project.id && project.cycleView !== false)
    .slice(0, MAX_PROJECTS);
  const now = new Date();
  const perProject = await mapWithConcurrency(projects, SCAN_CONCURRENCY, async (project) => {
    const cycles = await getCurrentCycles(project.id as string);
    return cycles
      .filter((cycle) => !cycle.start_date || !cycle.end_date || isCycleActive(cycle, now))
      .map((cycle) => ({
        cycle,
        project: { id: project.id as string, identifier: project.identifier, name: project.name },
      }));
  });
  return perProject.flat();
}

/** Work items in a cycle. v1.3.1 returns full work items here (the SDK types them as CycleIssue). */
export async function getCycleWorkItems({
  project,
  cycleId,
  cursor,
}: {
  project: { id: string; identifier: string; name?: string };
  cycleId: string;
  cursor?: string;
}) {
  const client = requirePlaneClient();
  const response = await planeRequest<RawPaginated<RawWorkItem>>(
    workspacePath("projects", project.id, "cycles", cycleId, "cycle-issues"),
    { query: { per_page: 100, cursor, expand: "state" } },
  );
  return toPage(response, (raw) =>
    toWorkItemSummary(raw, {
      projectIdentifier: project.identifier,
      projectName: project.name,
      workspaceSlug: client.workspaceSlug,
    }),
  );
}
