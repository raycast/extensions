import { execFile } from "child_process";
import { promisify } from "util";
import { Project } from "./utils/CacheManager";

// Extend the Project type to make createTime optional
interface GCloudProject extends Omit<Project, "createTime"> {
  createTime?: string;
}

const execFilePromise = promisify(execFile);
const EXEC_TIMEOUT = 15000; // 15s timeout for direct exec calls

interface CommandCacheEntry<T> {
  result: T;
  timestamp: number;
}

interface TimeoutPromise {
  promise: Promise<never>;
  timeoutId: NodeJS.Timeout;
}

// Global cache for command results to reduce API calls
const MAX_CACHE_SIZE = 200;
const commandCache = new Map<string, CommandCacheEntry<unknown>>();
const COMMAND_CACHE_TTL = 600000; // 10 minutes cache TTL
const PROJECTS_CACHE_TTL = 1800000; // 30 minutes cache TTL
const pendingRequests = new Map<string, Promise<unknown>>();

/** Evict oldest entries when cache exceeds max size */
function evictCacheIfNeeded() {
  while (commandCache.size > MAX_CACHE_SIZE) {
    let oldestKey: string | null = null;
    let oldestTime = Infinity;
    for (const [key, entry] of commandCache) {
      if (entry.timestamp < oldestTime) {
        oldestTime = entry.timestamp;
        oldestKey = key;
      }
    }
    if (oldestKey) commandCache.delete(oldestKey);
    else break;
  }
}

export async function executeGcloudCommand(
  gcloudPath: string,
  commandArgs: string[],
  projectId?: string,
  options: {
    skipCache?: boolean;
    cacheTTL?: number;
    maxRetries?: number;
    timeout?: number;
  } = {},
) {
  // Validate inputs
  if (!gcloudPath || typeof gcloudPath !== "string") {
    throw new Error("Invalid gcloud path: must be a non-empty string");
  }

  if (!Array.isArray(commandArgs) || commandArgs.length === 0) {
    throw new Error("Invalid command: must be a non-empty string array");
  }

  try {
    const { skipCache = false, cacheTTL = COMMAND_CACHE_TTL, maxRetries = 1, timeout = 25000 } = options;

    const args = [...commandArgs];
    if (projectId && typeof projectId === "string" && projectId.trim() !== "") {
      const hasProjectFlag = args.some((arg) => arg === "--project" || arg.startsWith("--project="));
      if (!hasProjectFlag) {
        args.push(`--project=${projectId}`);
      }
    }
    const hasFormatFlag = args.some((arg) => arg === "--format" || arg.startsWith("--format="));
    if (!hasFormatFlag) {
      args.push("--format=json");
    }

    // Use a longer timeout for VM operations
    let effectiveTimeout = timeout;
    if (args.includes("compute") && args.includes("instances") && (args.includes("start") || args.includes("stop"))) {
      effectiveTimeout = 45000; // 45 seconds for VM operations
    }

    const cacheKey = [gcloudPath, ...args].join(" ");

    const pendingRequest = pendingRequests.get(cacheKey);
    if (pendingRequest) {
      return pendingRequest;
    }

    if (!skipCache) {
      const cachedResult = commandCache.get(cacheKey);
      const now = Date.now();

      if (cachedResult && now - cachedResult.timestamp < cacheTTL) {
        return cachedResult.result;
      }
    }

    // Create timeout promise properly
    const createTimeoutPromise = (): TimeoutPromise => {
      let timeoutId: NodeJS.Timeout;
      const promise = new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => {
          reject(new Error(`Command timed out after ${effectiveTimeout}ms: ${cacheKey}`));
        }, effectiveTimeout);
      });
      return { promise, timeoutId: timeoutId! };
    };

    const timeoutPromise = createTimeoutPromise();
    const requestPromise = Promise.race([
      executeCommand(gcloudPath, args, cacheKey, maxRetries),
      timeoutPromise.promise,
    ]);

    pendingRequests.set(cacheKey, requestPromise);

    try {
      const result = await requestPromise;
      return result;
    } finally {
      clearTimeout(timeoutPromise.timeoutId);
      pendingRequests.delete(cacheKey);
    }
  } catch (error: unknown) {
    console.error(`Error executing command: ${error instanceof Error ? error.message : String(error)}`);
    if (error instanceof Error && "stderr" in error) {
      console.error(`Command stderr: ${(error as { stderr: string }).stderr}`);
    }
    // Let callers handle toast display for better UX control
    throw error;
  }
}

