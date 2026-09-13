import { getPreferenceValues } from "@raycast/api";
import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { resolve } from "node:path";
import { load as parseYaml } from "js-yaml";

export interface Application {
  metadata: {
    name: string;
    namespace?: string;
    creationTimestamp?: string;
  };
  spec?: {
    project?: string;
    destination?: {
      server?: string;
      name?: string;
      namespace?: string;
    };
    source?: ApplicationSource;
    sources?: ApplicationSource[];
    syncPolicy?: {
      automated?: { prune?: boolean; selfHeal?: boolean; allowEmpty?: boolean };
      syncOptions?: string[];
    };
  };
  status?: {
    sync?: {
      status?: string;
      revision?: string;
      comparedTo?: { source?: ApplicationSource; destination?: unknown };
    };
    health?: { status?: string; message?: string };
    operationState?: {
      phase?: string;
      message?: string;
      startedAt?: string;
      finishedAt?: string;
      syncResult?: { revision?: string };
    };
    reconciledAt?: string;
    resources?: ApplicationResource[];
    conditions?: ApplicationCondition[];
    summary?: { images?: string[] };
    history?: DeploymentHistoryItem[];
  };
}

export interface ApplicationSource {
  repoURL?: string;
  path?: string;
  targetRevision?: string;
  chart?: string;
}

export interface DeploymentHistoryItem {
  id?: number;
  revision?: string;
  revisions?: string[];
  deployedAt?: string;
  deployStartedAt?: string;
  source?: ApplicationSource;
  sources?: ApplicationSource[];
}

export interface ApplicationResource {
  group?: string;
  version?: string;
  kind?: string;
  name?: string;
  namespace?: string;
  status?: string;
  health?: { status?: string; message?: string };
  syncWave?: number;
}

export interface ResourceTreeNode {
  group?: string;
  version?: string;
  kind?: string;
  name?: string;
  namespace?: string;
  uid?: string;
  parentRefs?: Array<{ group?: string; kind?: string; namespace?: string; name?: string; uid?: string }>;
  health?: { status?: string; message?: string };
  info?: Array<{ name?: string; value?: string }>;
  createdAt?: string;
}

export interface ResourceTree {
  nodes?: ResourceTreeNode[];
  orphanedNodes?: ResourceTreeNode[];
}

export interface ApplicationCondition {
  type?: string;
  message?: string;
  lastTransitionTime?: string;
}

export interface ProjectDestination {
  server?: string;
  name?: string;
  namespace?: string;
}

export interface ProjectRole {
  name: string;
  description?: string;
  policies?: string[];
  groups?: string[];
}

export interface Project {
  metadata: {
    name: string;
    namespace?: string;
    creationTimestamp?: string;
  };
  spec?: {
    description?: string;
    sourceRepos?: string[];
    destinations?: ProjectDestination[];
    roles?: ProjectRole[];
  };
}

interface ArgoCliConfig {
  contexts?: Array<{ name: string; server: string; user: string }>;
  servers?: Array<{ server: string }>;
  users?: Array<{ name: string; "auth-token"?: string }>;
  "current-context"?: string;
}

function baseUrl(): string {
  const { serverUrl } = getPreferenceValues<Preferences>();
  return serverUrl.replace(/\/$/, "");
}

export function serverHost(): string {
  return new URL(baseUrl()).host;
}

export function expandHome(path: string): string {
  if (path === "~") return homedir();
  if (path.startsWith("~/")) return resolve(homedir(), path.slice(2));
  return path;
}

export const DEFAULT_CLI_CONFIG_PATH = "~/.config/argocd/config";

export function cliConfigPath(): string {
  const { configPath } = getPreferenceValues<Preferences>();
  return expandHome(configPath?.trim() || DEFAULT_CLI_CONFIG_PATH);
}

function tokenFromCliConfig(): string {
  const path = cliConfigPath();

  let raw: string;
  try {
    raw = readFileSync(path, "utf8");
  } catch {
    throw new Error(
      `Could not read argocd config at ${path}. Run \`argocd login <server> --sso\` first, or set an API Token in preferences.`,
    );
  }

  const config = parseYaml(raw) as ArgoCliConfig | null;
  if (!config) throw new Error(`argocd config at ${path} is empty or invalid YAML.`);

  const host = serverHost();
  const context = config.contexts?.find((c) => c.server === host);
  if (!context) {
    throw new Error(
      `No argocd context found for server "${host}" in ${path}. Run \`argocd login ${host} --sso\` first.`,
    );
  }

  const user = config.users?.find((u) => u.name === context.user);
  const token = user?.["auth-token"];
  if (!token) {
    throw new Error(
      `No auth-token found for context "${context.name}" in ${path}. Run \`argocd login ${host} --sso\` again.`,
    );
  }
  return token;
}

function getToken(): string {
  const { apiToken } = getPreferenceValues<Preferences>();
  if (apiToken && apiToken.trim()) return apiToken.trim();
  return tokenFromCliConfig();
}

const REQUEST_TIMEOUT_MS = 15_000;

