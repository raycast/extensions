import { environment } from "@raycast/api";
import { spawn } from "child_process";
import fs from "fs/promises";
import path from "path";
import { createId } from "./id";
import {
  deploymentLogFilePath,
  deploymentPayloadFilePath,
  saveDeployment,
  saveDeploymentPayload,
} from "./storage";
import { Deployment, FastlaneLane, FastlaneProject } from "./types";

const detachedRunnerPath = path.join(
  environment.supportPath,
  "detached-fastlane-runner.cjs",
);

const detachedRunnerScript = String.raw`const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");

function parseLine(line) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) return undefined;
  const normalized = trimmed.startsWith("export ") ? trimmed.slice(7).trim() : trimmed;
  const index = normalized.indexOf("=");
  if (index === -1) return undefined;
  const key = normalized.slice(0, index).trim();
  const raw = normalized.slice(index + 1).trim();
  const quoted = (raw.startsWith('"') && raw.endsWith('"')) || (raw.startsWith("'") && raw.endsWith("'"));
  const value = quoted ? raw.slice(1, -1) : raw;
  return { key, value: value.replace(/\\n/g, "\n") };
}

function loadEnvFile(filePath) {
  if (!filePath) return {};
  const expanded = filePath.replace(/^~(?=$|\/)/, process.env.HOME || "");
  if (!fs.existsSync(expanded)) throw new Error("Env file not found: " + expanded);
  const env = {};
  const contents = fs.readFileSync(expanded, "utf8");
  for (const line of contents.split(/\r?\n/)) {
    const parsed = parseLine(line);
    if (parsed) env[parsed.key] = parsed.value;
  }
  for (const [key, value] of Object.entries(env)) {
    if (!key.endsWith("_PATH")) continue;
    const target = key.slice(0, -5);
    if (env[target]) continue;
    const resolved = path.resolve(path.dirname(expanded), value.replace(/^~(?=$|\/)/, process.env.HOME || ""));
    if (fs.existsSync(resolved) && fs.statSync(resolved).isFile()) env[target] = fs.readFileSync(resolved, "utf8");
  }
  return env;
}

function parseProgress(line) {
  const explicit = line.match(/::raycast-stage\s+name=([^\s]+)\s+percent=(\d+)/);
  if (explicit) return { stage: explicit[1].replace(/-/g, " "), progress: Number(explicit[2]) };
  const value = line.toLowerCase();
  const warning = value.includes("warning") ? line : undefined;
  const error = value.includes("error") || value.includes("exception") || value.includes("failed") ? line : undefined;
  if (value.includes("match") || value.includes("provisioning profile") || value.includes("certificate")) return { stage: "Code Signing", progress: 25, warning, error };
  if (value.includes("increment_build_number") || value.includes("increment_version_number")) return { stage: "Versioning", progress: 35, warning, error };
  if (value.includes("gradle") || value.includes("xcodebuild") || value.includes("build_app") || value.includes("gym")) return { stage: "Building", progress: 65, warning, error };
  if (value.includes("archive") || value.includes("exportarchive") || value.includes("ipa") || value.includes("aab") || value.includes("apk")) return { stage: "Packaging", progress: 80, warning, error };
  if (value.includes("upload_to_testflight") || value.includes("pilot") || value.includes("supply") || value.includes("upload_to_play_store") || value.includes("uploading")) return { stage: "Uploading", progress: 92, warning, error };
  if (value.includes("successfully uploaded") || value.includes("fastlane.tools finished successfully") || value.includes("success")) return { stage: "Finished", progress: 100, warning, error };
  if (warning || error) return { stage: "Running", progress: 10, warning, error };
  return undefined;
}

const payloadPath = process.argv[2];
const payload = JSON.parse(fs.readFileSync(payloadPath, "utf8"));
const deployment = payload.deployment;
let child;
let finished = false;

function writeStatus() {
  const { logs, ...persisted } = deployment;
  fs.writeFileSync(payload.statusFilePath, JSON.stringify(persisted, null, 2));
}

function append(chunk) {
  const text = chunk.toString();
  fs.appendFileSync(deployment.logFilePath, text);
  for (const line of text.split(/\r?\n/)) {
    if (!line.trim()) continue;
    const update = parseProgress(line);
    if (!update) continue;
    deployment.stage = update.stage;
    deployment.progress = Math.max(deployment.progress, update.progress);
    if (update.warning) deployment.warnings.push(update.warning);
    if (update.error) deployment.errors.push(update.error);
  }
  deployment.warnings = deployment.warnings.slice(-100);
  deployment.errors = deployment.errors.slice(-100);
  writeStatus();
}

function finish(status, code, signal) {
  if (finished) return;
  finished = true;
  deployment.exitCode = code === null ? undefined : code;
  deployment.signal = signal || undefined;
  deployment.finishedAt = new Date().toISOString();
  deployment.status = status;
  deployment.stage = status === "success" ? "Finished" : status === "cancelled" ? "Cancelled" : "Failed";
  deployment.progress = status === "success" ? 100 : deployment.progress;
  writeStatus();
}

function fail(error) {
  deployment.status = "failed";
  deployment.stage = "Failed";
  deployment.errors.push(error.message || String(error));
  deployment.finishedAt = new Date().toISOString();
  writeStatus();
}

try {
  fs.mkdirSync(path.dirname(deployment.logFilePath), { recursive: true });
  fs.writeFileSync(deployment.logFilePath, "");
  const env = { ...process.env, ...loadEnvFile(payload.project.envFilePath) };
  child = spawn(payload.project.shell, ["-lc", payload.lane.command], {
    cwd: payload.project.workingDirectory,
    env,
    detached: true,
  });
  deployment.pid = process.pid;
  writeStatus();
  child.stdout.on("data", append);
  child.stderr.on("data", append);
  child.on("error", fail);
  child.on("close", (code, signal) => finish(signal ? "cancelled" : code === 0 ? "success" : "failed", code, signal));
} catch (error) {
  fail(error);
}

process.on("SIGTERM", () => {
  if (child && child.pid) {
    try {
      process.kill(-child.pid, "SIGTERM");
    } catch {
      if (!child.killed) child.kill("SIGTERM");
    }
  }
  finish("cancelled", undefined, "SIGTERM");
  setTimeout(() => {
    process.exit(143);
  }, 3000).unref();
});
`;

