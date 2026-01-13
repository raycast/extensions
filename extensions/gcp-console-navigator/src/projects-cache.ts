import { LocalStorage, showToast, Toast } from "@raycast/api";
import { execFileSync } from "child_process";
import { existsSync } from "fs";
import { GcpProject, ProjectCache } from "./types";

const CACHE_KEY = "gcpProjects";
const CACHE_MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours

export async function getProjects(): Promise<{
  projects: GcpProject[];
  isStale: boolean;
}> {
  const cached = await getCachedProjects();

  if (cached) {
    const isStale = Date.now() - cached.lastUpdated > CACHE_MAX_AGE_MS;
    return { projects: cached.projects, isStale };
  }

  return { projects: [], isStale: true };
}

export async function getCachedProjects(): Promise<ProjectCache | null> {
  try {
    const data = await LocalStorage.getItem<string>(CACHE_KEY);
    if (data) {
      return JSON.parse(data) as ProjectCache;
    }
  } catch {
    // Cache read failed, return null
  }
  return null;
}

export async function fetchAndCacheProjects(): Promise<GcpProject[]> {
  const projects = await fetchProjects();
  const cache: ProjectCache = {
    projects,
    lastUpdated: Date.now(),
  };
  await LocalStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  return projects;
}

function getGcloudPath(): string {
  const homeDir = process.env.HOME || "";
  const possiblePaths = [
    `${homeDir}/google-cloud-sdk/bin/gcloud`,
    "/usr/local/bin/gcloud",
    "/opt/homebrew/bin/gcloud",
    "/usr/bin/gcloud",
    "/opt/google-cloud-sdk/bin/gcloud",
  ];

  for (const p of possiblePaths) {
    if (existsSync(p)) {
      return p;
    }
  }
  throw new Error(
    "gcloud CLI not found. Install it and run `gcloud auth login`",
  );
}

export async function fetchProjects(): Promise<GcpProject[]> {
  try {
    const gcloudPath = getGcloudPath();
    const output = execFileSync(
      gcloudPath,
      [
        "projects",
        "list",
        "--format=json",
        "--filter=lifecycleState:ACTIVE",
        "--sort-by=projectId",
      ],
      {
        encoding: "utf-8",
        timeout: 30000,
      },
    );

    const projects = JSON.parse(output) as Array<{
      projectId: string;
      name: string;
      projectNumber?: string;
    }>;

    return projects.map((p) => ({
      projectId: p.projectId,
      name: p.name,
      projectNumber: p.projectNumber,
    }));
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    if (
      errorMessage.includes("command not found") ||
      errorMessage.includes("ENOENT")
    ) {
      throw new Error(
        "gcloud CLI not found. Install it and run `gcloud auth login`",
      );
    }

    if (
      errorMessage.includes("UNAUTHENTICATED") ||
      errorMessage.includes("auth")
    ) {
      throw new Error("gcloud authentication expired. Run `gcloud auth login`");
    }

    throw new Error(`Failed to fetch projects: ${errorMessage}`);
  }
}

export async function refreshProjectsWithToast(): Promise<GcpProject[]> {
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Refreshing GCP projects...",
  });

  try {
    const projects = await fetchAndCacheProjects();
    toast.style = Toast.Style.Success;
    toast.title = `GCP project cache updated (${projects.length} projects)`;
    return projects;
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title =
      error instanceof Error ? error.message : "Failed to refresh projects";
    throw error;
  }
}
