import { LocalStorage, showToast, Toast } from "@raycast/api";

const PROJECTS_KEY = "projects";
const ACTIVE_PROJECT_KEY = "activeProject";

/**
 * Safely parse JSON data with error recovery
 */
function safeParseJSON<T>(json: string, fallback: T): T {
  try {
    const parsed = JSON.parse(json);
    // Validate that parsed data matches expected type
    if (typeof parsed === typeof fallback && parsed !== null) {
      return parsed;
    }
    console.warn("Parsed data does not match expected type, using fallback");
    return fallback;
  } catch (error) {
    console.error("Failed to parse JSON from LocalStorage:", error);
    return fallback;
  }
}

/**
 * Safely set JSON data with error handling
 */
async function safeSetJSON(key: string, data: any): Promise<void> {
  try {
    await LocalStorage.setItem(key, JSON.stringify(data));
  } catch (error) {
    console.error(`Failed to save data to LocalStorage (${key}):`, error);
    await showToast({
      style: Toast.Style.Failure,
      title: "Storage Error",
      message: "Failed to save project data. Please try again.",
    });
    throw error;
  }
}

/**
 * Clear corrupted data and reset to defaults
 */
async function clearCorruptedData(key: string): Promise<void> {
  try {
    await LocalStorage.removeItem(key);
    console.warn(`Cleared corrupted data for key: ${key}`);
  } catch (error) {
    console.error(`Failed to clear corrupted data for key ${key}:`, error);
  }
}

export async function getProjects(): Promise<Record<string, string>> {
  try {
    const json = await LocalStorage.getItem<string>(PROJECTS_KEY);
    if (!json) {
      return {};
    }
    
    const projects = safeParseJSON(json, {});
    
    // Validate that all values are strings (paths)
    const validProjects: Record<string, string> = {};
    let hasInvalidData = false;
    
    for (const [name, path] of Object.entries(projects)) {
      if (typeof name === "string" && typeof path === "string" && name.trim() && path.trim()) {
        validProjects[name] = path;
      } else {
        hasInvalidData = true;
        console.warn(`Invalid project entry found: ${name} -> ${path}`);
      }
    }
    
    // If we found invalid data, save the cleaned version
    if (hasInvalidData) {
      await safeSetJSON(PROJECTS_KEY, validProjects);
      await showToast({
        style: Toast.Style.Failure,
        title: "Data Cleaned",
        message: "Some invalid project data was removed.",
      });
    }
    
    return validProjects;
  } catch (error) {
    console.error("Failed to get projects, clearing corrupted data:", error);
    await clearCorruptedData(PROJECTS_KEY);
    return {};
  }
}

export async function addProject(name: string, path: string) {
  if (!name || !path || typeof name !== "string" || typeof path !== "string") {
    throw new Error("Invalid project name or path");
  }
  
  const trimmedName = name.trim();
  const trimmedPath = path.trim();
  
  if (!trimmedName || !trimmedPath) {
    throw new Error("Project name and path cannot be empty");
  }
  
  const projects = await getProjects();
  projects[trimmedName] = trimmedPath;
  await safeSetJSON(PROJECTS_KEY, projects);
}

export async function removeProject(name: string) {
  if (!name || typeof name !== "string") {
    throw new Error("Invalid project name");
  }
  
  const projects = await getProjects();
  delete projects[name.trim()];
  await safeSetJSON(PROJECTS_KEY, projects);
}

export async function setActiveProject(path: string) {
  if (!path || typeof path !== "string") {
    throw new Error("Invalid project path");
  }
  
  const trimmedPath = path.trim();
  if (!trimmedPath) {
    throw new Error("Project path cannot be empty");
  }
  
  await LocalStorage.setItem(ACTIVE_PROJECT_KEY, trimmedPath);
}

export async function getActiveProject(): Promise<string | null> {
  try {
    const path = await LocalStorage.getItem<string>(ACTIVE_PROJECT_KEY);
    if (!path || typeof path !== "string") {
      return null;
    }
    
    const trimmedPath = path.trim();
    return trimmedPath || null;
  } catch (error) {
    console.error("Failed to get active project:", error);
    await clearCorruptedData(ACTIVE_PROJECT_KEY);
    return null;
  }
}

export async function clearActiveProject(): Promise<void> {
  try {
    await LocalStorage.removeItem(ACTIVE_PROJECT_KEY);
  } catch (error) {
    console.error("Failed to clear active project:", error);
  }
}
