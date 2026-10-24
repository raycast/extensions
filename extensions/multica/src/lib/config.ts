import { getPreferenceValues } from "@raycast/api";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const DEFAULT_SERVER_URL = "https://api.multica.ai";
const DEFAULT_APP_URL = "https://multica.ai";

export interface Credentials {
  serverUrl: string;
  appUrl: string;
  token: string;
  /** Workspace the CLI profile is pointed at, if any. */
  workspaceId?: string;
  /** Human-readable description of where the token came from. */
  source: string;
}

interface CliConfig {
  server_url?: string;
  app_url?: string;
  workspace_id?: string;
  token?: string;
}

export class MissingCredentialsError extends Error {
  constructor() {
    super(
      "No Multica login found. Sign in with the Multica desktop app or `multica login`, or set an API token in the extension preferences.",
    );
    this.name = "MissingCredentialsError";
  }
}

function multicaHome(): string {
  return path.join(os.homedir(), ".multica");
}

function readCliConfig(file: string): CliConfig | undefined {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8")) as CliConfig;
  } catch {
    return undefined;
  }
}

/**
 * Candidate CLI config files, most preferred first: the profile named in
 * preferences, then the default profile, then every named profile (most
 * recently modified first).
 */
function candidateConfigFiles(profile?: string): string[] {
  const home = multicaHome();
  if (profile) return [path.join(home, "profiles", profile, "config.json")];

  const profilesDir = path.join(home, "profiles");
  let profileFiles: string[] = [];
  try {
    profileFiles = fs
      .readdirSync(profilesDir)
      .map((name) => path.join(profilesDir, name, "config.json"))
      .filter((file) => fs.existsSync(file))
      .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);
  } catch {
    // No named profiles.
  }
  return [path.join(home, "config.json"), ...profileFiles];
}

function trimSlash(url: string): string {
  return url.replace(/\/+$/, "");
}

function defaultAppUrl(serverUrl: string): string {
  return serverUrl === DEFAULT_SERVER_URL ? DEFAULT_APP_URL : serverUrl;
}

let cached: Credentials | undefined;

/** Demo Mode serves sample data from `demo.ts` and never touches the network. */
export function isDemoMode(): boolean {
  return Boolean(getPreferenceValues<Preferences>().demoMode);
}

export function getCredentials(): Credentials {
  if (cached) return cached;

  const prefs = getPreferenceValues<Preferences>();
  const prefServer = prefs.serverUrl?.trim() ? trimSlash(prefs.serverUrl.trim()) : undefined;
  const prefApp = prefs.appUrl?.trim() ? trimSlash(prefs.appUrl.trim()) : undefined;

  if (prefs.demoMode) {
    cached = { serverUrl: DEFAULT_SERVER_URL, appUrl: DEFAULT_APP_URL, token: "demo", source: "Demo Mode" };
    return cached;
  }

  if (prefs.apiToken?.trim()) {
    const serverUrl = prefServer ?? DEFAULT_SERVER_URL;
    cached = {
      serverUrl,
      appUrl: prefApp ?? defaultAppUrl(serverUrl),
      token: prefs.apiToken.trim(),
      source: "extension preferences",
    };
    return cached;
  }

  for (const file of candidateConfigFiles(prefs.profile?.trim() || undefined)) {
    const config = readCliConfig(file);
    if (!config?.token) continue;
    const serverUrl = prefServer ?? trimSlash(config.server_url || DEFAULT_SERVER_URL);
    cached = {
      serverUrl,
      appUrl: prefApp ?? trimSlash(config.app_url || defaultAppUrl(serverUrl)),
      token: config.token,
      workspaceId: config.workspace_id || undefined,
      source: file.replace(os.homedir(), "~"),
    };
    return cached;
  }

  throw new MissingCredentialsError();
}