/**
 * Private helper to execute the actual command
 */
async function executeCommand(
  gcloudPath: string,
  args: string[],
  cacheKey: string,
  maxRetries: number,
  currentRetry: number = 0,
): Promise<unknown> {
  try {
    const { stdout, stderr } = await execFilePromise(gcloudPath, args, {
      maxBuffer: 10 * 1024 * 1024,
    });

    if (stderr && stderr.trim() !== "") {
      if (
        stderr.includes("not authorized") ||
        stderr.includes("not authenticated") ||
        stderr.includes("requires authentication") ||
        stderr.includes("login required")
      ) {
        throw new Error("Authentication error: Please re-authenticate with Google Cloud");
      }

      if (
        stderr.includes("project not found") ||
        stderr.includes("project ID not specified") ||
        stderr.includes("project does not exist")
      ) {
        throw new Error("Project error: The specified project was not found or is invalid");
      }
    }

    // If stderr has content but not a recognized warning, and stdout is empty, treat as error
    if (stderr && stderr.trim() !== "" && (!stdout || stdout.trim() === "")) {
      console.error(`Command stderr (no stdout): ${stderr.substring(0, 300)}`);
    }

    if (!stdout || stdout.trim() === "") {
      evictCacheIfNeeded();
      commandCache.set(cacheKey, { result: [], timestamp: Date.now() });
      return [];
    }

    let result: unknown;
    try {
      result = JSON.parse(stdout);
    } catch (parseError) {
      console.error(`Error parsing JSON: ${parseError}`);
      console.error(`Raw output: ${stdout.substring(0, 200)}...`);
      // Return empty array instead of crashing — caller sees "no results" and can retry
      return [];
    }

    const expectsArray = args.includes("list");

    const parsedResult = expectsArray && !Array.isArray(result) ? [result] : Array.isArray(result) ? result : [result];

    evictCacheIfNeeded();
    commandCache.set(cacheKey, { result: parsedResult, timestamp: Date.now() });
    return parsedResult;
  } catch (error: unknown) {
    if (currentRetry < maxRetries) {
      const backoffMs = 1000 * Math.pow(2, currentRetry) * (0.5 + Math.random());
      await new Promise((resolve) => setTimeout(resolve, backoffMs));
      return executeCommand(gcloudPath, args, cacheKey, maxRetries, currentRetry + 1);
    }
    throw error;
  }
}

/**
 * Clears the command cache for paths matching the pattern
 */
export function clearCommandCache(pattern?: RegExp) {
  if (!pattern) {
    commandCache.clear();
    return;
  }

  for (const key of commandCache.keys()) {
    if (pattern.test(key)) {
      commandCache.delete(key);
    }
  }
}

/**
 * Checks if the user is authenticated with gcloud
 * @param gcloudPath Path to the gcloud executable
 * @returns True if authenticated, false otherwise
 */
export async function isAuthenticated(gcloudPath: string): Promise<boolean> {
  try {
    const { stdout } = await execFilePromise(
      gcloudPath,
      ["auth", "list", "--format=value(account)", "--filter=status=ACTIVE"],
      { timeout: EXEC_TIMEOUT },
    );
    return stdout.trim() !== "";
  } catch (error) {
    console.error("Error checking authentication status:", error);
    return false;
  }
}

/**
 * Initiates browser-based authentication with gcloud
 * @param gcloudPath Path to the gcloud executable
 * @returns Promise that resolves when authentication is complete
 */
export async function authenticateWithBrowser(gcloudPath: string): Promise<void> {
  try {
    await execFilePromise(gcloudPath, ["auth", "login", "--launch-browser"], { timeout: 120000 });
  } catch (error) {
    console.error("Error during browser authentication:", error);
    throw error;
  }
}

interface RawGCloudProject {
  projectId: string;
  name?: string;
  projectNumber?: string;
  createTime?: string;
}

