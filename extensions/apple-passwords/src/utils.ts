import {
  Cache,
  getFrontmostApplication,
  getPreferenceValues,
  PreferenceValues,
} from "@raycast/api";
import { runAppleScript } from "@raycast/utils";
import { spawnSync } from "child_process";
import { existsSync } from "fs";
import psl from "psl";

export interface APWAuthRequest {
  salt: string;
  serverKey: string;
  username: string;
  clientKey: string;
}

export interface APWEntry {
  domain: string;
  username: string;
  code?: string;
  password?: string;
}

export interface APWMsg {
  error: string;
  status: number;
  results: APWEntry[];
}

class BrowserError extends Error {
  constructor(browser: string) {
    super(`Browser not supported: ${browser}`);
  }
}

export const PREFERENCES = getPreferenceValues<PreferenceValues>();
const CLI_PATH =
  PREFERENCES.cliPathAPW ||
  ["/opt/homebrew/bin/apw", "/usr/local/bin/apw"].find(existsSync) ||
  "apw";
const CACHE_TIMEOUT = 1000 * 60 * parseInt(PREFERENCES.cacheTimeout || "0", 10);
const cache = new Cache();

const CACHE_EXCLUDED_COMMANDS = ["otp", "auth"];

export async function execAPWCommand(
  args: string[],
): Promise<APWMsg | APWAuthRequest> {
  if (!CLI_PATH) throw new Error("APW CLI is not found!");

  const cacheKey = args.join("_");
  const cachedData = cache.get(cacheKey);
  const lastUpdated = parseInt(cache.get(`${cacheKey}_lastUpdated`) || "0", 10);
  const cacheValid = Date.now() - lastUpdated < CACHE_TIMEOUT;
  const isCacheExcluded = CACHE_EXCLUDED_COMMANDS.some((cmd) =>
    args.includes(cmd),
  );

  if (cachedData && cacheValid && !isCacheExcluded) {
    console.info("Cache hit: " + cacheKey);
    return JSON.parse(cachedData);
  }

  try {
    const { stdout } = spawnSync(CLI_PATH, args);
    const match = stdout.toString().match(/({.*})/);
    const jsonData = match ? match[1] : "{}";
    const data = JSON.parse(jsonData);

    if (data.status === 0) {
      cache.set(cacheKey, JSON.stringify(data));
      cache.set(`${cacheKey}_lastUpdated`, Date.now().toString());
    }

    return data;
  } catch (err) {
    throw new Error(`Error processing command: ${args}. ${err}`);
  }
}

function parseDomain(url: string): string {
  const parsed = psl.parse(url);
  if (parsed.error || !parsed.domain) {
    throw new Error("Domain parsing error for: " + url);
  }
  return parsed.domain;
}

function mergeEntries(
  passwordList: APWEntry[],
  otpList: APWEntry[],
): APWEntry[] {
  return passwordList.map((entry) => {
    const otpEntry = otpList.find(
      (otp) =>
        parseDomain(otp.domain) === parseDomain(entry.domain) &&
        otp.username === entry.username,
    );
    return {
      ...entry,
      domain: parseDomain(entry.domain),
      code: otpEntry?.code,
    };
  });
}

export async function listAPWEntries(url: string): Promise<APWEntry[]> {
  const passwordList = (await execAPWCommand(["pw", "list", url])) as APWMsg;
  const otpList = (await execAPWCommand(["otp", "list", url])) as APWMsg;

  if (passwordList.status !== 0) passwordList.results = [];
  if (otpList.status !== 0) otpList.results = [];

  return mergeEntries(passwordList.results, otpList.results);
}

export async function getAPWEntries(
  url: string,
  action: "otp" | "pw",
): Promise<APWEntry[]> {
  const result = (await execAPWCommand([action, "get", url])) as APWMsg;
  return result.results.map((entry) => ({
    ...entry,
    domain: parseDomain(entry.domain),
  }));
}

const getBrowserCommand = (browserName: string) => {
  switch (browserName) {
    case "Safari":
    case "Webkit":
    case "Orion":
      return `tell application "${browserName}" to return URL of front document`;
    case "Google Chrome":
    case "Google Chrome Canary":
    case "Chromium":
    case "Brave":
    case "Arc":
      return `tell application "${browserName}" to return URL of active tab of front window`;
    default:
      throw new BrowserError(browserName);
  }
};

export const getActiveURL = async (): Promise<string> => {
  const frontmostApplication = await getFrontmostApplication();
  try {
    const res = await runAppleScript(
      getBrowserCommand(frontmostApplication.name),
    );
    const parsed = psl.parse(new URL(res).hostname);
    if (parsed.error) {
      throw new Error(parsed.error.message);
    }
    return parsed.domain || "";
  } catch (error) {
    if (error instanceof BrowserError) {
      console.warn(error.message);
      return "";
    }
    console.error("Application: " + frontmostApplication.name, error);
    return "";
  }
};
