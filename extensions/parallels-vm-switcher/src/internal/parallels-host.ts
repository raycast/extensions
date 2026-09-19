import { execFile, spawn, type ExecFileException } from "node:child_process";
import { constants as fsConstants } from "node:fs";
import { access } from "node:fs/promises";
import { delimiter, join } from "node:path";
import { performance } from "node:perf_hooks";

const PARALLELS_CONSOLE_BUNDLE_ID = "com.parallels.desktop.console";
const OPEN_PATH = "/usr/bin/open";
const OSASCRIPT_PATH = "/usr/bin/osascript";
const MAX_COMMAND_OUTPUT_BYTES = 16 * 1024 * 1024;
const DEFAULT_COMMAND_TIMEOUT_MS = 15_000;
const DEFAULT_ACTIVATION_TIMEOUT_MS = 4_000;
const DEFAULT_ACTIVATION_POLL_INTERVAL_MS = 50;
const ACTIVATION_RETRY_DELAY_MS = 300;
const MAX_ACTIVATION_REQUESTS = 2;
const REQUIRED_ACTIVATION_STABLE_SAMPLES = 20;

const FALLBACK_EXECUTABLE_DIRECTORIES = [
  "/opt/homebrew/bin",
  "/usr/local/bin",
  "/Applications/Parallels Desktop.app/Contents/MacOS",
  "/usr/bin",
  "/bin",
] as const;

const FIND_FOCUS_PROXY_JXA = `ObjC.import('AppKit');
function run(argv) {
  const targetBundleId = argv[0];
  const applications = $.NSWorkspace.sharedWorkspace.runningApplications;
  const matches = [];
  for (let index = 0; index < applications.count; index++) {
    const app = applications.objectAtIndex(index);
    const bundleId = app.bundleIdentifier;
    if (bundleId && String(bundleId.js) === targetBundleId
        && Number(app.activationPolicy) === 0) {
      matches.push(Number(app.processIdentifier));
    }
  }
  return JSON.stringify(matches);
}
`;

