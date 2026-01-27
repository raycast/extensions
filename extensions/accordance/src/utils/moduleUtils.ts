import { Cache } from "@raycast/api";
import { runAppleScript } from "@raycast/utils";
import { readFileSync, readdirSync, existsSync } from "fs";
import { join } from "path";
import { homedir } from "os";

const cache = new Cache();
const CACHE_KEY = "accordance-modules";
const ALL_MODULES_CACHE_KEY = "accordance-all-modules";
const CACHE_DURATION = 1000 * 60 * 60; // 1 hour in milliseconds

export interface ModuleInfo {
  name: string;
  abbreviation: string;
  fullName: string;
  type: number;
  language: number;
  tags: string[];
}

export interface ModuleFetchResult {
  modules: string[];
  defaultModule: string;
}

export interface AllModulesResult {
  textModules: ModuleInfo[];
  toolModules: ModuleInfo[];
  allModules: ModuleInfo[];
}

/**
 * Fetches Accordance Bible text modules with caching
 * @param preferredModule - The preferred default module (from preferences)
 * @returns Promise<ModuleFetchResult> - Object containing modules array and default module
 */
export async function fetchModules(preferredModule: string): Promise<ModuleFetchResult> {
  try {
    // Check cache first
    const cachedData = cache.get(CACHE_KEY);
    if (cachedData) {
      const { modules, timestamp } = JSON.parse(cachedData);

      // Check if cache is still valid (within 1 hour)
      if (Date.now() - timestamp < CACHE_DURATION) {
        const defaultModule = getDefaultModule(modules, preferredModule);
        return { modules, defaultModule };
      }
    }

    // Fetch fresh data from Accordance
    const appleScript = `
      tell application "Accordance"
        if not running then launch
        try
          set moduleList to «event AccdVerL»
          return moduleList
        on error errMsg
          return "Error: " & errMsg
        end try
      end tell
    `;

    const stdout = await runAppleScript(appleScript);
    const modules = stdout.trim().split(", ");

    // Cache the modules with timestamp
    const cacheData = {
      modules,
      timestamp: Date.now(),
    };
    cache.set(CACHE_KEY, JSON.stringify(cacheData));

    const defaultModule = getDefaultModule(modules, preferredModule);
    return { modules, defaultModule };
  } catch (error) {
    console.error("Failed to fetch modules:", error);
    // Return fallback data
    const fallbackModules = ["First Text Module"];
    return {
      modules: fallbackModules,
      defaultModule: getDefaultModule(fallbackModules, preferredModule),
    };
  }
}

/**
 * Determines the default module from a list of modules
 * Prefers the specified preferred module, then falls back to the first available module
 */
function getDefaultModule(modules: string[], preferredModule: string): string {
  if (modules.includes(preferredModule)) {
    return preferredModule;
  }
  return modules.length > 0 ? modules[0] : "First Text Module";
}

/**
 * Clears the module cache (useful for testing or forcing refresh)
 */
export function clearModuleCache(): void {
  cache.remove(CACHE_KEY);
}

/**
 * Clears the all modules cache (useful for testing or forcing refresh)
 */
export function clearAllModulesCache(): void {
  cache.remove(ALL_MODULES_CACHE_KEY);
}

/**
 * Checks if a module is English using Accordance's AccdIsEg event
 * @param moduleName - The module name to check
 * @returns Promise<boolean> - True if the module is English
 */
export async function isEnglishModule(moduleName: string): Promise<boolean> {
  try {
    const appleScript = `
      tell application "Accordance"
        if not running then launch
        try
          set result to «event AccdIsEg» {"${moduleName}"}
          return result
        on error errMsg
          return "Error: " & errMsg
        end try
      end tell
    `;

    const stdout = await runAppleScript(appleScript);
    return stdout.trim().toLowerCase() === "true";
  } catch (error) {
    console.error("Failed to check if module is English:", error);
    return false;
  }
}

/**
 * Discovers all modules in the Accordance modules directory with caching
 * @returns Promise<AllModulesResult> - Object containing arrays of text modules, tool modules, and all modules
 */
