import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import * as yaml from "js-yaml";
import { exec } from "child_process";

/**
 * Atomic file write: writes to a temp file first, then renames.
 * fs.renameSync is atomic on the same filesystem, so the target
 * file is never left empty or partial if the process is interrupted.
 */
function atomicWriteFileSync(filePath: string, data: string): void {
  const tmpPath = filePath + ".tmp";
  fs.writeFileSync(tmpPath, data, "utf-8");
  fs.renameSync(tmpPath, filePath);
}

// --- Platform ---

/** Returns true when running on macOS */
function isMacOS(): boolean {
  return process.platform === "darwin";
}

// --- Types ---

export interface ProfileItem {
  uid: string;
  type: "remote" | "local" | "merge" | "script";
  name?: string;
  desc?: string;
  url?: string;
  file?: string;
  updated?: number;
  selected?: { name: string; now: string }[];
  option?: {
    update_interval?: number;
    user_agent?: string;
    with_proxy?: boolean;
    self_proxy?: boolean;
  };
  extra?: {
    upload?: number;
    download?: number;
    total?: number;
    expire?: number;
  };
}

export interface ProfilesConfig {
  current?: string;
  items?: ProfileItem[];
}

export interface VergeConfig {
  clash_core?: string;
  language?: string;
  theme_mode?: string;
  [key: string]: unknown;
}

// --- Paths ---

function getClashVergeDir(): string {
  const configDir = isMacOS()
    ? path.join(os.homedir(), "Library", "Application Support")
    : process.env.APPDATA || path.join(os.homedir(), "AppData", "Roaming");
  return path.join(configDir, "io.github.clash-verge-rev.clash-verge-rev");
}

function getProfilesYamlPath(): string {
  return path.join(getClashVergeDir(), "profiles.yaml");
}

function getVergeYamlPath(): string {
  return path.join(getClashVergeDir(), "verge.yaml");
}

// --- Read/Write ---

/** Read and parse profiles.yaml */
export function readProfiles(): ProfilesConfig {
  const filePath = getProfilesYamlPath();
  if (!fs.existsSync(filePath)) {
    throw new Error(
      `Profiles config not found at: ${filePath}\nPlease make sure Clash Verge Rev is installed.`,
    );
  }
  const content = fs.readFileSync(filePath, "utf-8");
  return (yaml.load(content) as ProfilesConfig) || { items: [] };
}

/** Read and parse verge.yaml */
export function readVergeConfig(): VergeConfig {
  const filePath = getVergeYamlPath();
  if (!fs.existsSync(filePath)) {
    return {};
  }
  const content = fs.readFileSync(filePath, "utf-8");
  return (yaml.load(content) as VergeConfig) || {};
}

/** Write profiles.yaml - activate a profile by UID */
export function activateProfile(uid: string): void {
  const filePath = getProfilesYamlPath();
  const profiles = readProfiles();

  // Verify the profile exists
  const exists = profiles.items?.some((item) => item.uid === uid);
  if (!exists) {
    throw new Error(`Profile with UID "${uid}" not found`);
  }

  profiles.current = uid;
  const yamlStr = yaml.dump(profiles, { lineWidth: -1 });
  atomicWriteFileSync(filePath, yamlStr);
}

/** Get the currently active profile */
export function getCurrentProfile(
  profiles: ProfilesConfig,
): ProfileItem | undefined {
  if (!profiles.current || !profiles.items) return undefined;
  return profiles.items.find((item) => item.uid === profiles.current);
}

/** Format bytes to human readable */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

/** Format timestamp to locale string */
export function formatTime(timestamp: number): string {
  if (!timestamp) return "Never";
  return new Date(timestamp * 1000).toLocaleString();
}