const DIRECT_ACTIVATE_JXA = `ObjC.import('Cocoa');
ObjC.import('CoreGraphics');
ObjC.bindFunction('AXIsProcessTrusted', ['bool', []]);
ObjC.bindFunction('AXUIElementCreateApplication', ['id', ['unsigned int']]);
ObjC.bindFunction('AXUIElementCopyAttributeValue', ['int', ['id', 'id', 'id *']]);
ObjC.bindFunction('AXUIElementPerformAction', ['int', ['id', 'id']]);
ObjC.bindFunction('AXUIElementSetAttributeValue', ['int', ['id', 'id', 'id']]);
ObjC.bindFunction('_AXUIElementGetWindow', ['int', ['id', 'unsigned int *']]);
function bundleId(app) {
  if (!app || !app.bundleIdentifier) return null;
  return String(app.bundleIdentifier.js);
}
function axAttribute(element, name) {
  const value = Ref();
  const error = $.AXUIElementCopyAttributeValue(element, name, value);
  return Number(error) === 0 ? value[0].js : null;
}
function windowTitle(window) {
  const title = axAttribute(window, 'AXTitle');
  return title === null ? null : String(title);
}
function windowIdentifier(window) {
  const identifier = axAttribute(window, 'AXIdentifier');
  return identifier === null ? null : String(identifier);
}
function windowNumber(window) {
  const value = Ref();
  const error = $._AXUIElementGetWindow(window, value);
  if (Number(error) !== 0) return null;
  const number = Number(value[0]);
  return Number.isSafeInteger(number) && number > 0 ? number : null;
}
function run(argv) {
  const pid = Number(argv[0]);
  const expectedBundleID = argv[1];
  const targetName = argv[2];
  const app = $.NSRunningApplication.runningApplicationWithProcessIdentifier(pid);
  if (!app) {
    return 'missing';
  }
  const bundleID = app.bundleIdentifier;
  if (!bundleID || String(bundleID.js) !== expectedBundleID) {
    return 'wrong-process';
  }
  if (!$.AXIsProcessTrusted()) {
    return 'accessibility-denied';
  }
  const running = $.NSWorkspace.sharedWorkspace.runningApplications;
  let consolePID = null;
  for (let index = 0; index < running.count; index++) {
    const candidate = running.objectAtIndex(index);
    if (bundleId(candidate) === 'com.parallels.desktop.console'
        && Number(candidate.activationPolicy) === 0) {
      if (consolePID !== null) return 'console-ambiguous';
      consolePID = Number(candidate.processIdentifier);
    }
  }
  if (consolePID === null) return 'console-missing';
  const consoleApplication = $.AXUIElementCreateApplication(consolePID);
  // JXA invokes no-argument Objective-C selectors through property access.
  app.unhide;
  const options = 1; // NSApplicationActivateAllWindows
  const accepted = app.activateWithOptions(options);
  if (!accepted) return 'refused';

  const deadline = Date.now() + 1200;
  while (Date.now() < deadline) {
    const windows = axAttribute(consoleApplication, 'AXWindows') || [];
    const matches = windows.filter(window => windowTitle(window) === targetName);
    if (matches.length > 1) return 'window-ambiguous';
    if (matches.length === 1) {
      const targetWindow = matches[0];
      const identifier = windowIdentifier(targetWindow);
      const windowID = windowNumber(targetWindow);
      if (identifier && windowID !== null) {
        const raised = $.AXUIElementPerformAction(targetWindow, 'AXRaise');
        const madeMain = $.AXUIElementSetAttributeValue(targetWindow, 'AXMain', true);
        const focused = $.AXUIElementSetAttributeValue(targetWindow, 'AXFocused', true);
        const focusedWindow = axAttribute(consoleApplication, 'AXFocusedWindow');
        if (Number(raised) === 0 && Number(madeMain) === 0 && Number(focused) === 0
            && focusedWindow
            && windowIdentifier(focusedWindow) === identifier
            && windowNumber(focusedWindow) === windowID) {
          return JSON.stringify({status: 'targeted', windowIdentifier: identifier, windowID});
        }
      }
    }
    $.NSThread.sleepForTimeInterval(0.01);
  }
  return 'activated';
}
`;

