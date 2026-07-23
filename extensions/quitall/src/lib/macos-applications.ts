import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { ApplicationIdentity, RunningApplication } from "../types";

const execFileAsync = promisify(execFile);

const LIST_RUNNING_APPLICATIONS_SCRIPT = String.raw`
ObjC.import("AppKit");

function unwrap(value) {
  if (value === null || value === undefined) {
    return null;
  }

  return ObjC.unwrap(value);
}

function run() {
  const workspace = $.NSWorkspace.sharedWorkspace;
  const applications = workspace.runningApplications;
  const result = [];

  for (let index = 0; index < Number(applications.count); index += 1) {
    const application = applications.objectAtIndex(index);
    const bundleId = unwrap(application.bundleIdentifier);
    const name = unwrap(application.localizedName);

    if (!bundleId || !name) {
      continue;
    }

    const bundleURL = application.bundleURL;
    const path = bundleURL ? unwrap(bundleURL.path) : null;
    const executableURL = application.executableURL;
    const executablePath = executableURL ? unwrap(executableURL.path) : null;

    result.push({
      activationPolicy: Number(application.activationPolicy),
      bundleId: String(bundleId),
      executablePath: executablePath ? String(executablePath) : null,
      name: String(name),
      path: path ? String(path) : null,
      pid: Number(application.processIdentifier),
    });
  }

  return JSON.stringify(result);
}
`;

const APPLY_APPLICATION_ACTION_SCRIPT = String.raw`
ObjC.import("AppKit");

function unwrap(value) {
  if (value === null || value === undefined) {
    return null;
  }

  return ObjC.unwrap(value);
}

function run(argv) {
  const targets = JSON.parse(argv[0]);
  const action = argv[1];
  const results = [];

  for (const target of targets) {
    const application = $.NSRunningApplication.runningApplicationWithProcessIdentifier(Number(target.pid));

    if (!application || (typeof application.isNil === "function" && application.isNil())) {
      results.push({ ...target, accepted: true, status: "already-terminated" });
      continue;
    }

    const actualBundleId = unwrap(application.bundleIdentifier);

    if (String(actualBundleId || "") !== String(target.bundleId)) {
      results.push({ ...target, accepted: false, status: "identity-mismatch" });
      continue;
    }

    const accepted = action === "force"
      ? Boolean(application.forceTerminate)
      : Boolean(application.terminate);

    results.push({
      ...target,
      accepted,
      status: accepted ? "requested" : "rejected",
    });
  }

  return JSON.stringify(results);
}
`;

interface BridgeApplication extends RunningApplication {
  activationPolicy: number;
}

export interface ApplicationActionResult extends ApplicationIdentity {
  accepted: boolean;
  status: "already-terminated" | "identity-mismatch" | "rejected" | "requested";
}

export async function listRunningApplications(): Promise<RunningApplication[]> {
  const output = await runJxa(LIST_RUNNING_APPLICATIONS_SCRIPT);
  const parsed: unknown = JSON.parse(output);

  if (!Array.isArray(parsed)) {
    throw new Error("macOS returned an invalid running-application list");
  }

  return parsed.filter(isBridgeApplication).map(({ bundleId, executablePath, name, path, pid }) => ({
    bundleId,
    executablePath: executablePath ?? undefined,
    name,
    path: path ?? undefined,
    pid,
  }));
}

export async function listRunningDockApplications(): Promise<RunningApplication[]> {
  const output = await runJxa(LIST_RUNNING_APPLICATIONS_SCRIPT);
  const parsed: unknown = JSON.parse(output);

  if (!Array.isArray(parsed)) {
    throw new Error("macOS returned an invalid running-application list");
  }

  return parsed
    .filter(isBridgeApplication)
    .filter((application) => application.activationPolicy === 0)
    .map(({ bundleId, executablePath, name, path, pid }) => ({
      bundleId,
      executablePath: executablePath ?? undefined,
      name,
      path: path ?? undefined,
      pid,
    }));
}

export async function requestNormalQuit(applications: ApplicationIdentity[]): Promise<ApplicationActionResult[]> {
  return applyApplicationAction(applications, "terminate");
}

export async function requestForceQuit(applications: ApplicationIdentity[]): Promise<ApplicationActionResult[]> {
  return applyApplicationAction(applications, "force");
}

async function applyApplicationAction(
  applications: ApplicationIdentity[],
  action: "force" | "terminate",
): Promise<ApplicationActionResult[]> {
  if (applications.length === 0) {
    return [];
  }

  const output = await runJxa(APPLY_APPLICATION_ACTION_SCRIPT, [JSON.stringify(applications), action]);
  const parsed: unknown = JSON.parse(output);

  if (!Array.isArray(parsed) || !parsed.every(isApplicationActionResult)) {
    throw new Error(`macOS returned an invalid ${action} result`);
  }

  return parsed;
}

async function runJxa(script: string, arguments_: string[] = []): Promise<string> {
  const { stdout } = await execFileAsync("/usr/bin/osascript", ["-l", "JavaScript", "-e", script, ...arguments_], {
    encoding: "utf8",
    maxBuffer: 2 * 1024 * 1024,
    timeout: 15_000,
  });

  return stdout.trim();
}

function isBridgeApplication(value: unknown): value is BridgeApplication {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.activationPolicy === "number" &&
    typeof value.bundleId === "string" &&
    (typeof value.executablePath === "string" || value.executablePath === null || value.executablePath === undefined) &&
    typeof value.name === "string" &&
    (typeof value.path === "string" || value.path === null || value.path === undefined) &&
    typeof value.pid === "number"
  );
}

function isApplicationActionResult(value: unknown): value is ApplicationActionResult {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.accepted === "boolean" &&
    typeof value.bundleId === "string" &&
    typeof value.pid === "number" &&
    (value.status === "already-terminated" ||
      value.status === "identity-mismatch" ||
      value.status === "rejected" ||
      value.status === "requested")
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
