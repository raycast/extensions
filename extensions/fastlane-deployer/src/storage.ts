import { environment, LocalStorage } from "@raycast/api";
import fs from "fs/promises";
import path from "path";
import { Deployment, FastlaneProject } from "./types";

const projectsKey = "fastlane-projects";
const deploymentLimit = 30;
const deploymentsDirectory = path.join(environment.supportPath, "deployments");

async function getJson<T>(key: string, fallback: T): Promise<T> {
  const value = await LocalStorage.getItem<string>(key);
  if (!value) return fallback;
  return JSON.parse(value) as T;
}

async function setJson<T>(key: string, value: T) {
  await LocalStorage.setItem(key, JSON.stringify(value));
}

export async function getProjects() {
  return getJson<FastlaneProject[]>(projectsKey, []);
}

export async function saveProject(project: FastlaneProject) {
  const projects = await getProjects();
  const next = projects.some((item) => item.id === project.id)
    ? projects.map((item) => (item.id === project.id ? project : item))
    : [...projects, project];
  await setJson(projectsKey, next);
}

export async function deleteProject(id: string) {
  const projects = await getProjects();
  await setJson(
    projectsKey,
    projects.filter((project) => project.id !== id),
  );
}

async function ensureDeploymentsDirectory() {
  await fs.mkdir(deploymentsDirectory, { recursive: true });
}

function deploymentDirectory(id: string) {
  return path.join(deploymentsDirectory, id);
}

function statusFilePath(id: string) {
  return path.join(deploymentDirectory(id), "status.json");
}

export function deploymentLogFilePath(id: string) {
  return path.join(deploymentDirectory(id), "fastlane.log");
}

export function deploymentPayloadFilePath(id: string) {
  return path.join(deploymentDirectory(id), "payload.json");
}

async function readLogs(filePath?: string) {
  if (!filePath) return [];
  try {
    const contents = await fs.readFile(filePath, "utf8");
    return contents.split(/\r?\n/).filter(Boolean).slice(-400);
  } catch {
    return [];
  }
}

function isProcessAlive(pid?: number) {
  if (!pid) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

async function markStaleIfNeeded(deployment: Deployment) {
  if (deployment.status !== "running" || isProcessAlive(deployment.pid)) {
    return deployment;
  }

  const stale = {
    ...deployment,
    status: "failed" as const,
    stage: "Stale",
    finishedAt: deployment.finishedAt || new Date().toISOString(),
    errors: [
      ...deployment.errors,
      "Runner process is no longer active; deployment marked stale.",
    ],
  };
  const persisted = {
    ...stale,
    logs: undefined,
  };
  await fs.writeFile(
    statusFilePath(stale.id),
    JSON.stringify(persisted, null, 2),
  );
  return stale;
}

async function pruneDeploymentDirectories(deployments: Deployment[]) {
  const keep = new Set(
    deployments.slice(0, deploymentLimit).map((item) => item.id),
  );
  for (const deployment of deployments.slice(deploymentLimit)) {
    if (keep.has(deployment.id)) continue;
    await fs.rm(deploymentDirectory(deployment.id), {
      recursive: true,
      force: true,
    });
  }
}

export async function getDeployments() {
  try {
    await ensureDeploymentsDirectory();
    const ids = await fs.readdir(deploymentsDirectory);
    const deployments = await Promise.all(
      ids.map(async (id) => {
        try {
          const contents = await fs.readFile(statusFilePath(id), "utf8");
          const deployment = JSON.parse(contents) as Deployment;
          return await markStaleIfNeeded({
            ...deployment,
            logs: await readLogs(deployment.logFilePath),
          });
        } catch {
          return undefined;
        }
      }),
    );

    const sorted = deployments
      .filter((deployment): deployment is Deployment => Boolean(deployment))
      .sort(
        (a, b) =>
          new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime(),
      );

    await pruneDeploymentDirectories(sorted);
    return sorted.slice(0, deploymentLimit);
  } catch {
    return [];
  }
}

export async function getDeployment(id: string) {
  const deployments = await getDeployments();
  return deployments.find((deployment) => deployment.id === id);
}

export async function saveDeployment(deployment: Deployment) {
  await ensureDeploymentsDirectory();
  await fs.mkdir(deploymentDirectory(deployment.id), { recursive: true });
  const { logs, ...persisted } = deployment;
  await fs.writeFile(
    statusFilePath(deployment.id),
    JSON.stringify(persisted, null, 2),
  );
  if (logs.length) {
    await fs.writeFile(
      deploymentLogFilePath(deployment.id),
      `${logs.join("\n")}\n`,
    );
  }
}

export async function saveDeploymentPayload(id: string, payload: unknown) {
  await ensureDeploymentsDirectory();
  await fs.mkdir(deploymentDirectory(id), { recursive: true });
  await fs.writeFile(
    deploymentPayloadFilePath(id),
    JSON.stringify(payload, null, 2),
  );
}

export async function clearDeployments() {
  await fs.rm(deploymentsDirectory, { recursive: true, force: true });
}