const FOCUS_STATE_JXA = `ObjC.import('Cocoa');
ObjC.import('CoreGraphics');
ObjC.bindFunction('AXIsProcessTrusted', ['bool', []]);
ObjC.bindFunction('AXUIElementCreateApplication', ['id', ['unsigned int']]);
ObjC.bindFunction('AXUIElementCopyAttributeValue', ['int', ['id', 'id', 'id *']]);
ObjC.bindFunction('_AXUIElementGetWindow', ['int', ['id', 'unsigned int *']]);
function pid(app) {
  return app ? Number(app.processIdentifier) : null;
}
function bundleId(app) {
  if (!app || !app.bundleIdentifier) {
    return null;
  }
  return String(app.bundleIdentifier.js);
}
function axAttribute(element, name) {
  const value = Ref();
  const error = $.AXUIElementCopyAttributeValue(element, name, value);
  return Number(error) === 0 ? value[0].js : null;
}
function windowNumber(window) {
  const value = Ref();
  const error = $._AXUIElementGetWindow(window, value);
  if (Number(error) !== 0) return null;
  const number = Number(value[0]);
  return Number.isSafeInteger(number) && number > 0 ? number : null;
}
function dictionaryNumber(row, key) {
  const value = row.objectForKey(key);
  if (!value) return null;
  const number = Number(value.js);
  return Number.isFinite(number) ? number : null;
}
function windowIsOnscreen(windowID, expectedOwnerPID) {
  const optionOnScreenOnly = 1;
  const rawRows = $.CGWindowListCopyWindowInfo(optionOnScreenOnly, 0);
  if (!rawRows) return false;
  const rows = ObjC.castRefToObject(rawRows);
  for (let index = 0; index < Number(rows.count); index++) {
    const row = rows.objectAtIndex(index);
    if (dictionaryNumber(row, 'kCGWindowNumber') !== windowID) continue;
    const onscreen = row.objectForKey('kCGWindowIsOnscreen');
    return dictionaryNumber(row, 'kCGWindowOwnerPID') === expectedOwnerPID
      && dictionaryNumber(row, 'kCGWindowLayer') === 0
      && Boolean(onscreen && onscreen.js);
  }
  return false;
}
function run() {
  const workspace = $.NSWorkspace.sharedWorkspace;
  const frontmost = workspace.frontmostApplication;
  const menuBarOwner = workspace.menuBarOwningApplication;
  const accessibilityTrusted = Boolean($.AXIsProcessTrusted());
  let consoleWindowTitle = null;
  let consoleWindowIdentifier = null;
  let consoleWindowID = null;
  let consoleWindowOnscreen = false;
  if (accessibilityTrusted
      && bundleId(frontmost) === 'com.parallels.desktop.console'
      && pid(frontmost) === pid(menuBarOwner)) {
    const application = $.AXUIElementCreateApplication(pid(frontmost));
    const focusedWindow = axAttribute(application, 'AXFocusedWindow');
    if (focusedWindow) {
      const title = axAttribute(focusedWindow, 'AXTitle');
      const identifier = axAttribute(focusedWindow, 'AXIdentifier');
      consoleWindowTitle = title === null ? null : String(title);
      consoleWindowIdentifier = identifier === null ? null : String(identifier);
      consoleWindowID = windowNumber(focusedWindow);
      consoleWindowOnscreen = consoleWindowID !== null
        && windowIsOnscreen(consoleWindowID, pid(frontmost));
    }
  }
  return JSON.stringify({
    frontmostPID: pid(frontmost),
    frontmostBundleID: bundleId(frontmost),
    menuBarOwnerPID: pid(menuBarOwner),
    menuBarOwnerBundleID: bundleId(menuBarOwner),
    accessibilityTrusted,
    consoleWindowTitle,
    consoleWindowIdentifier,
    consoleWindowID,
    consoleWindowOnscreen
  });
}
`;

export type ParallelsHostErrorCode =
  | "executable-not-found"
  | "command-failed"
  | "command-timeout"
  | "invalid-vm-id"
  | "invalid-output"
  | "focus-proxy-ambiguous"
  | "activation-failed";

type ParallelsHostErrorDetails = Readonly<{
  command?: string;
  args?: readonly string[];
  exitCode?: number | string | null;
  signal?: NodeJS.Signals | null;
  stdout?: string;
  stderr?: string;
  timeoutMs?: number;
  vmID?: string;
  bundleID?: string;
  pids?: readonly number[];
  frontmostPID?: number | null;
  frontmostBundleID?: string | null;
  menuBarOwnerPID?: number | null;
  menuBarOwnerBundleID?: string | null;
  accessibilityTrusted?: boolean;
  consoleWindowTitle?: string | null;
  consoleWindowIdentifier?: string | null;
  consoleWindowID?: number | null;
  consoleWindowOnscreen?: boolean;
  cause?: unknown;
}>;

export class ParallelsHostError extends Error {
  readonly code: ParallelsHostErrorCode;
  readonly details: ParallelsHostErrorDetails;

  constructor(code: ParallelsHostErrorCode, message: string, details: ParallelsHostErrorDetails = {}) {
    super(message);
    this.name = "ParallelsHostError";
    this.code = code;
    this.details = details;
  }
}

export type ActivationTarget = Readonly<{
  pid: number;
  vmID: string;
  vmName: string;
}>;

export interface ParallelsHost {
  registryJSON(): Promise<string>;
  focusProxyPID(vmID: string): Promise<number | null>;
  openVMHome(home: string): Promise<void>;
  activate(target: ActivationTarget): Promise<void>;
  now(): number;
  sleep(ms: number): Promise<void>;
}