export async function getProjects(gcloudPath: string): Promise<Project[]> {
  if (!gcloudPath || typeof gcloudPath !== "string") {
    throw new Error("Invalid gcloud path: must be a non-empty string");
  }

  try {
    const args = ["projects", "list", "--format=json"];
    const cacheKey = [gcloudPath, ...args].join(" ");
    const cachedResult = commandCache.get(cacheKey);
    const now = Date.now();

    if (cachedResult && now - cachedResult.timestamp < PROJECTS_CACHE_TTL) {
      return cachedResult.result as Project[];
    }

    const { stdout } = await execFilePromise(gcloudPath, args, { timeout: 30000 });

    if (!stdout || stdout.trim() === "") {
      return [];
    }

    let projects;
    try {
      projects = JSON.parse(stdout);
    } catch (error: unknown) {
      console.error("Error parsing projects JSON:", error);
      throw new Error(`Failed to parse projects output: ${error instanceof Error ? error.message : String(error)}`);
    }

    if (!Array.isArray(projects)) {
      console.error("Projects response is not an array:", projects);
      return [];
    }

    const mappedProjects = projects
      .map((project: RawGCloudProject): GCloudProject | null => {
        if (!project || !project.projectId) {
          console.warn("Skipping invalid project:", project);
          return null;
        }

        return {
          id: project.projectId,
          name: project.name || project.projectId,
          projectNumber: project.projectNumber || "",
          createTime: project.createTime,
        };
      })
      .filter((project): project is GCloudProject => project !== null);

    evictCacheIfNeeded();
    commandCache.set(cacheKey, { result: mappedProjects, timestamp: now });

    return mappedProjects;
  } catch (error: unknown) {
    console.error("Error fetching projects:", error);
    throw error;
  }
}

/**
 * Fetches resource counts for all services in a project using REST APIs
 * @param gcloudPath Path to the gcloud executable (needed for auth token)
 * @param projectId The project ID
 * @returns ServiceCounts object with counts for each service
 */
export async function fetchResourceCounts(
  gcloudPath: string,
  projectId: string,
): Promise<{
  compute: number;
  storage: number;
  iam: number;
  network: number;
  secrets: number;
  cloudrun: number;
  cloudfunctions: number;
  cloudbuild: number;
}> {
  // Import REST API functions dynamically to avoid circular dependencies
  const {
    listComputeInstances,
    listStorageBuckets,
    getProjectIamPolicy,
    listVpcNetworks,
    listSecrets,
    listCloudRunServices,
    listCloudFunctions,
    listBuildTriggers,
  } = await import("./utils/gcpApi");

  // Run all count queries in parallel using REST APIs for better performance.
  // Use fields/maxResults/pageSize to fetch only names and cap results,
  // avoiding loading full resource objects just for counting.
  const countLimit = 500;
  const [
    computeResult,
    storageResult,
    iamResult,
    networkResult,
    secretsResult,
    cloudrunResult,
    cloudfunctionsResult,
    cloudbuildResult,
  ] = await Promise.allSettled([
    listComputeInstances(gcloudPath, projectId, undefined, {
      fields: "items/*/instances/name",
      maxResults: countLimit,
    }),
    listStorageBuckets(gcloudPath, projectId, {
      fields: "items(name)",
      maxResults: countLimit,
    }),
    getProjectIamPolicy(gcloudPath, projectId),
    listVpcNetworks(gcloudPath, projectId, {
      fields: "items(name)",
      maxResults: countLimit,
    }),
    listSecrets(gcloudPath, projectId, { pageSize: countLimit }),
    listCloudRunServices(gcloudPath, projectId, { pageSize: countLimit }),
    listCloudFunctions(gcloudPath, projectId, undefined, { pageSize: countLimit }),
    listBuildTriggers(gcloudPath, projectId, { pageSize: countLimit }),
  ]);

  const getArrayCount = (result: PromiseSettledResult<unknown[]>): number => {
    if (result.status === "fulfilled" && Array.isArray(result.value)) {
      return result.value.length;
    }
    return 0;
  };

  // For IAM, count bindings in the policy
  let iamCount = 0;
  if (iamResult.status === "fulfilled") {
    const policy = iamResult.value as { bindings?: unknown[] };
    iamCount = policy.bindings?.length || 0;
  }

  return {
    compute: getArrayCount(computeResult as PromiseSettledResult<unknown[]>),
    storage: getArrayCount(storageResult as PromiseSettledResult<unknown[]>),
    iam: iamCount,
    network: getArrayCount(networkResult as PromiseSettledResult<unknown[]>),
    secrets: getArrayCount(secretsResult as PromiseSettledResult<unknown[]>),
    cloudrun: getArrayCount(cloudrunResult as PromiseSettledResult<unknown[]>),
    cloudfunctions: getArrayCount(cloudfunctionsResult as PromiseSettledResult<unknown[]>),
    cloudbuild: getArrayCount(cloudbuildResult as PromiseSettledResult<unknown[]>),
  };
}
