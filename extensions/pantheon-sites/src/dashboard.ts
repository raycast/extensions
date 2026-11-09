import { Cache, open, showToast, Toast } from "@raycast/api";
import { exec } from "node:child_process";
import { promisify } from "node:util";
import { terminusCmd } from "./utils";
import { Site } from "./types";

const DASHBOARD_URL = "https://dashboard.pantheon.io";
// A site's workspace rarely changes; re-check monthly in case it was moved.
const WORKSPACE_TTL_MS = 30 * 24 * 60 * 60 * 1000;

const execAsync = promisify(exec);
const workspaceCache = new Cache({ namespace: "workspaces" });

type WorkspaceEntry = { workspaceId: string | null; fetchedAt: number };

function getCachedWorkspace(siteId: string): WorkspaceEntry | undefined {
  const raw = workspaceCache.get(siteId);
  if (!raw) return undefined;
  try {
    const entry: WorkspaceEntry = JSON.parse(raw);
    return Date.now() - entry.fetchedAt < WORKSPACE_TTL_MS ? entry : undefined;
  } catch {
    return undefined;
  }
}

// The dashboard's workspace UUID is the site's owning organization, which
// site:list doesn't expose unambiguously (sites can have several memberships).
async function fetchWorkspace(siteId: string, terminusPath: string | undefined): Promise<string | null> {
  const { stdout } = await execAsync(terminusCmd(terminusPath, `site:info ${siteId} --format=json`), {
    timeout: 30_000,
    env: { ...process.env, PATH: `${process.env.PATH ?? ""}:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin` },
  });
  const workspaceId: string | null = JSON.parse(stdout).organization || null;
  workspaceCache.set(siteId, JSON.stringify({ workspaceId, fetchedAt: Date.now() } satisfies WorkspaceEntry));
  return workspaceId;
}

export async function openDashboard(site: Site, terminusPath: string | undefined) {
  let workspaceId = getCachedWorkspace(site.id)?.workspaceId;

  if (workspaceId === undefined) {
    const toast = await showToast({ style: Toast.Style.Animated, title: "Looking up workspace…" });
    try {
      workspaceId = await fetchWorkspace(site.id, terminusPath);
      await toast.hide();
    } catch {
      workspaceId = null;
      toast.style = Toast.Style.Failure;
      toast.title = "Couldn't look up workspace";
      toast.message = "Opening legacy dashboard URL";
    }
  }

  const siteType = site.framework === "nodejs" ? "node-site" : "cms-site";
  const url = workspaceId
    ? `${DASHBOARD_URL}/workspace/${workspaceId}/${siteType}/${site.id}`
    : `${DASHBOARD_URL}/sites/${site.id}`;
  await open(url);
}
