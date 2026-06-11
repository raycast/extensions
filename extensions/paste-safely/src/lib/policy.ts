import { environment } from "@raycast/api";
import * as fs from "fs";
import * as path from "path";
import { CONFIG_FILE_NAME, createDefaultPolicy, type Policy } from "./constants";

export type { Policy } from "./constants";

const DEFAULT_POLICY: Policy = createDefaultPolicy();

/**
 * Get the configuration file path.
 * If a custom path is set in preferences and is valid/accessible, use that.
 * Otherwise, default to the extension support directory.
 */
export function getConfigFilePath(): string {
  return path.join(environment.supportPath, CONFIG_FILE_NAME);
}

/**
 * Ensure the directory exists for the config file
 */
function ensureConfigDirectory(configPath: string): void {
  const dir = path.dirname(configPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

/**
 * Load policy from JSON file
 */
async function loadPolicyFromFile(filePath: string): Promise<Policy | null> {
  try {
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, "utf-8");
      const parsed = JSON.parse(data);

      // New format: has "allow" and "block" properties
      if (parsed && typeof parsed === "object" && "allow" in parsed && "block" in parsed) {
        return {
          mode: parsed.mode === "allow" ? "allow" : "block",
          allow: {
            apps: Array.isArray(parsed.allow?.apps) ? parsed.allow.apps : [],
            websites: Array.isArray(parsed.allow?.websites) ? parsed.allow.websites : [],
          },
          block: {
            apps: Array.isArray(parsed.block?.apps) ? parsed.block.apps : [],
            websites: Array.isArray(parsed.block?.websites) ? parsed.block.websites : [],
          },
        };
      }

      console.warn(`Unrecognized policy config schema in ${filePath}; expected {mode, allow, block}`);
    }
  } catch (error) {
    console.error("Failed to load policy from file:", error);
  }
  return null;
}

/**
 * Save policy to JSON file
 */
async function savePolicyToFile(filePath: string, policy: Policy): Promise<void> {
  try {
    ensureConfigDirectory(filePath);
    fs.writeFileSync(filePath, JSON.stringify(policy, null, 2), "utf-8");
  } catch (error) {
    console.error("Failed to save policy to file:", error);
    throw error;
  }
}

export async function loadPolicy(): Promise<Policy> {
  const configPath = getConfigFilePath();

  // Try to load from file first
  const policy = await loadPolicyFromFile(configPath);
  if (policy) return policy;

  // Return default if nothing found
  return DEFAULT_POLICY;
}

export async function savePolicy(policy: Policy): Promise<void> {
  const configPath = getConfigFilePath();
  await savePolicyToFile(configPath, policy);
}

export async function ensureConfigFileExists(): Promise<string> {
  const configPath = getConfigFilePath();

  if (fs.existsSync(configPath)) {
    return configPath;
  }

  await savePolicyToFile(configPath, createDefaultPolicy());

  return configPath;
}

export function normalizeWebsite(urlOrHost: string): string {
  if (!urlOrHost) return "";

  try {
    // If it looks like a URL, parse it
    if (urlOrHost.includes("://") || urlOrHost.includes("/")) {
      const url = new URL(urlOrHost);
      return url.hostname.toLowerCase();
    }
  } catch {
    // Not a valid URL, treat as hostname
  }

  // Return as lowercase hostname
  return urlOrHost.toLowerCase().trim();
}

export function normalizeApp(appIdentifier: string): string {
  if (!appIdentifier) return "";
  return appIdentifier.toLowerCase().trim();
}

export function shouldConfirm(policy: Policy, target: { app?: string; website?: string }): boolean {
  const { app, website } = target;

  // If neither app nor website provided, confirm as safe fallback
  if (!app && !website) {
    return true;
  }

  // Get the active mode list
  const activeList = policy.mode === "allow" ? policy.allow : policy.block;

  const normalizedApp = app ? normalizeApp(app) : undefined;
  const appIsInList = normalizedApp ? activeList.apps.some((a) => normalizeApp(a) === normalizedApp) : undefined;

  const normalizedWebsite = website ? normalizeWebsite(website) : undefined;
  const websiteIsInList = normalizedWebsite
    ? activeList.websites.some((w) => normalizeWebsite(w) === normalizedWebsite)
    : undefined;

  if (policy.mode === "allow") {
    // In allow mode, any provided context not in allow-list requires confirmation.
    const appRequiresConfirm = appIsInList === undefined ? false : !appIsInList;
    const websiteRequiresConfirm = websiteIsInList === undefined ? false : !websiteIsInList;
    const decision = appRequiresConfirm || websiteRequiresConfirm;
    return decision;
  }

  // In block mode, any provided context in block-list requires confirmation.
  const appRequiresConfirm = appIsInList === undefined ? false : appIsInList;
  const websiteRequiresConfirm = websiteIsInList === undefined ? false : websiteIsInList;
  const decision = appRequiresConfirm || websiteRequiresConfirm;
  return decision;
}
