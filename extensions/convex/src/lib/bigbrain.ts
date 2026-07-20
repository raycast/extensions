/**
 * BigBrain API Client for Raycast
 *
 * Standalone client for Convex's BigBrain API (api.convex.dev/api/dashboard)
 * Used for fetching teams, projects, deployments, and user profile.
 */
import {
  BIG_BRAIN_URL,
  BIG_BRAIN_DASHBOARD_PATH,
  CONVEX_CLIENT_ID,
} from "./constants";

// ============================================================================
// Types
// ============================================================================

export interface Team {
  id: number;
  name: string;
  slug: string;
  creator?: number;
  suspended?: boolean;
}

export interface Project {
  id: number;
  name: string;
  slug: string;
  teamId: number;
  creator?: number;
  isDemo?: boolean;
}

export interface Deployment {
  id: number;
  name: string;
  projectId: number;
  deploymentType: "dev" | "prod" | "preview";
  kind: "cloud" | "local";
  creator?: number;
  previewIdentifier?: string | null;
  url?: string;
}

export interface UserProfile {
  id?: number;
  name?: string;
  email?: string;
  profilePictureUrl?: string;
}

// ============================================================================
// Core API Function
// ============================================================================

/**
 * Make a request to the BigBrain Dashboard API
 *
 * @param path - API path (e.g., "/teams" or "/teams/{team_id}/projects")
 * @param options - Request options
 * @returns The API response
 */
async function callBigBrainAPI<T = unknown>(
  path: string,
  options: {
    accessToken: string;
    method?: "GET" | "POST" | "PUT" | "DELETE";
    body?: unknown;
    pathParams?: Record<string, string | number>;
    queryParams?: Record<string, string | number | undefined | null>;
  },
): Promise<T> {
  const {
    accessToken,
    method = "GET",
    body,
    pathParams,
    queryParams,
  } = options;

  // Replace path parameters
  let finalPath = path;
  if (pathParams) {
    for (const [key, value] of Object.entries(pathParams)) {
      finalPath = finalPath.replace(`{${key}}`, String(value));
    }
  }

  // Build query string
  const queryString = new URLSearchParams();
  if (queryParams) {
    for (const [key, value] of Object.entries(queryParams)) {
      if (value !== undefined && value !== null) {
        queryString.append(key, String(value));
      }
    }
  }

  const url = `${BIG_BRAIN_URL}${BIG_BRAIN_DASHBOARD_PATH}${finalPath}${queryString.toString() ? `?${queryString.toString()}` : ""}`;

  const response = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      "Convex-Client": CONVEX_CLIENT_ID,
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "Unknown error");
    throw new Error(
      `BigBrain API error: ${response.status} ${response.statusText} - ${errorText}`,
    );
  }

  const data = await response.json();
  return data as T;
}

// ============================================================================
// Team & Project Functions
// ============================================================================

/**
 * Fetch all teams the user has access to
 */
export async function getTeams(accessToken: string): Promise<Team[]> {
  return callBigBrainAPI<Team[]>("/teams", { accessToken });
}

/**
 * Fetch all projects for a team
 */
export async function getProjects(
  accessToken: string,
  teamId: number,
): Promise<Project[]> {
  return callBigBrainAPI<Project[]>("/teams/{team_id}/projects", {
    accessToken,
    pathParams: { team_id: teamId },
  });
}

/**
 * Fetch all deployments for a project
 */
export async function getDeployments(
  accessToken: string,
  projectId: number,
): Promise<Deployment[]> {
  const deployments = await callBigBrainAPI<Deployment[]>(
    "/projects/{project_id}/instances",
    {
      accessToken,
      pathParams: { project_id: projectId },
    },
  );

  return deployments.map((deployment) => ({
    ...deployment,
    url: deployment.url ?? `https://${deployment.name}.convex.cloud`,
  }));
}

/**
 * Fetch user profile
 */
export async function getProfile(accessToken: string): Promise<UserProfile> {
  return callBigBrainAPI<UserProfile>("/profile", { accessToken });
}