async function authFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${getToken()}`);
  const url = `${baseUrl()}${path}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  let res: Response;
  try {
    res = await fetch(url, { ...init, headers, signal: controller.signal });
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error(`Request to ${url} timed out after ${REQUEST_TIMEOUT_MS / 1000}s.`);
    }
    const cause = err instanceof Error && err.cause instanceof Error ? ` (${err.cause.message})` : "";
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`Network request to ${url} failed: ${message}${cause}`);
  } finally {
    clearTimeout(timeout);
  }
  if (res.status === 401) {
    throw new Error(
      "ArgoCD rejected the token (401). If you're using the CLI login, run `argocd login <server> --sso` again to refresh it.",
    );
  }
  return res;
}

const APP_LIST_FIELDS = [
  "items.metadata.name",
  "items.metadata.namespace",
  "items.status.health",
  "items.status.sync.status",
].join(",");

export async function listApplications(project?: string): Promise<Application[]> {
  const params = new URLSearchParams({ fields: APP_LIST_FIELDS });
  if (project) params.set("projects", project);
  const res = await authFetch(`/api/v1/applications?${params.toString()}`);
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Failed to list applications (${res.status}): ${body || res.statusText}`);
  }
  const data = (await res.json()) as { items?: Application[] };
  return data.items ?? [];
}

export async function getApplication(name: string): Promise<Application> {
  const res = await authFetch(`/api/v1/applications/${encodeURIComponent(name)}`);
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Failed to load application "${name}" (${res.status}): ${body || res.statusText}`);
  }
  return (await res.json()) as Application;
}

export async function getApplicationResourceTree(name: string): Promise<ResourceTree> {
  const res = await authFetch(`/api/v1/applications/${encodeURIComponent(name)}/resource-tree`);
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Failed to load resource tree for "${name}" (${res.status}): ${body || res.statusText}`);
  }
  return (await res.json()) as ResourceTree;
}

export interface ResourceRef {
  group?: string;
  version?: string;
  kind: string;
  name: string;
  namespace?: string;
}

export interface PodLogsOptions {
  podName: string;
  namespace: string;
  container?: string;
  tailLines?: number;
}

export async function getPodLogs(appName: string, opts: PodLogsOptions): Promise<string> {
  const params = new URLSearchParams({
    podName: opts.podName,
    namespace: opts.namespace,
    tailLines: String(opts.tailLines ?? 500),
  });
  if (opts.container) params.set("container", opts.container);
  const res = await authFetch(`/api/v1/applications/${encodeURIComponent(appName)}/logs?${params.toString()}`);
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Failed to fetch logs (${res.status}): ${body || res.statusText}`);
  }
  const text = await res.text();
  const out: string[] = [];
  for (const raw of text.split("\n")) {
    if (!raw) continue;
    try {
      const obj = JSON.parse(raw) as { result?: { content?: string }; error?: { message?: string } };
      const content = obj.result?.content ?? obj.error?.message;
      if (content !== undefined) out.push(String(content));
    } catch {
      out.push(raw);
    }
  }
  return out.join("\n");
}

export async function getResourceManifest(appName: string, ref: ResourceRef): Promise<string> {
  const params = new URLSearchParams({
    resourceName: ref.name,
    kind: ref.kind,
    version: ref.version ?? "v1",
    group: ref.group ?? "",
  });
  if (ref.namespace) params.set("namespace", ref.namespace);
  const res = await authFetch(`/api/v1/applications/${encodeURIComponent(appName)}/resource?${params.toString()}`);
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Failed to load manifest for ${ref.kind}/${ref.name} (${res.status}): ${body || res.statusText}`);
  }
  const data = (await res.json()) as { manifest?: string };
  return data.manifest ?? "";
}

export function applicationUrl(name: string): string {
  return `${baseUrl()}/applications/${encodeURIComponent(name)}`;
}

export function applicationRollbackUrl(name: string, id: number): string {
  return `${applicationUrl(name)}?rollback=${id}`;
}

const EXTENSION_AUTHOR = "erecarte-twilio";
const EXTENSION_NAME = "argocd";

export function applicationDeeplink(name: string): string {
  const args = encodeURIComponent(JSON.stringify({ appName: name }));
  return `raycast://extensions/${EXTENSION_AUTHOR}/${EXTENSION_NAME}/search-applications?arguments=${args}`;
}

export function resourceUrl(appName: string, ref: ResourceRef): string {
  const parts = [ref.group ?? "", ref.kind, ref.namespace ?? "", ref.name];
  const resource = parts.map((p) => encodeURIComponent(p)).join("%2F");
  const node = `${resource}%2F0`;
  return `${applicationUrl(appName)}?resource=${resource}&node=${node}`;
}

const PROJECT_LIST_FIELDS = [
  "items.metadata.name",
  "items.spec.description",
  "items.spec.destinations",
  "items.spec.roles.name",
].join(",");

export async function listProjects(): Promise<Project[]> {
  const res = await authFetch(`/api/v1/projects?fields=${encodeURIComponent(PROJECT_LIST_FIELDS)}`);
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Failed to list projects (${res.status}): ${body || res.statusText}`);
  }
  const data = (await res.json()) as { items?: Project[] };
  return data.items ?? [];
}

export async function getProject(name: string): Promise<Project> {
  const res = await authFetch(`/api/v1/projects/${encodeURIComponent(name)}`);
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Failed to load project "${name}" (${res.status}): ${body || res.statusText}`);
  }
  return (await res.json()) as Project;
}

export function projectUrl(name: string): string {
  return `${baseUrl()}/settings/projects/${encodeURIComponent(name)}`;
}