export type MacOSParallelsHostOptions = Readonly<{
  prlctlPath?: string;
  openPath?: string;
  osascriptPath?: string;
  searchPath?: string;
  commandTimeoutMs?: number;
  activationTimeoutMs?: number;
  activationPollIntervalMs?: number;
}>;

type CommandResult = Readonly<{
  stdout: string;
  stderr: string;
}>;

type FocusState = Readonly<{
  frontmostPID: number | null;
  frontmostBundleID: string | null;
  menuBarOwnerPID: number | null;
  menuBarOwnerBundleID: string | null;
  accessibilityTrusted: boolean;
  consoleWindowTitle: string | null;
  consoleWindowIdentifier: string | null;
  consoleWindowID: number | null;
  consoleWindowOnscreen: boolean;
}>;

type ActivationEvidence = Readonly<{
  consoleWindowIdentifier: string;
  consoleWindowID: number;
}>;

function bundleOwnsFocus(state: FocusState, bundleID: string): boolean {
  return (
    state.frontmostPID === state.menuBarOwnerPID &&
    state.frontmostBundleID === bundleID &&
    state.menuBarOwnerBundleID === bundleID
  );
}

function targetFocusKey(
  state: FocusState,
  target: ActivationTarget,
  evidence: ActivationEvidence | null,
): string | null {
  if (
    evidence !== null &&
    bundleOwnsFocus(state, PARALLELS_CONSOLE_BUNDLE_ID) &&
    state.consoleWindowTitle === target.vmName &&
    state.consoleWindowIdentifier === evidence.consoleWindowIdentifier &&
    state.consoleWindowID === evidence.consoleWindowID &&
    state.consoleWindowOnscreen
  ) {
    return `console:${evidence.consoleWindowID}:${evidence.consoleWindowIdentifier}`;
  }
  return null;
}

function commandFailure(
  command: string,
  args: readonly string[],
  error: ExecFileException,
  stdout: string,
  stderr: string,
  timeoutMs: number,
): ParallelsHostError {
  if (error.killed) {
    return new ParallelsHostError("command-timeout", `Command timed out after ${timeoutMs}ms: ${command}`, {
      command,
      args,
      signal: error.signal,
      stdout,
      stderr,
      timeoutMs,
      cause: error,
    });
  }
  const detail = stderr.trim() || stdout.trim();
  const suffix = detail ? `: ${detail}` : "";
  const code = error.code === "ENOENT" ? "executable-not-found" : "command-failed";
  return new ParallelsHostError(code, `Command failed: ${command}${suffix}`, {
    command,
    args,
    exitCode: error.code,
    signal: error.signal,
    stdout,
    stderr,
    cause: error,
  });
}

function runFile(command: string, args: readonly string[], timeoutMs: number): Promise<CommandResult> {
  return new Promise((resolve, reject) => {
    execFile(
      command,
      [...args],
      {
        encoding: "utf8",
        maxBuffer: MAX_COMMAND_OUTPUT_BYTES,
        shell: false,
        timeout: timeoutMs,
        killSignal: "SIGKILL",
      },
      (error, stdout, stderr) => {
        if (error) {
          reject(commandFailure(command, args, error, stdout, stderr, timeoutMs));
          return;
        }
        resolve({ stdout, stderr });
      },
    );
  });
}