/** Format expiration info */
export function formatExpire(timestamp: number): string {
  if (!timestamp) return "No expiration";
  const date = new Date(timestamp * 1000);
  const now = new Date();
  const diffDays = Math.ceil(
    (date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
  );
  if (diffDays < 0) return "Expired";
  if (diffDays === 0) return "Expires today";
  if (diffDays <= 30) return `${diffDays} days left`;
  return date.toLocaleDateString();
}

/** Get traffic usage string */
export function getTrafficInfo(profile: ProfileItem): string | undefined {
  if (!profile.extra) return undefined;
  const { upload = 0, download = 0, total = 0 } = profile.extra;
  const used = upload + download;
  if (total === 0) return `Used: ${formatBytes(used)}`;
  const percentage = ((used / total) * 100).toFixed(1);
  return `${formatBytes(used)} / ${formatBytes(total)} (${percentage}%)`;
}

/** Get Clash Verge Rev config directory path */
export function getConfigDir(): string {
  return getClashVergeDir();
}

// --- Shortcuts Storage (separate from profiles.yaml) ---

function getShortcutsPath(): string {
  return path.join(getClashVergeDir(), "raycast-shortcuts.json");
}

/** Read all shortcuts: { uid: shortcutString } */
export function readShortcuts(): Record<string, string> {
  const filePath = getShortcutsPath();
  if (!fs.existsSync(filePath)) return {};
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf-8"));
  } catch {
    return {};
  }
}

/** Save a shortcut for a profile UID */
export function saveShortcut(uid: string, shortcut: string): void {
  const shortcuts = readShortcuts();
  if (shortcut) {
    shortcuts[uid] = shortcut;
  } else {
    delete shortcuts[uid];
  }
  atomicWriteFileSync(
    getShortcutsPath(),
    JSON.stringify(shortcuts, null, 2),
  );
}

/** Get shortcut for a profile UID */
export function getShortcut(uid: string): string | undefined {
  return readShortcuts()[uid];
}

/** Find profile UID by shortcut string */
export function findUidByShortcut(shortcut: string): string | undefined {
  const shortcuts = readShortcuts();
  return Object.entries(shortcuts).find(([, v]) => v === shortcut)?.[0];
}

/** Check if a shortcut is already used by another profile */
export function isShortcutDuplicate(
  shortcut: string,
  excludeUid: string,
): string | undefined {
  const shortcuts = readShortcuts();
  const entry = Object.entries(shortcuts).find(
    ([uid, v]) => v === shortcut && uid !== excludeUid,
  );
  return entry ? entry[0] : undefined;
}

/** Keys that come from the raw profile (subscription-specific content) */
const PROFILE_CONTENT_KEYS = [
  "proxies",
  "proxy-groups",
  "rules",
  "sub-rules",
  "rule-providers",
  "proxy-providers",
];

/**
 * Fast profile switch: merge infrastructure settings from current clash-verge.yaml
 * with the new profile's proxies/rules, write back, and return the path for Mihomo reload.
 *
 * This avoids restarting the entire Clash Verge Rev application (~7s → <1s).
 */
export function switchProfileFast(profileFile: string): string {
  const configDir = getClashVergeDir();
  const clashVergePath = path.join(configDir, "clash-verge.yaml");
  const profilePath = path.join(configDir, "profiles", profileFile);

  console.log("[FastSwitch] Reading current clash-verge.yaml...");
  if (!fs.existsSync(clashVergePath)) {
    throw new Error("clash-verge.yaml not found");
  }
  if (!fs.existsSync(profilePath)) {
    throw new Error(`Profile file not found: ${profileFile}`);
  }

  // Read current running config (has TUN, ports, external-controller, etc.)
  const currentConfig = yaml.load(
    fs.readFileSync(clashVergePath, "utf-8"),
  ) as Record<string, unknown>;

  // Read the new profile (has proxies, proxy-groups, rules)
  const newProfile = yaml.load(fs.readFileSync(profilePath, "utf-8")) as Record<
    string,
    unknown
  >;

  // Build merged config: infrastructure from current + profile content from new
  const merged: Record<string, unknown> = {};

  // Copy infrastructure settings from current config (everything except profile content)
  for (const key of Object.keys(currentConfig)) {
    if (!PROFILE_CONTENT_KEYS.includes(key)) {
      merged[key] = currentConfig[key];
    }
  }

  // Copy profile-specific content from new profile
  for (const key of PROFILE_CONTENT_KEYS) {
    if (newProfile[key] !== undefined) {
      merged[key] = newProfile[key];
    }
  }

  // Write merged config
  console.log("[FastSwitch] Writing merged clash-verge.yaml...");
  const yamlStr =
    "# Generated by Clash Verge\n\n" +
    yaml.dump(merged, {
      lineWidth: -1,
      noRefs: true,
      sortKeys: false,
    });
  atomicWriteFileSync(clashVergePath, yamlStr);

  // Return normalized path for Mihomo reload
  return clashVergePath.replace(/\\/g, "/");
}