async function writeDetachedRunner() {
  await fs.mkdir(environment.supportPath, { recursive: true });
  await fs.writeFile(detachedRunnerPath, detachedRunnerScript, { mode: 0o700 });
}

export async function startDeployment(
  project: FastlaneProject,
  lane: FastlaneLane,
) {
  const now = new Date().toISOString();
  const deployment: Deployment = {
    id: createId("deployment"),
    projectId: project.id,
    projectName: project.name,
    laneId: lane.id,
    laneName: lane.name,
    platform: lane.platform,
    command: lane.command,
    status: "running",
    stage: "Queued",
    progress: 2,
    startedAt: now,
    logFilePath: "",
    logs: [],
    warnings: [],
    errors: [],
  };
  deployment.logFilePath = deploymentLogFilePath(deployment.id);

  await writeDetachedRunner();
  await saveDeployment(deployment);
  await saveDeploymentPayload(deployment.id, {
    project,
    lane,
    deployment,
    statusFilePath: path.join(
      path.dirname(deploymentPayloadFilePath(deployment.id)),
      "status.json",
    ),
  });

  const child = spawn(
    process.execPath,
    [detachedRunnerPath, deploymentPayloadFilePath(deployment.id)],
    {
      detached: true,
      stdio: "ignore",
    },
  );
  child.unref();
  deployment.pid = child.pid;
  deployment.stage = "Starting";
  deployment.progress = 5;
  await saveDeployment(deployment);

  return deployment;
}

export function cancelDeployment(deployment: Deployment) {
  if (!deployment.pid) return false;
  try {
    process.kill(deployment.pid, "SIGTERM");
    return true;
  } catch {
    return false;
  }
}