function runFileWithInput(
  command: string,
  args: readonly string[],
  input: string,
  timeoutMs: number,
): Promise<CommandResult> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, [...args], {
      shell: false,
      stdio: ["pipe", "pipe", "pipe"],
    });
    const stdoutChunks: Buffer[] = [];
    const stderrChunks: Buffer[] = [];
    let settled = false;
    let timedOut = false;

    const timeout = setTimeout(() => {
      timedOut = true;
      child.kill("SIGKILL");
    }, timeoutMs);

    const rejectOnce = (error: ParallelsHostError) => {
      if (!settled) {
        settled = true;
        clearTimeout(timeout);
        reject(error);
      }
    };

    child.stdout.on("data", (chunk: Buffer) => stdoutChunks.push(chunk));
    child.stderr.on("data", (chunk: Buffer) => stderrChunks.push(chunk));
    child.on("error", (error: NodeJS.ErrnoException) => {
      rejectOnce(
        new ParallelsHostError(
          error.code === "ENOENT" ? "executable-not-found" : "command-failed",
          `Unable to execute ${command}: ${error.message}`,
          { command, args, cause: error },
        ),
      );
    });
    child.stdin.on("error", (error: NodeJS.ErrnoException) => {
      if (timedOut) return;
      rejectOnce(
        new ParallelsHostError("command-failed", `Unable to write input to ${command}: ${error.message}`, {
          command,
          args,
          cause: error,
        }),
      );
    });
    child.on("close", (exitCode, signal) => {
      if (settled) return;

      const stdout = Buffer.concat(stdoutChunks).toString("utf8");
      const stderr = Buffer.concat(stderrChunks).toString("utf8");
      if (timedOut) {
        rejectOnce(
          new ParallelsHostError("command-timeout", `Command timed out after ${timeoutMs}ms: ${command}`, {
            command,
            args,
            exitCode,
            signal,
            stdout,
            stderr,
            timeoutMs,
          }),
        );
        return;
      }
      if (exitCode !== 0) {
        const detail = stderr.trim() || stdout.trim();
        const suffix = detail ? `: ${detail}` : "";
        rejectOnce(
          new ParallelsHostError("command-failed", `Command failed: ${command}${suffix}`, {
            command,
            args,
            exitCode,
            signal,
            stdout,
            stderr,
          }),
        );
        return;
      }

      settled = true;
      clearTimeout(timeout);
      resolve({ stdout, stderr });
    });

    child.stdin.end(input, "utf8");
  });
}

async function isExecutable(path: string): Promise<boolean> {
  try {
    await access(path, fsConstants.X_OK);
    return true;
  } catch {
    return false;
  }
}

async function findExecutable(name: "prlctl", searchPath?: string): Promise<string> {
  const configuredDirectories = (searchPath ?? process.env.PATH ?? "")
    .split(delimiter)
    // An empty PATH entry means the current directory. Never search it for a
    // privileged desktop-management executable.
    .filter((directory) => directory.length > 0);
  const directories = [...new Set([...configuredDirectories, ...FALLBACK_EXECUTABLE_DIRECTORIES])];

  for (const directory of directories) {
    const candidate = join(directory, name);
    if (await isExecutable(candidate)) return candidate;
  }

  throw new ParallelsHostError(
    "executable-not-found",
    `Unable to find ${name}; install Parallels Desktop and make ${name} executable`,
    { command: name },
  );
}

function normalizedVMID(vmID: string): string {
  return vmID.trim().replace(/^\{/, "").replace(/\}$/, "").toLowerCase();
}

function dockHelperBundleID(vmID: string): string {
  const normalized = normalizedVMID(vmID);
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(normalized)) {
    throw new ParallelsHostError("invalid-vm-id", `Invalid Parallels VM UUID: ${vmID}`, { vmID });
  }
  return `com.parallels.winapp.${normalized.replaceAll("-", "")}.VM`;
}

function positiveDuration(value: number | undefined, fallback: number, name: string): number {
  const resolved = value ?? fallback;
  if (!Number.isFinite(resolved) || resolved <= 0) {
    throw new RangeError(`${name} must be a positive finite number`);
  }
  return resolved;
}

