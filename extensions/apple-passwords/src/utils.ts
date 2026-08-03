import { getFrontmostApplication, getPreferenceValues, PreferenceValues } from "@raycast/api";
import { runAppleScript } from "@raycast/utils";
import { execFile, spawn } from "child_process";
import { existsSync } from "fs";
import { promisify } from "util";
import psl from "psl";

export interface APWEntry {
  domain: string;
  username: string;
  title?: string;
  code?: string;
  hasOtp?: boolean;
  password?: string;
  source?: string;
  sites?: string[];
  highLevelDomain?: string;
}

export interface APWMsg {
  error?: string;
  status: number;
  results?: APWEntry[];
}

class BrowserError extends Error {
  constructor(browser: string) {
    super(`Browser not supported: ${browser}`);
  }
}

export const PREFERENCES = getPreferenceValues<PreferenceValues>();
const CLI_PATH = PREFERENCES.cliPathAPW || ["/opt/homebrew/bin/apw", "/usr/local/bin/apw"].find(existsSync) || "apw";
const CACHE_TIMEOUT = 1000 * 60 * parseInt(PREFERENCES.cacheTimeout || "0", 10);
const passwordCache = new Map<string, { password: string }>();

export function clearCache(): void {
  passwordCache.clear();
}
const execFileAsync = promisify(execFile);

function execWithStdin(args: string[], input: string): Promise<APWMsg> {
  return new Promise((resolve, reject) => {
    const child = spawn(CLI_PATH, args);
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (d: Buffer) => (stdout += d));
    child.stderr.on("data", (d: Buffer) => (stderr += d));
    child.on("close", () => {
      const raw = stdout.trim() || stderr.trim();
      try {
        resolve(JSON.parse(raw));
      } catch {
        reject(new Error(raw || "Unknown error"));
      }
    });
    child.stdin.write(input + "\n");
    child.stdin.end();
  });
}

export async function execAPWCommand(args: string[], stdin?: string): Promise<APWMsg> {
  const shouldCache = args[0] === "pw" && args[1] === "get" && args.length === 4 && CACHE_TIMEOUT > 0;
  const cacheKey = shouldCache ? `${args[2]}\0${args[3]}` : "";
  const cached = passwordCache.get(cacheKey);

  if (cached) {
    console.info("Cache hit: pw get");
    return { status: 0, results: [{ domain: args[2], username: args[3], password: cached.password }] };
  }

  if (stdin !== undefined) return execWithStdin(args, stdin);

  try {
    const { stdout } = await execFileAsync(CLI_PATH, args);
    const data = JSON.parse(stdout.trim()) as APWMsg;
    const password = data.results?.[0]?.password;
    if (data.status === 0 && shouldCache && password !== undefined) {
      const cached = { password };
      passwordCache.set(cacheKey, cached);
      setTimeout(() => {
        if (passwordCache.get(cacheKey) === cached) passwordCache.delete(cacheKey);
      }, CACHE_TIMEOUT).unref();
    }
    return data;
  } catch (error) {
    const stderr = error && typeof error === "object" && "stderr" in error ? String(error.stderr).trim() : "";
    if (!stderr) throw error;
    let message = stderr;
    let apwStatus: number | undefined;
    try {
      const parsed = JSON.parse(stderr) as APWMsg;
      message = parsed.error || stderr;
      apwStatus = parsed.status;
    } catch {
      /* not JSON */
    }
    throw Object.assign(new Error(message), { apwStatus });
  }
}

function parseDomain(url: string): string {
  const parsed = psl.parse(url);
  if ("error" in parsed || !parsed.domain) return url;
  return parsed.domain;
}

function mergeEntries(passwordList: APWEntry[], otpList: APWEntry[]): APWEntry[] {
  return passwordList.map((entry) => {
    const otpEntry = otpList.find(
      (otp) => parseDomain(otp.domain) === parseDomain(entry.domain) && otp.username === entry.username,
    );
    return {
      ...entry,
      domain: parseDomain(entry.domain),
      code: otpEntry?.code,
      hasOtp: !!otpEntry,
    };
  });
}

export async function listAPWEntries(url: string): Promise<APWEntry[]> {
  const passwordList = await execAPWCommand(["pw", "list", url]);
  const otpList = await execAPWCommand(["otp", "list", url]);
  return mergeEntries(passwordList.results ?? [], otpList.results ?? []);
}

export async function getAPWEntry(url: string, action: "otp" | "pw", username: string): Promise<APWEntry | undefined> {
  const result = await execAPWCommand(action === "pw" ? [action, "get", url, username] : [action, "get", url]);
  if (action === "pw") {
    const password = result.results?.[0]?.password;
    return password === undefined ? undefined : { domain: parseDomain(url), username, password };
  }
  return (result.results ?? [])
    .map((entry) => ({ ...entry, domain: parseDomain(entry.domain) }))
    .find((entry) => entry.username === username && entry.domain === parseDomain(url));
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
  try {
    const frontmostApplication = await getFrontmostApplication();
    try {
      const res = await runAppleScript(getBrowserCommand(frontmostApplication.name));
      const parsed = psl.parse(new URL(res).hostname);
      if ("error" in parsed) {
        throw new Error(parsed.error.toString());
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
  } catch {
    return "";
  }
};
