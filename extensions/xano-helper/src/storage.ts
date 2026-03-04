import { LocalStorage, getPreferenceValues } from "@raycast/api";

export interface Workspace {
  id: string;
  name: string;
  hidden?: boolean;
  lastOpened?: string;
  alias?: string;
}

export interface XanoInstance {
  baseUrl: string;
  name: string;
  workspaces: Workspace[];
  lastUpdated: string;
  lastAccessed?: string;
  hidden?: boolean;
}

const STORAGE_KEY = "xano-instances";

export async function getAllInstances(): Promise<Record<string, XanoInstance>> {
  const raw = await LocalStorage.getItem<string>(STORAGE_KEY);
  if (!raw) return {};
  return JSON.parse(raw);
}

export async function saveInstanceWorkspaces(
  baseUrl: string,
  name: string,
  workspaces: Workspace[],
): Promise<void> {
  const instances = await getAllInstances();
  instances[baseUrl] = {
    baseUrl,
    name,
    workspaces,
    lastUpdated: new Date().toISOString(),
  };
  await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(instances));
}

export async function addWorkspaceToInstance(
  baseUrl: string,
  instanceName: string,
  workspace: Workspace,
): Promise<void> {
  const instances = await getAllInstances();
  if (!instances[baseUrl]) {
    instances[baseUrl] = {
      baseUrl,
      name: instanceName,
      workspaces: [],
      lastUpdated: new Date().toISOString(),
    };
  }
  const existing = instances[baseUrl].workspaces.find(
    (w) => w.id === workspace.id,
  );
  if (existing) {
    existing.name = workspace.name;
  } else {
    instances[baseUrl].workspaces.push(workspace);
  }
  instances[baseUrl].lastUpdated = new Date().toISOString();
  await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(instances));
}

export async function saveInstancesFromMaster(
  instances: { name: string; baseUrl: string }[],
): Promise<void> {
  const existing = await getAllInstances();
  for (const inst of instances) {
    if (existing[inst.baseUrl]) {
      existing[inst.baseUrl].name = inst.name;
    } else {
      existing[inst.baseUrl] = {
        baseUrl: inst.baseUrl,
        name: inst.name,
        workspaces: [],
        lastUpdated: new Date().toISOString(),
      };
    }
  }
  await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
}

export async function getAllWorkspacesFlat(options?: {
  includeHidden?: boolean;
}): Promise<
  {
    workspace: Workspace;
    baseUrl: string;
    instanceName: string;
    lastAccessed?: string;
  }[]
> {
  const instances = await getAllInstances();
  const includeHidden = options?.includeHidden ?? false;
  return Object.values(instances)
    .filter((instance) => includeHidden || !instance.hidden)
    .flatMap((instance) =>
      instance.workspaces
        .filter((workspace) => includeHidden || !workspace.hidden)
        .map((workspace) => ({
          workspace,
          baseUrl: instance.baseUrl,
          instanceName: instance.name,
          lastAccessed: instance.lastAccessed,
        })),
    );
}

export async function toggleInstanceHidden(baseUrl: string): Promise<boolean> {
  const instances = await getAllInstances();
  if (!instances[baseUrl]) return false;
  instances[baseUrl].hidden = !instances[baseUrl].hidden;
  await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(instances));
  return instances[baseUrl].hidden!;
}

export async function toggleWorkspaceHidden(
  baseUrl: string,
  workspaceId: string,
): Promise<boolean> {
  const instances = await getAllInstances();
  const instance = instances[baseUrl];
  if (!instance) return false;
  const workspace = instance.workspaces.find((w) => w.id === workspaceId);
  if (!workspace) return false;
  workspace.hidden = !workspace.hidden;
  await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(instances));
  return workspace.hidden!;
}

export async function setAllWorkspacesHidden(
  baseUrl: string,
  hidden: boolean,
  exceptWorkspaceId?: string,
): Promise<void> {
  const instances = await getAllInstances();
  const instance = instances[baseUrl];
  if (!instance) return;
  for (const workspace of instance.workspaces) {
    if (exceptWorkspaceId && workspace.id === exceptWorkspaceId) continue;
    workspace.hidden = hidden;
  }
  await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(instances));
}

export async function setWorkspaceAlias(
  baseUrl: string,
  workspaceId: string,
  alias: string,
): Promise<void> {
  const instances = await getAllInstances();
  const instance = instances[baseUrl];
  if (!instance) return;
  const workspace = instance.workspaces.find((w) => w.id === workspaceId);
  if (!workspace) return;
  workspace.alias = alias || undefined;
  await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(instances));
}

export async function removeInstance(baseUrl: string): Promise<void> {
  const instances = await getAllInstances();
  delete instances[baseUrl];
  await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(instances));
}

function getSessionTimeoutHours(): number {
  const { sessionTimeout } = getPreferenceValues<{ sessionTimeout: string }>();
  return Number(sessionTimeout) || 2;
}

export async function recordInstanceAccess(
  baseUrl: string,
  workspaceId?: string,
): Promise<void> {
  const instances = await getAllInstances();
  if (instances[baseUrl]) {
    instances[baseUrl].lastAccessed = new Date().toISOString();
    if (workspaceId) {
      const workspace = instances[baseUrl].workspaces.find(
        (w) => w.id === workspaceId,
      );
      if (workspace) {
        workspace.lastOpened = new Date().toISOString();
      }
    }
    await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(instances));
  }
}

export function isSessionStaleSync(lastAccessed?: string): boolean {
  if (!lastAccessed) return true;
  const elapsed = Date.now() - new Date(lastAccessed).getTime();
  return elapsed > getSessionTimeoutHours() * 60 * 60 * 1000;
}

export async function isSessionStale(baseUrl: string): Promise<boolean> {
  const instances = await getAllInstances();
  const instance = instances[baseUrl];
  return isSessionStaleSync(instance?.lastAccessed);
}

export function isDevInstance(baseUrl: string): boolean {
  return baseUrl.includes(".dev.xano.io");
}

export function getMasterUrl(baseUrl: string): string {
  return isDevInstance(baseUrl)
    ? "https://app.dev.xano.com/instance?mode=master"
    : "https://app.xano.com/instance?mode=master";
}