function parseFocusState(stdout: string, pid: number): FocusState {
  let rawState: unknown;
  try {
    rawState = JSON.parse(stdout.trim());
  } catch (cause) {
    throw new ParallelsHostError("invalid-output", `Unable to parse macOS focus state: ${stdout.trim() || "<empty>"}`, {
      pids: [pid],
      stdout,
      cause,
    });
  }

  const validPID = (value: unknown): value is number | null =>
    value === null || (Number.isSafeInteger(value) && Number(value) > 0);
  const validBundleID = (value: unknown): value is string | null =>
    value === null || (typeof value === "string" && value.length > 0);
  if (
    typeof rawState !== "object" ||
    rawState === null ||
    !("frontmostPID" in rawState) ||
    !("frontmostBundleID" in rawState) ||
    !("menuBarOwnerPID" in rawState) ||
    !("menuBarOwnerBundleID" in rawState) ||
    !("accessibilityTrusted" in rawState) ||
    !("consoleWindowTitle" in rawState) ||
    !("consoleWindowIdentifier" in rawState) ||
    !("consoleWindowID" in rawState) ||
    !("consoleWindowOnscreen" in rawState) ||
    !validPID(rawState.frontmostPID) ||
    !validBundleID(rawState.frontmostBundleID) ||
    !validPID(rawState.menuBarOwnerPID) ||
    !validBundleID(rawState.menuBarOwnerBundleID) ||
    typeof rawState.accessibilityTrusted !== "boolean" ||
    !validBundleID(rawState.consoleWindowTitle) ||
    !validBundleID(rawState.consoleWindowIdentifier) ||
    !validPID(rawState.consoleWindowID) ||
    typeof rawState.consoleWindowOnscreen !== "boolean"
  ) {
    throw new ParallelsHostError("invalid-output", "macOS returned an invalid focus state", {
      pids: [pid],
      stdout,
    });
  }

  return {
    frontmostPID: rawState.frontmostPID,
    frontmostBundleID: rawState.frontmostBundleID,
    menuBarOwnerPID: rawState.menuBarOwnerPID,
    menuBarOwnerBundleID: rawState.menuBarOwnerBundleID,
    accessibilityTrusted: rawState.accessibilityTrusted,
    consoleWindowTitle: rawState.consoleWindowTitle,
    consoleWindowIdentifier: rawState.consoleWindowIdentifier,
    consoleWindowID: rawState.consoleWindowID,
    consoleWindowOnscreen: rawState.consoleWindowOnscreen,
  };
}

export class MacOSParallelsHost implements ParallelsHost {
  readonly #options: MacOSParallelsHostOptions;
  readonly #commandTimeoutMs: number;
  readonly #activationTimeoutMs: number;
  readonly #activationPollIntervalMs: number;
  #prlctlPath: Promise<string> | undefined;

