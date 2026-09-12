import { Application, LocalStorage, environment, getApplications, getPreferenceValues } from "@raycast/api";
import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { lstat, mkdir, mkdtemp, readFile, readlink, rm, stat, symlink } from "node:fs/promises";
import { homedir, tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";

import { DIA_BUNDLE_ID } from "./dia";
import { SAFARI_BUNDLE_ID, SafariTab } from "./safari";

const execFileAsync = promisify(execFile);
const DEFAULT_SESSION = "raycast";
const SESSION_CONTEXT_PREFIX = "browser-session:";

type BrowserPreferences = {
  browserApplication?: Application | string;
  browserDataDirectory?: string;
  browserProfile?: string;
};

export type BrowserSessionContext = {
  agentBrowserProfile?: string;
  applicationPath?: string;
  applicationName?: string;
  backend?: "agent-browser" | "dia" | "safari";
  browserDataDirectory?: string;
  bundleId?: string;
  diaTabIds?: string[];
  executablePath?: string;
  fakeHome?: string;
  profile?: string;
  safariTabs?: SafariTab[];
  socketDirectory?: string;
};

export async function initializeBrowserSession(
  sessionValue?: string,
  profileOverride?: string,
): Promise<{ context: BrowserSessionContext; isNew: boolean }> {
  const session = normalizeSession(sessionValue);
  const preferences = getPreferenceValues<BrowserPreferences>();
  const requested = await buildSessionContext(preferences, profileOverride);
  const existing = await getBrowserSessionContext(session);

  if (existing && !sameContext(existing, requested)) {
    throw new Error(
      `Session "${session}" is already bound to ${describeContext(existing)}. Close it before changing browsers or profiles.`,
    );
  }

  const context = existing ?? requested;
  if (context.backend !== "dia" && context.profile && context.browserDataDirectory) {
    const bridge = await prepareProfileBridge(
      session,
      context.browserDataDirectory,
      context.fakeHome,
      context.socketDirectory,
    );
    context.fakeHome = bridge.fakeHome;
    context.socketDirectory = bridge.socketDirectory;
  }
  return { context, isNew: !existing };
}

export async function saveBrowserSessionContext(
  sessionValue: string | undefined,
  context: BrowserSessionContext,
): Promise<void> {
  const session = normalizeSession(sessionValue);
  await LocalStorage.setItem(contextKey(session), JSON.stringify(context));
}

export async function getBrowserSessionContext(sessionValue?: string): Promise<BrowserSessionContext | undefined> {
  const session = normalizeSession(sessionValue);
  const stored = await LocalStorage.getItem<string>(contextKey(session));
  if (!stored) return undefined;
  try {
    return JSON.parse(stored) as BrowserSessionContext;
  } catch {
    return undefined;
  }
}

export async function clearBrowserSessionContext(sessionValue?: string): Promise<void> {
  const session = normalizeSession(sessionValue);
  const context = await getBrowserSessionContext(session);
  if (context?.fakeHome) await removeSessionFiles(context);
  await LocalStorage.removeItem(contextKey(session));
}

export function getBrowserArguments(context?: BrowserSessionContext): string[] {
  const args: string[] = [];
  if (context?.executablePath) args.push("--executable-path", context.executablePath);
  if (context?.agentBrowserProfile ?? context?.profile) {
    args.push("--profile", context.agentBrowserProfile ?? context.profile!);
  }
  return args;
}

export function getBrowserEnvironment(context?: BrowserSessionContext): NodeJS.ProcessEnv {
  const env = { ...process.env };
  if (context?.fakeHome) {
    if (process.platform === "win32") {
      env.USERPROFILE = context.fakeHome;
      env.LOCALAPPDATA = path.join(context.fakeHome, "AppData", "Local");
    } else {
      env.HOME = context.fakeHome;
    }
  }
  if (context?.socketDirectory) env.AGENT_BROWSER_SOCKET_DIR = context.socketDirectory;
  return env;
}

async function buildSessionContext(
  preferences: BrowserPreferences,
  profileOverride?: string,
): Promise<BrowserSessionContext> {
  const application = preferences.browserApplication
    ? await resolveInstalledApplication(preferences.browserApplication)
    : undefined;
  const profile = normalizeOptional(profileOverride) ?? normalizeOptional(preferences.browserProfile);
  if (application && isApplication(application, DIA_BUNDLE_ID, "Dia")) {
    return {
      applicationName: application.name,
      applicationPath: application.path,
      backend: "dia",
      bundleId: DIA_BUNDLE_ID,
      profile,
    };
  }
  if (application && isApplication(application, SAFARI_BUNDLE_ID, "Safari")) {
    return {
      applicationName: application.name,
      applicationPath: application.path,
      backend: "safari",
      bundleId: SAFARI_BUNDLE_ID,
    };
  }
  if (application && unsupportedBrowserBundleIds.has(application.bundleId ?? "")) {
    throw new Error(
      `${application.name} does not currently expose a CDP endpoint compatible with agent-browser. Choose Chrome, Chromium, Brave, Edge, or Vivaldi instead.`,
    );
  }
  const executablePath = application ? await resolveApplicationExecutable(application) : undefined;
  const browserDataDirectory =
    normalizeOptional(preferences.browserDataDirectory) ??
    (application && profile ? resolveKnownBrowserDataDirectory(application) : undefined);

  if (profile && application && !browserDataDirectory) {
    throw new Error(
      `Could not locate profile data for ${application.name}. Set Browser Data Directory in the extension preferences.`,
    );
  }
  if (browserDataDirectory) await validateBrowserDataDirectory(browserDataDirectory);
  const agentBrowserProfile =
    profile && browserDataDirectory
      ? await resolveAgentBrowserProfileName(browserDataDirectory, profile, application?.name)
      : profile;

  return {
    agentBrowserProfile,
    applicationName: application?.name,
    backend: "agent-browser",
    browserDataDirectory,
    bundleId: application?.bundleId,
    executablePath,
    profile,
  };
}

async function resolveAgentBrowserProfileName(
  browserDataDirectory: string,
  requestedProfile: string,
  applicationName?: string,
): Promise<string> {
  try {
    const localState = JSON.parse(await readFile(path.join(browserDataDirectory, "Local State"), "utf8")) as {
      profile?: { info_cache?: Record<string, { name?: string }> };
    };
    const profiles = Object.entries(localState.profile?.info_cache ?? {});
    const expected = requestedProfile.toLocaleLowerCase();

    for (const [, info] of profiles) {
      if (info.name?.toLocaleLowerCase() === expected) return info.name;
    }

    for (const [directory, info] of profiles) {
      try {
        const preferences = JSON.parse(
          await readFile(path.join(browserDataDirectory, directory, "Preferences"), "utf8"),
        ) as {
          account_info?: Array<{ email?: string; full_name?: string; given_name?: string }>;
          profile?: { name?: string };
        };
        const aliases = [
          preferences.profile?.name,
          ...(preferences.account_info ?? []).flatMap((account) => [
            account.full_name,
            account.given_name,
            account.email,
          ]),
        ];
        if (aliases.some((alias) => alias?.toLocaleLowerCase() === expected)) return info.name ?? directory;
      } catch {
        // A locked or incomplete profile cannot contribute additional display-name aliases.
      }
    }

    if (
      process.platform === "darwin" &&
      applicationName &&
      profiles.length === 1 &&
      (await getChromiumProfileMenuNames(applicationName)).some((name) => name.toLocaleLowerCase() === expected)
    ) {
      return profiles[0][1].name ?? profiles[0][0];
    }
  } catch {
    // Let agent-browser report its normal available-profile error when browser metadata cannot be read.
  }
  return requestedProfile;
}

async function getChromiumProfileMenuNames(applicationName: string): Promise<string[]> {
  try {
    const script = String.raw`
function run(argv) {
  const systemEvents = Application("System Events");
  const process = systemEvents.processes.byName(argv[0]);
  const profileMenu = process.menuBars[0].menuBarItems.byName("Profiles").menus[0];
  return JSON.stringify(profileMenu.menuItems().map((item) => item.name()).filter(Boolean));
}
`;
    const { stdout } = await execFileAsync(
      "/usr/bin/osascript",
      ["-l", "JavaScript", "-e", script, "--", applicationName],
      { encoding: "utf8", timeout: 5_000 },
    );
    return (JSON.parse(stdout.trim()) as string[]).filter((name) => name !== "Edit…" && name !== "Add Profile…");
  } catch {
    return [];
  }
}

async function resolveInstalledApplication(selected: Application | string): Promise<Application> {
  const selectedPath =
    typeof selected === "string" ? (path.isAbsolute(selected) ? selected : undefined) : selected.path;
  const selectedName =
    typeof selected === "string"
      ? selectedPath
        ? path.basename(selectedPath, path.extname(selectedPath))
        : selected
      : selected.name;
  const selectedBundleId = typeof selected === "string" ? undefined : selected.bundleId;
  const selectedWindowsAppId = typeof selected === "string" ? undefined : selected.windowsAppId;
  const applications = await getApplications();
  const match = applications.find(
    (application) =>
      (selectedBundleId && application.bundleId === selectedBundleId) ||
      (selectedWindowsAppId && application.windowsAppId === selectedWindowsAppId) ||
      (selectedPath && application.path === selectedPath) ||
      application.name.toLocaleLowerCase() === selectedName.toLocaleLowerCase(),
  );
  if (!match) throw new Error(`Could not find the selected browser application: ${selectedName}.`);
  return match;
}

function isApplication(application: Application, bundleId: string, name: string): boolean {
  const expectedName = name.toLocaleLowerCase();
  return (
    application.bundleId?.toLocaleLowerCase() === bundleId.toLocaleLowerCase() ||
    application.name.toLocaleLowerCase() === expectedName ||
    path.basename(application.path).toLocaleLowerCase() === `${expectedName}.app`
  );
}

async function resolveApplicationExecutable(application: Application): Promise<string> {
  if (process.platform !== "darwin" || !application.path.endsWith(".app")) {
    await validateExecutable(application.path, application.name);
    return application.path;
  }

  const infoPlist = path.join(application.path, "Contents", "Info.plist");
  let executableName: string;
  try {
    const { stdout } = await execFileAsync("/usr/libexec/PlistBuddy", ["-c", "Print :CFBundleExecutable", infoPlist], {
      encoding: "utf8",
    });
    executableName = stdout.trim();
  } catch {
    throw new Error(`Could not determine the browser executable inside ${application.name}.`);
  }
  const executablePath = path.join(application.path, "Contents", "MacOS", executableName);
  await validateExecutable(executablePath, application.name);
  return executablePath;
}

function resolveKnownBrowserDataDirectory(application: Application): string | undefined {
  if (process.platform === "darwin") {
    const relativePath = macOSBrowserDataPaths[application.bundleId ?? ""];
    return relativePath ? path.join(homedir(), "Library", "Application Support", relativePath) : undefined;
  }
  if (process.platform === "win32") {
    const localAppData = process.env.LOCALAPPDATA;
    const relativePath = windowsBrowserDataPaths[application.name.toLocaleLowerCase()];
    return localAppData && relativePath ? path.join(localAppData, relativePath) : undefined;
  }
  return undefined;
}

async function prepareProfileBridge(
  session: string,
  browserDataDirectory: string,
  existingFakeHome?: string,
  existingSocketDirectory?: string,
): Promise<{ fakeHome: string; socketDirectory: string }> {
  const fingerprint = createHash("sha256")
    .update(`${environment.supportPath}\0${session}\0${browserDataDirectory}`)
    .digest("hex")
    .slice(0, 12);
  const fakeHome = existingFakeHome ?? path.join(environment.supportPath, "browser-sessions", session, fingerprint);
  const socketDirectory = existingSocketDirectory ?? (await mkdtemp(path.join(shortTemporaryDirectory(), "rab-")));
  const bridgePath = getBridgePath(fakeHome);
  await mkdir(path.dirname(bridgePath), { recursive: true });
  await mkdir(socketDirectory, { recursive: true });

  // This live link only makes the selected Chromium data discoverable. For the profile name we pass,
  // agent-browser copies the selected profile to its own temporary user-data directory before launch.
  try {
    const entry = await lstat(bridgePath);
    if (!entry.isSymbolicLink()) throw new Error(`Profile bridge is not a symbolic link: ${bridgePath}`);
    const target = await readlink(bridgePath);
    if (path.resolve(path.dirname(bridgePath), target) !== path.resolve(browserDataDirectory)) {
      throw new Error(`Profile bridge points to a different browser data directory: ${bridgePath}`);
    }
  } catch (error) {
    if (!isMissingPathError(error)) throw error;
    await symlink(browserDataDirectory, bridgePath, process.platform === "win32" ? "junction" : "dir");
  }
  return { fakeHome, socketDirectory };
}

function getBridgePath(fakeHome: string): string {
  if (process.platform === "darwin") {
    return path.join(fakeHome, "Library", "Application Support", "Google", "Chrome");
  }
  if (process.platform === "win32") {
    return path.join(fakeHome, "AppData", "Local", "Google", "Chrome", "User Data");
  }
  return path.join(fakeHome, ".config", "google-chrome");
}

async function removeSessionFiles(context: BrowserSessionContext): Promise<void> {
  const sessionRoot = path.join(environment.supportPath, "browser-sessions");
  const resolved = path.resolve(context.fakeHome!);
  if (!resolved.startsWith(`${path.resolve(sessionRoot)}${path.sep}`)) {
    throw new Error("Refusing to remove a browser session directory outside the extension support path.");
  }
  await rm(resolved, { recursive: true, force: true });

  if (context.socketDirectory) {
    const socketDirectory = path.resolve(context.socketDirectory);
    const expectedParent = shortTemporaryDirectory();
    if (path.dirname(socketDirectory) !== expectedParent || !path.basename(socketDirectory).startsWith("rab-")) {
      throw new Error("Refusing to remove an unexpected Agent Browser socket directory.");
    }
    await rm(socketDirectory, { recursive: true, force: true });
  }
}

function shortTemporaryDirectory(): string {
  return process.platform === "win32" ? tmpdir() : "/tmp";
}

async function validateBrowserDataDirectory(directory: string): Promise<void> {
  try {
    const details = await stat(directory);
    if (!details.isDirectory() || !(await stat(path.join(directory, "Local State"))).isFile()) throw new Error();
  } catch {
    throw new Error(`Browser Data Directory must contain a Chromium Local State file: ${directory}`);
  }
}

async function validateExecutable(executablePath: string, applicationName: string): Promise<void> {
  try {
    if (!(await stat(executablePath)).isFile()) throw new Error();
  } catch {
    throw new Error(`Could not find the executable for ${applicationName}: ${executablePath}`);
  }
}

function sameContext(left: BrowserSessionContext, right: BrowserSessionContext): boolean {
  return (
    left.backend === right.backend &&
    left.agentBrowserProfile === right.agentBrowserProfile &&
    left.executablePath === right.executablePath &&
    left.browserDataDirectory === right.browserDataDirectory &&
    left.profile === right.profile
  );
}

function describeContext(context: BrowserSessionContext): string {
  const browser = context.applicationName || "the default browser";
  return context.profile ? `${browser} profile "${context.profile}"` : browser;
}

function normalizeOptional(value?: string): string | undefined {
  return value?.trim() || undefined;
}

function normalizeSession(value?: string): string {
  const session = value?.trim() || DEFAULT_SESSION;
  if (!/^[a-zA-Z0-9._-]{1,64}$/.test(session)) {
    throw new Error("Session names may contain only letters, numbers, dots, underscores, and hyphens.");
  }
  return session;
}

function contextKey(session: string): string {
  return `${SESSION_CONTEXT_PREFIX}${session}`;
}

function isMissingPathError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && "code" in error && error.code === "ENOENT";
}

const macOSBrowserDataPaths: Record<string, string> = {
  "com.google.Chrome": path.join("Google", "Chrome"),
  "com.google.Chrome.canary": path.join("Google", "Chrome Canary"),
  "org.chromium.Chromium": "Chromium",
  "com.brave.Browser": path.join("BraveSoftware", "Brave-Browser"),
  "com.microsoft.edgemac": "Microsoft Edge",
  "com.vivaldi.Vivaldi": "Vivaldi",
};

const windowsBrowserDataPaths: Record<string, string> = {
  "google chrome": path.join("Google", "Chrome", "User Data"),
  "google chrome canary": path.join("Google", "Chrome SxS", "User Data"),
  chromium: path.join("Chromium", "User Data"),
  "brave browser": path.join("BraveSoftware", "Brave-Browser", "User Data"),
  "microsoft edge": path.join("Microsoft", "Edge", "User Data"),
  vivaldi: path.join("Vivaldi", "User Data"),
};

const unsupportedBrowserBundleIds = new Set(["company.thebrowser.Browser"]);