/** Helper to run a shell command and return stdout */
function runCommand(cmd: string): Promise<string> {
  return new Promise((resolve, reject) => {
    exec(cmd, { encoding: "utf-8" }, (error, stdout, stderr) => {
      if (error) {
        console.error(`[Shell] Command failed: ${cmd}`, stderr);
        reject(error);
      } else {
        resolve(stdout.trim());
      }
    });
  });
}

/**
 * Restart Clash Verge Rev application.
 * 1. Get exe path from running process
 * 2. Kill the process
 * 3. Wait briefly
 * 4. Relaunch
 */
export async function restartClashVerge(): Promise<void> {
  console.log("[Restart] Starting Clash Verge Rev restart...");

  if (isMacOS()) {
    // --- macOS restart logic ---

    // Step 1: Check app existence
    const appPath = "/Applications/Clash Verge.app";
    const appExists = fs.existsSync(appPath);

    // Step 2: Kill existing process
    try {
      await runCommand("pkill -f 'Clash Verge'");
      console.log("[Restart] Killed Clash Verge process");
    } catch {
      console.log("[Restart] No Clash Verge process to kill (or kill failed)");
    }

    // Step 3: Wait for process to fully exit
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Step 4: Relaunch
    if (appExists) {
      console.log("[Restart] Relaunching:", appPath);
      exec(`open -a "Clash Verge"`, { encoding: "utf-8" });
    } else {
      console.log("[Restart] Clash Verge.app not found in /Applications");
    }

    // Wait for app to initialize and process configs
    await new Promise((resolve) => setTimeout(resolve, 5000));
  } else {
    // --- Windows restart logic ---

    // Step 1: Get executable path from running process
    let exePath = "";
    try {
      // Process name is "clash-verge" (hyphenated, no .exe)
      const psCmd = `powershell -NoProfile -Command "(Get-Process 'clash-verge' -ErrorAction SilentlyContinue | Select-Object -First 1).Path"`;
      exePath = await runCommand(psCmd);
      console.log("[Restart] Found exe path:", exePath);
    } catch {
      console.log("[Restart] Could not get exe path from running process");
    }

    // Fallback: try common install locations
    if (!exePath) {
      const candidates = [
        path.join(
          os.homedir(),
          "AppData",
          "Local",
          "Clash Verge",
          "clash-verge.exe",
        ),
        path.join(
          os.homedir(),
          "AppData",
          "Local",
          "clash-verge",
          "clash-verge.exe",
        ),
        "C:\\Program Files\\Clash Verge\\clash-verge.exe",
        "C:\\Program Files (x86)\\Clash Verge\\clash-verge.exe",
      ];
      for (const candidate of candidates) {
        if (fs.existsSync(candidate)) {
          exePath = candidate;
          console.log("[Restart] Found exe at fallback path:", exePath);
          break;
        }
      }
    }

    // Step 2: Kill existing process
    try {
      await runCommand('taskkill /f /im "clash-verge.exe"');
      console.log("[Restart] Killed Clash Verge process");
    } catch {
      console.log("[Restart] No Clash Verge process to kill (or kill failed)");
    }

    // Note: verge-mihomo.exe is managed by clash-verge-service.exe
    // and will be restarted automatically when Clash Verge relaunches

    // Step 3: Wait for process to fully exit
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Step 4: Relaunch
    if (exePath && fs.existsSync(exePath)) {
      console.log("[Restart] Relaunching:", exePath);
      exec(`start "" "${exePath}"`, { encoding: "utf-8" });
    } else {
      // Fallback: try using Start Menu shortcut
      console.log("[Restart] Using Start Menu shortcut to relaunch");
      exec('start "" "Clash Verge"', { shell: "cmd.exe", encoding: "utf-8" });
    }

    // Wait for app to initialize and process configs
    await new Promise((resolve) => setTimeout(resolve, 5000));
  }

  console.log("[Restart] Restart complete");
}

