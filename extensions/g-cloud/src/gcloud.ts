import { exec } from "child_process";
import { promisify } from "util";
import { showFailureToast } from "@raycast/utils";
import { Project } from "./utils/CacheManager";

// Extend the Project type to make createTime optional
interface GCloudProject extends Omit<Project, "createTime"> {
  createTime?: string;
}

const execPromise = promisify(exec);

interface CommandCacheEntry<T> {
  result: T;
  timestamp: number;
}

interface TimeoutPromise {
  promise: Promise<never>;
  timeoutId: NodeJS.Timeout;
}

// Global cache for command results to reduce API calls
const commandCache = new Map<string, CommandCacheEntry<unknown>>();
const COMMAND_CACHE_TTL = 600000; // 10 minutes cache TTL
const PROJECTS_CACHE_TTL = 1800000; // 30 minutes cache TTL
const pendingRequests = new Map<string, Promise<unknown>>();

/**
 * Executes a gcloud command and returns the result as JSON
 * @param gcloudPath Path to the gcloud executable
 * @param command The command to execute
 * @param projectId Optional project ID to use
 * @param options Additional options for the command
 * @returns The parsed JSON result
 */
export async function executeGcloudCommand(
  gcloudPath: string,
  command: string,
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
    showFailureToast({
      title: "Invalid Configuration",
      message: "Invalid gcloud path: must be a non-empty string",
    });
    throw new Error("Invalid gcloud path: must be a non-empty string");
  }

  if (!command || typeof command !== "string") {
    showFailureToast({
      title: "Invalid Command",
      message: "Command must be a non-empty string",
    });
    throw new Error("Invalid command: must be a non-empty string");
  }

  try {
    const { skipCache = false, cacheTTL = COMMAND_CACHE_TTL, maxRetries = 1, timeout = 25000 } = options;

    const projectFlag =
      projectId && typeof projectId === "string" && projectId.trim() !== "" ? ` --project=${projectId}` : "";

    // Use a longer timeout for VM operations
    let effectiveTimeout = timeout;
    if (command.includes("compute instances") && (command.includes("start") || command.includes("stop"))) {
      effectiveTimeout = 45000; // 45 seconds for VM operations
    }

    const fullCommand = `${gcloudPath} ${command}${projectFlag} --format=json`;
    const cacheKey = fullCommand;

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
          reject(new Error(`Command timed out after ${effectiveTimeout}ms: ${fullCommand}`));
        }, effectiveTimeout);
      });
      return { promise, timeoutId: timeoutId! };
    };

    const timeoutPromise = createTimeoutPromise();
    const requestPromise = Promise.race([executeCommand(fullCommand, cacheKey, maxRetries), timeoutPromise.promise]);

    pendingRequests.set(cacheKey, requestPromise);

    try {
      const result = await requestPromise;
      clearTimeout(timeoutPromise.timeoutId);
      return result;
    } finally {
      pendingRequests.delete(cacheKey);
    }
  } catch (error: unknown) {
    console.error(`Error executing command: ${error instanceof Error ? error.message : String(error)}`);
    if (error instanceof Error && "stderr" in error) {
      console.error(`Command stderr: ${(error as { stderr: string }).stderr}`);
    }
    showFailureToast({
      title: "Command Execution Failed",
      message: error instanceof Error ? error.message : "An unknown error occurred",
    });
    throw error;
  }
}

/**
 * Private helper to execute the actual command
 */
async function executeCommand(
  fullCommand: string,
  cacheKey: string,
  maxRetries: number,
  currentRetry: number = 0,
): Promise<unknown> {
  try {
    const { stdout, stderr } = await execPromise(fullCommand, {
      maxBuffer: 10 * 1024 * 1024,
    });

    if (stderr && stderr.trim() !== "") {
      console.warn(`Command produced stderr: ${stderr}`);

      if (
        stderr.includes("not authorized") ||
        stderr.includes("not authenticated") ||
        stderr.includes("requires authentication") ||
        stderr.includes("login required")
      ) {
        showFailureToast({
          title: "Authentication Error",
          message: "Please re-authenticate with Google Cloud",
        });
        throw new Error("Authentication error: Please re-authenticate with Google Cloud");
      }

      if (
        stderr.includes("project not found") ||
        stderr.includes("project ID not specified") ||
        stderr.includes("project does not exist")
      ) {
        showFailureToast({
          title: "Project Error",
          message: "The specified project was not found or is invalid",
        });
        throw new Error("Project error: The specified project was not found or is invalid");
      }
    }

    if (!stdout || stdout.trim() === "") {
      commandCache.set(cacheKey, { result: [], timestamp: Date.now() });
      return [];
    }

    try {
      const result = JSON.parse(stdout);

      const expectsArray =
        fullCommand.includes("list") || (fullCommand.endsWith("--format=json") && fullCommand.includes("list"));

      if (expectsArray && !Array.isArray(result)) {
        //console.log("Command expected to return array but got object, wrapping in array:", fullCommand);
        const parsedResult = [result];
        commandCache.set(cacheKey, { result: parsedResult, timestamp: Date.now() });
        return parsedResult;
      }

      const parsedResult = Array.isArray(result) ? result : [result];
      commandCache.set(cacheKey, { result: parsedResult, timestamp: Date.now() });
      return parsedResult;
    } catch (error) {
      console.error(`Error parsing JSON: ${error}`);
      console.error(`Raw output: ${stdout.substring(0, 200)}...`);
      showFailureToast({
        title: "Parse Error",
        message: `Failed to parse command output as JSON: ${error instanceof Error ? error.message : String(error)}`,
      });
      throw new Error(`Failed to parse command output as JSON: ${error}`);
    }
  } catch (error: unknown) {
    if (currentRetry < maxRetries) {
      const backoffMs = 1000 * Math.pow(2, currentRetry);
      await new Promise((resolve) => setTimeout(resolve, backoffMs));
      return executeCommand(fullCommand, cacheKey, maxRetries, currentRetry + 1);
    }

    showFailureToast({
      title: "Command Failed",
      message: error instanceof Error ? error.message : "An unknown error occurred",
    });
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
    const { stdout } = await execPromise(`${gcloudPath} auth list --format="value(account)" --filter="status=ACTIVE"`);
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
    await execPromise(`${gcloudPath} auth login --launch-browser`);
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
    showFailureToast({
      title: "Invalid Configuration",
      message: "Invalid gcloud path: must be a non-empty string",
    });
    throw new Error("Invalid gcloud path: must be a non-empty string");
  }

  try {
    const cacheKey = `${gcloudPath} projects list --format=json`;
    const cachedResult = commandCache.get(cacheKey);
    const now = Date.now();

    if (cachedResult && now - cachedResult.timestamp < PROJECTS_CACHE_TTL) {
      return cachedResult.result as Project[];
    }

    const { stdout } = await execPromise(`${gcloudPath} projects list --format=json`);

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

    commandCache.set(cacheKey, { result: mappedProjects, timestamp: now });

    return mappedProjects;
  } catch (error: unknown) {
    console.error("Error fetching projects:", error);
    showFailureToast({
      title: "Failed to Fetch Projects",
      message: error instanceof Error ? error.message : "An unknown error occurred",
    });
    throw error;
  }
}
