import { LocalStorage } from "@raycast/api";
import { Environment, Deployment } from "./types";

const ENVIRONMENTS_KEY = "dt_environments";
const DEPLOYMENTS_KEY = "dt_deployments";

// --- Environments ---

export async function getEnvironments(): Promise<Environment[]> {
  const raw = await LocalStorage.getItem<string>(ENVIRONMENTS_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as Environment[];
  } catch {
    return [];
  }
}

export async function saveEnvironments(
  environments: Environment[],
): Promise<void> {
  await LocalStorage.setItem(ENVIRONMENTS_KEY, JSON.stringify(environments));
}

export async function addEnvironment(env: Environment): Promise<void> {
  const envs = await getEnvironments();
  await saveEnvironments([...envs, env]);
}

export async function updateEnvironment(updated: Environment): Promise<void> {
  const envs = await getEnvironments();
  await saveEnvironments(envs.map((e) => (e.id === updated.id ? updated : e)));
}

export async function deleteEnvironment(id: string): Promise<void> {
  const envs = await getEnvironments();
  await saveEnvironments(envs.filter((e) => e.id !== id));
}

// --- Deployments ---

export async function getDeployments(): Promise<Deployment[]> {
  const raw = await LocalStorage.getItem<string>(DEPLOYMENTS_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as Deployment[];
  } catch {
    return [];
  }
}

export async function saveDeployments(
  deployments: Deployment[],
): Promise<void> {
  await LocalStorage.setItem(DEPLOYMENTS_KEY, JSON.stringify(deployments));
}

export async function addDeployment(deployment: Deployment): Promise<void> {
  const deps = await getDeployments();
  await saveDeployments([deployment, ...deps]);
}

export async function deleteDeployment(id: string): Promise<void> {
  const deps = await getDeployments();
  await saveDeployments(deps.filter((d) => d.id !== id));
}

/**
 * Returns the most recent deployment for each environment.
 * The result is a Map keyed by environmentId.
 */
export async function getLatestDeployments(): Promise<Map<string, Deployment>> {
  const deployments = await getDeployments();
  const map = new Map<string, Deployment>();
  // deployments are stored newest-first, so first occurrence wins
  for (const dep of deployments) {
    if (!map.has(dep.environmentId)) {
      map.set(dep.environmentId, dep);
    }
  }
  return map;
}

export async function getDeploymentsForEnvironment(
  environmentId: string,
): Promise<Deployment[]> {
  const deps = await getDeployments();
  return deps.filter((d) => d.environmentId === environmentId);
}