/**
 * Update profile content from remote URL
 */
export async function updateProfileContent(uid: string): Promise<void> {
  const filePath = getProfilesYamlPath();
  const profiles = readProfiles();
  const profileIndex = profiles.items?.findIndex((item) => item.uid === uid);

  if (profileIndex === undefined || profileIndex === -1 || !profiles.items) {
    throw new Error(`Profile with UID "${uid}" not found`);
  }

  const profile = profiles.items[profileIndex];

  if (profile.type !== "remote" || !profile.url) {
    throw new Error("Profile is not a remote subscription or has no URL");
  }

  console.log(
    `[Profile] Updating content for ${profile.name} (${profile.url})`,
  );

  // Fetch remote content
  const response = await fetch(profile.url, {
    headers: {
      "User-Agent":
        profile.option?.user_agent || "ClashVerge/1.0.0 (Raycast Extension)",
    },
  });

  if (!response.ok) {
    throw new Error(
      `Failed to fetch profile: ${response.status} ${response.statusText}`,
    );
  }

  const content = await response.text();

  // Validate YAML/content (basic check)
  if (!content || content.trim().length === 0) {
    throw new Error("Fetched profile content is empty");
  }

  // Ensure profiles directory exists
  const profileDir = path.join(getConfigDir(), "profiles");
  if (!fs.existsSync(profileDir)) {
    fs.mkdirSync(profileDir, { recursive: true });
  }

  // Determine filename if not exists
  let filename = profile.file;
  if (!filename) {
    // Basic sanitization
    const safeName = (profile.name || "profile")
      .replace(/[^a-z0-9]/gi, "_")
      .toLowerCase();
    filename = `${safeName}_${Date.now()}.yaml`;
    profile.file = filename;
  }

  const profilePath = path.join(profileDir, filename);

  // Write content
  fs.writeFileSync(profilePath, content, "utf-8");
  console.log(`[Profile] Saved content to ${profilePath}`);

  // Update headers info if available (Subscription-Userinfo)
  const userInfo = response.headers.get("subscription-userinfo");
  if (userInfo) {
    const extra: ProfileItem["extra"] = profile.extra || {};
    const parts = userInfo.split(";");
    for (const part of parts) {
      const [key, value] = part.trim().split("=");
      if (key === "upload") extra.upload = parseInt(value, 10);
      if (key === "download") extra.download = parseInt(value, 10);
      if (key === "total") extra.total = parseInt(value, 10);
      if (key === "expire") extra.expire = parseInt(value, 10);
    }
    profile.extra = extra;
  }

  // Update timestamp
  profile.updated = Math.floor(Date.now() / 1000);

  // Save profiles.yaml
  profiles.items[profileIndex] = profile;
  const yamlStr = yaml.dump(profiles, { lineWidth: -1 });
  atomicWriteFileSync(filePath, yamlStr);
}

/**
 * Update profile metadata (name, desc, url, etc.)
 */
export function updateProfileMetadata(
  uid: string,
  data: Partial<ProfileItem>,
): void {
  const filePath = getProfilesYamlPath();
  const profiles = readProfiles();
  const profileIndex = profiles.items?.findIndex((item) => item.uid === uid);

  if (profileIndex === undefined || profileIndex === -1 || !profiles.items) {
    throw new Error(`Profile with UID "${uid}" not found`);
  }

  // Merge updates
  profiles.items[profileIndex] = {
    ...profiles.items[profileIndex],
    ...data,
  };

  const yamlStr = yaml.dump(profiles, { lineWidth: -1 });
  atomicWriteFileSync(filePath, yamlStr);
}
