import type {
  ProjectConfig,
  RemoteConfigTemplate,
  RemoteConfigVersion,
} from "./types";
import { getAccessTokenContext } from "./auth";
import { getPreferences } from "./storage";

const API_BASE = "https://firebaseremoteconfig.googleapis.com/v1";

interface ListVersionsResponse {
  versions?: RemoteConfigVersion[];
  nextPageToken?: string;
}

function buildTimeoutSignal(timeoutMs: number): AbortSignal {
  const controller = new AbortController();
  setTimeout(() => controller.abort(), timeoutMs);
  return controller.signal;
}

function getTimeoutMs(): number {
  const preferences = getPreferences();
  const raw = Number(preferences.requestTimeoutMs || 20_000);
  return Number.isFinite(raw) && raw > 0 ? raw : 20_000;
}

async function remoteConfigRequest(
  project: ProjectConfig,
  endpoint: string,
  init?: RequestInit,
): Promise<{ response: Response; text: string }> {
  const { accessToken, authMethod } = await getAccessTokenContext(project);
  const response = await fetch(
    `${API_BASE}/projects/${project.projectId}/${endpoint}`,
    {
      ...init,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json; charset=utf-8",
        ...(authMethod === "adc"
          ? { "x-goog-user-project": project.projectId }
          : {}),
        ...(init?.headers ?? {}),
      },
      signal: buildTimeoutSignal(getTimeoutMs()),
    },
  );

  const text = await response.text();
  if (!response.ok) {
    throw new Error(text || `${response.status} ${response.statusText}`);
  }

  return { response, text };
}

export async function getRemoteConfigTemplate(
  project: ProjectConfig,
): Promise<{ template: RemoteConfigTemplate; etag: string }> {
  const { response, text } = await remoteConfigRequest(
    project,
    "remoteConfig",
    {
      method: "GET",
    },
  );
  const template = JSON.parse(text || "{}") as RemoteConfigTemplate;
  const etag = response.headers.get("etag");
  if (!etag) {
    throw new Error(
      `Firebase did not return an ETag for ${project.displayName}.`,
    );
  }
  return { template, etag };
}

export async function updateRemoteConfigTemplate(
  project: ProjectConfig,
  template: RemoteConfigTemplate,
  etag: string,
): Promise<{ template: RemoteConfigTemplate; etag: string }> {
  const { response, text } = await remoteConfigRequest(
    project,
    "remoteConfig",
    {
      method: "PUT",
      headers: {
        "If-Match": etag,
      },
      body: JSON.stringify(template),
    },
  );

  const nextTemplate = JSON.parse(text || "{}") as RemoteConfigTemplate;
  const nextEtag = response.headers.get("etag") || etag;
  return { template: nextTemplate, etag: nextEtag };
}

export async function listRemoteConfigVersions(
  project: ProjectConfig,
  pageSize = 50,
): Promise<RemoteConfigVersion[]> {
  const { text } = await remoteConfigRequest(
    project,
    `remoteConfig:listVersions?pageSize=${pageSize}`,
    { method: "GET" },
  );
  const payload = JSON.parse(text || "{}") as ListVersionsResponse;
  return payload.versions ?? [];
}

export async function rollbackRemoteConfig(
  project: ProjectConfig,
  versionNumber: string,
): Promise<RemoteConfigTemplate> {
  const { text } = await remoteConfigRequest(project, "remoteConfig:rollback", {
    method: "POST",
    body: JSON.stringify({ versionNumber }),
  });
  return JSON.parse(text || "{}") as RemoteConfigTemplate;
}

export async function downloadRemoteConfigDefaults(
  project: ProjectConfig,
  format: "JSON" | "PLIST" | "XML" = "JSON",
): Promise<string> {
  const { text } = await remoteConfigRequest(
    project,
    `remoteConfig:downloadDefaults?format=${format}`,
    {
      method: "GET",
      headers: {
        Accept: format === "JSON" ? "application/json" : "text/plain",
      },
    },
  );
  return text;
}