  constructor(options: MacOSParallelsHostOptions = {}) {
    this.#options = options;
    this.#commandTimeoutMs = positiveDuration(options.commandTimeoutMs, DEFAULT_COMMAND_TIMEOUT_MS, "commandTimeoutMs");
    this.#activationTimeoutMs = positiveDuration(
      options.activationTimeoutMs,
      DEFAULT_ACTIVATION_TIMEOUT_MS,
      "activationTimeoutMs",
    );
    this.#activationPollIntervalMs = positiveDuration(
      options.activationPollIntervalMs,
      DEFAULT_ACTIVATION_POLL_INTERVAL_MS,
      "activationPollIntervalMs",
    );
  }

  async registryJSON(): Promise<string> {
    const result = await runFile(
      await this.#getPrlctlPath(),
      ["list", "--all", "--json", "--info"],
      this.#commandTimeoutMs,
    );
    return result.stdout;
  }

  async focusProxyPID(vmID: string): Promise<number | null> {
    const bundleID = dockHelperBundleID(vmID);
    const { stdout } = await runFileWithInput(
      this.#options.osascriptPath ?? OSASCRIPT_PATH,
      ["-l", "JavaScript", "-", bundleID],
      FIND_FOCUS_PROXY_JXA,
      this.#commandTimeoutMs,
    );

    let rawMatches: unknown;
    try {
      rawMatches = JSON.parse(stdout.trim());
    } catch (cause) {
      throw new ParallelsHostError(
        "invalid-output",
        `Unable to parse Parallels Dock Helper result: ${stdout.trim() || "<empty>"}`,
        { vmID, bundleID, stdout, cause },
      );
    }

    if (!Array.isArray(rawMatches) || rawMatches.some((pid) => !Number.isSafeInteger(pid) || Number(pid) <= 0)) {
      throw new ParallelsHostError(
        "invalid-output",
        "Parallels Dock Helper query returned invalid process identifiers",
        { vmID, bundleID, stdout },
      );
    }

    const pids = rawMatches as number[];
    if (pids.length > 1) {
      throw new ParallelsHostError(
        "focus-proxy-ambiguous",
        `Multiple regular Parallels Dock Helpers matched VM ${normalizedVMID(vmID)}`,
        { vmID: normalizedVMID(vmID), bundleID, pids },
      );
    }
    return pids[0] ?? null;
  }

  async openVMHome(home: string): Promise<void> {
    await runFile(
      this.#options.openPath ?? OPEN_PATH,
      ["-g", "-b", PARALLELS_CONSOLE_BUNDLE_ID, home],
      this.#commandTimeoutMs,
    );
  }

  async activate(target: ActivationTarget): Promise<void> {
    if (!Number.isSafeInteger(target.pid) || target.pid <= 0) {
      throw new ParallelsHostError("activation-failed", `Invalid process identifier: ${target.pid}`, {
        pids: [target.pid],
      });
    }
    const vmName = target.vmName.trim();
    if (!vmName) {
      throw new ParallelsHostError("activation-failed", "Virtual machine name is empty", {
        vmID: target.vmID,
        pids: [target.pid],
      });
    }
    const normalizedTarget = { ...target, vmName };
    const expectedBundleID = dockHelperBundleID(target.vmID);

    const startedAt = this.now();
    let activationEvidence = await this.#requestDirectActivation(
      normalizedTarget,
      expectedBundleID,
      this.#commandTimeoutMs,
    );
    const deadline = this.now() + this.#activationTimeoutMs;
    const retryAt = startedAt + ACTIVATION_RETRY_DELAY_MS;
    let activationRequests = 1;
    let stableSamples = 0;
    let stableFocusKey: string | null = null;
    let lastState: FocusState = {
      frontmostPID: null,
      frontmostBundleID: null,
      menuBarOwnerPID: null,
      menuBarOwnerBundleID: null,
      accessibilityTrusted: false,
      consoleWindowTitle: null,
      consoleWindowIdentifier: null,
      consoleWindowID: null,
      consoleWindowOnscreen: false,
    };
    while (this.now() < deadline) {
      lastState = await this.#focusState(target.pid, this.#commandTimeoutMs);
      const focusKey = targetFocusKey(lastState, normalizedTarget, activationEvidence);
      if (focusKey) {
        stableSamples = focusKey === stableFocusKey ? stableSamples + 1 : 1;
        stableFocusKey = focusKey;
        if (stableSamples >= REQUIRED_ACTIVATION_STABLE_SAMPLES) return;
      } else {
        stableSamples = 0;
        stableFocusKey = null;
        if (activationRequests < MAX_ACTIVATION_REQUESTS && this.now() >= retryAt) {
          const retriedEvidence = await this.#requestDirectActivation(
            normalizedTarget,
            expectedBundleID,
            this.#commandTimeoutMs,
          );
          activationEvidence = retriedEvidence ?? activationEvidence;
          activationRequests += 1;
        }
      }

      const remaining = deadline - this.now();
      if (remaining > 0) await this.sleep(Math.min(this.#activationPollIntervalMs, remaining));
    }

    throw new ParallelsHostError(
      "activation-failed",
      lastState.accessibilityTrusted
        ? "Activation was accepted, but the target Parallels VM window never became stably onscreen and frontmost"
        : "Raycast needs Accessibility permission to verify the target Parallels VM window",
      {
        vmID: normalizedTarget.vmID,
        pids: [normalizedTarget.pid],
        frontmostPID: lastState.frontmostPID,
        frontmostBundleID: lastState.frontmostBundleID,
        menuBarOwnerPID: lastState.menuBarOwnerPID,
        menuBarOwnerBundleID: lastState.menuBarOwnerBundleID,
        accessibilityTrusted: lastState.accessibilityTrusted,
        consoleWindowTitle: lastState.consoleWindowTitle,
        consoleWindowIdentifier: lastState.consoleWindowIdentifier,
        consoleWindowID: lastState.consoleWindowID,
        consoleWindowOnscreen: lastState.consoleWindowOnscreen,
        timeoutMs: this.#activationTimeoutMs,
      },
    );
  }

  async #requestDirectActivation(
    target: ActivationTarget,
    expectedBundleID: string,
    timeoutMs: number,
  ): Promise<ActivationEvidence | null> {
    const { stdout } = await runFileWithInput(
      this.#options.osascriptPath ?? OSASCRIPT_PATH,
      ["-l", "JavaScript", "-", String(target.pid), expectedBundleID, target.vmName],
      DIRECT_ACTIVATE_JXA,
      timeoutMs,
    );
    const result = stdout.trim();
    if (result === "activated") return null;
    try {
      const rawEvidence: unknown = JSON.parse(result);
      if (
        typeof rawEvidence === "object" &&
        rawEvidence !== null &&
        "status" in rawEvidence &&
        rawEvidence.status === "targeted" &&
        "windowIdentifier" in rawEvidence &&
        typeof rawEvidence.windowIdentifier === "string" &&
        rawEvidence.windowIdentifier.length > 0 &&
        "windowID" in rawEvidence &&
        Number.isSafeInteger(rawEvidence.windowID) &&
        Number(rawEvidence.windowID) > 0
      ) {
        return {
          consoleWindowIdentifier: rawEvidence.windowIdentifier,
          consoleWindowID: Number(rawEvidence.windowID),
        };
      }
    } catch {
      // Plain string statuses are mapped below.
    }
    const reason =
      result === "missing"
        ? "process disappeared"
        : result === "wrong-process"
          ? "process no longer belongs to the target VM"
          : result === "accessibility-denied"
            ? "Raycast needs Accessibility permission"
            : result === "window-ambiguous"
              ? "more than one Parallels window has the target VM name"
              : result === "console-missing" || result === "console-ambiguous"
                ? "Parallels Console could not be identified"
                : "AppKit refused activation";
    throw new ParallelsHostError("activation-failed", `Unable to activate Parallels VM: ${reason}`, {
      vmID: target.vmID,
      pids: [target.pid],
      stdout,
    });
  }

  async #focusState(pid: number, timeoutMs: number): Promise<FocusState> {
    const { stdout } = await runFileWithInput(
      this.#options.osascriptPath ?? OSASCRIPT_PATH,
      ["-l", "JavaScript", "-", String(pid)],
      FOCUS_STATE_JXA,
      timeoutMs,
    );
    return parseFocusState(stdout, pid);
  }

  now(): number {
    return performance.now();
  }

  sleep(ms: number): Promise<void> {
    if (!Number.isFinite(ms) || ms < 0) {
      return Promise.reject(new RangeError(`Sleep duration must be a non-negative finite number: ${ms}`));
    }
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  #getPrlctlPath(): Promise<string> {
    this.#prlctlPath ??= this.#options.prlctlPath
      ? Promise.resolve(this.#options.prlctlPath)
      : findExecutable("prlctl", this.#options.searchPath);
    return this.#prlctlPath;
  }
}

export function createMacOSParallelsHost(options: MacOSParallelsHostOptions = {}): ParallelsHost {
  return new MacOSParallelsHost(options);
}