export async function discoverAllModules(): Promise<AllModulesResult> {
  try {
    // Check cache first
    const cachedData = cache.get(ALL_MODULES_CACHE_KEY);
    if (cachedData) {
      const { textModules, toolModules, allModules, timestamp } = JSON.parse(cachedData);

      // Check if cache is still valid (within 1 hour)
      if (Date.now() - timestamp < CACHE_DURATION) {
        return { textModules, toolModules, allModules };
      }
    }

    const modulesDir = join(homedir(), "Library", "Application Support", "Accordance", "Modules");

    if (!existsSync(modulesDir)) {
      throw new Error("Accordance modules directory not found");
    }

    const textModules: ModuleInfo[] = [];
    const toolModules: ModuleInfo[] = [];

    // Discover text modules
    const textsDir = join(modulesDir, "Texts");
    if (existsSync(textsDir)) {
      const textDirs = readdirSync(textsDir).filter((dir) => dir.endsWith(".atext"));
      for (const dir of textDirs) {
        const moduleInfo = parseModuleInfo(join(textsDir, dir));
        if (moduleInfo) {
          textModules.push(moduleInfo);
        }
      }
    }

    // Discover tool modules
    const toolsDir = join(modulesDir, "Tools");
    if (existsSync(toolsDir)) {
      const toolDirs = readdirSync(toolsDir).filter((dir) => dir.endsWith(".atool"));
      for (const dir of toolDirs) {
        const moduleInfo = parseModuleInfo(join(toolsDir, dir));
        if (moduleInfo) {
          toolModules.push(moduleInfo);
        }
      }
    }

    const allModules = [...textModules, ...toolModules];

    // Cache the modules with timestamp
    const cacheData = {
      textModules,
      toolModules,
      allModules,
      timestamp: Date.now(),
    };
    cache.set(ALL_MODULES_CACHE_KEY, JSON.stringify(cacheData));

    return {
      textModules,
      toolModules,
      allModules,
    };
  } catch (error) {
    console.error("Failed to discover modules:", error);
    return {
      textModules: [],
      toolModules: [],
      allModules: [],
    };
  }
}

/**
 * Parses module information from an Info.plist file
 * @param modulePath - Path to the module directory
 * @returns ModuleInfo or null if parsing fails
 */
function parseModuleInfo(modulePath: string): ModuleInfo | null {
  try {
    const plistPath = join(modulePath, "Info.plist");
    if (!existsSync(plistPath)) {
      return null;
    }

    const plistContent = readFileSync(plistPath, "utf8");
    const lines = plistContent.split("\n");

    const getValue = (key: string): string | null => {
      const keyIndex = lines.findIndex((line) => line.includes(`<key>${key}</key>`));
      if (keyIndex === -1 || keyIndex + 1 >= lines.length) return null;

      const valueLine = lines[keyIndex + 1];
      const match = valueLine.match(/<string>([^<]+)<\/string>/);
      return match ? match[1] : null;
    };

    const getInteger = (key: string): number | null => {
      const keyIndex = lines.findIndex((line) => line.includes(`<key>${key}</key>`));
      if (keyIndex === -1 || keyIndex + 1 >= lines.length) return null;

      const valueLine = lines[keyIndex + 1];
      const match = valueLine.match(/<integer>([^<]+)<\/integer>/);
      return match ? parseInt(match[1], 10) : null;
    };

    const getTags = (): string[] => {
      const tagsStartIndex = lines.findIndex((line) => line.includes("<key>com.oaktree.module.tagsarray</key>"));
      if (tagsStartIndex === -1) return [];

      const tagsSection = lines.slice(tagsStartIndex + 1);
      const tagsEndIndex = tagsSection.findIndex((line) => line.includes("</array>"));
      if (tagsEndIndex === -1) return [];

      const tagLines = tagsSection.slice(0, tagsEndIndex);
      return tagLines
        .map((line) => {
          const match = line.match(/<string>([^<]+)<\/string>/);
          return match ? match[1] : null;
        })
        .filter((tag) => tag !== null) as string[];
    };

    const fullName = getValue("com.oaktree.module.fullmodulename");
    const abbreviation = getValue("com.oaktree.module.humanreadablename") || getValue("com.oaktree.module.textabbr");
    const type = getInteger("com.oaktree.module.moduletype");
    const language = getInteger("com.oaktree.module.language");
    const tags = getTags();

    if (!fullName || !abbreviation || type === null) {
      return null;
    }

    // Extract module name from directory name (remove .atext/.atool extension)
    const moduleName =
      modulePath
        .split("/")
        .pop()
        ?.replace(/\.(atext|atool)$/, "") || abbreviation;

    return {
      name: moduleName,
      abbreviation,
      fullName,
      type,
      language: language || 0,
      tags,
    };
  } catch (error) {
    console.error(`Failed to parse module info for ${modulePath}:`, error);
    return null;
  }
}
