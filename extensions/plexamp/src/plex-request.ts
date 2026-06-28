import { LocalStorage, environment } from "@raycast/api";

import { getClientIdentifier } from "./plex-client";
import { getConfig, getConfiguredPlexampUrl, requireServerConfig } from "./plex-config";
import { parseMediaContainer } from "./plex-parsing";
import type { TimelineInfo } from "./types";
import type { XmlNode } from "./plex-parsing";

const COMMAND_ID_KEY = "plexamp-command-id";
const REQUEST_TIMEOUT_MS = 15000;

async function nextCommandId(): Promise<string> {
  const existing = await LocalStorage.getItem<string>(COMMAND_ID_KEY);
  const next = String(existing ? Number(existing) + 1 : Date.now());
  await LocalStorage.setItem(COMMAND_ID_KEY, next);
  return next;
}

function normalizeHeaders(extraHeaders?: RequestInit["headers"]): Record<string, string> {
  if (!extraHeaders) {
    return {};
  }

  return Object.fromEntries(new Headers(extraHeaders).entries());
}

async function getBaseHeaders(
  extraHeaders?: RequestInit["headers"],
  token?: string,
  accept = "application/xml",
): Promise<Record<string, string>> {
  const clientIdentifier = await getClientIdentifier();
  const extra = normalizeHeaders(extraHeaders);
  const headers: Record<string, string> = {
    Accept: accept,
    "X-Plex-Client-Identifier": clientIdentifier,
    "X-Plex-Device-Name": `${environment.extensionName ?? "Raycast"} Controller`,
    "X-Plex-Product": environment.extensionName ?? "Raycast Plexamp",
    "X-Plex-Version": "0.1.0",
    "X-Plex-Platform": process.platform === "darwin" ? "macOS" : process.platform,
    "X-Plex-Provides": "controller",
    ...extra,
  };

  if (token) {
    headers["X-Plex-Token"] = token;
  }

  return headers;
}

interface PlexRequestOptions<T> {
  init?: RequestInit;
  includeTokenQuery?: boolean;
  token?: string;
  accept: string;
  parse: (response: Response) => Promise<T>;
  onConnectionError: (url: URL, message: string, baseUrl: string) => Error;
}

export class PlexRequestError extends Error {
  statusCode: number;
  statusText: string;
  url: string;
  body: string;

  constructor(response: Response, body: string) {
    super(formatRequestFailureMessage(response, body));
    this.name = "PlexRequestError";
    this.statusCode = response.status;
    this.statusText = response.statusText;
    this.url = response.url;
    this.body = body;
  }
}

function formatRequestFailureMessage(response: Response, body: string): string {
  return `Request failed (${response.status} ${response.statusText}): ${body || new URL(response.url).pathname}`;
}

async function requestPlex<T>(baseUrl: string, path: string, options: PlexRequestOptions<T>): Promise<T> {
  const url = new URL(path, `${baseUrl}/`);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  if (options.includeTokenQuery && options.token && !url.searchParams.has("X-Plex-Token")) {
    url.searchParams.set("X-Plex-Token", options.token);
  }

  let response: Response;

  try {
    response = await fetch(url, {
      method: options.init?.method ?? "GET",
      headers: await getBaseHeaders(options.init?.headers, options.token, options.accept),
      body: options.init?.body,
      signal: controller.signal,
    });
  } catch (error) {
    clearTimeout(timeout);
    const message =
      error instanceof Error && error.name === "AbortError"
        ? `Request timed out after ${REQUEST_TIMEOUT_MS / 1000} seconds`
        : error instanceof Error
          ? error.message
          : String(error);

    throw options.onConnectionError(url, message, baseUrl);
  }

  try {
    if (!response.ok) {
      const body = await response.text();
      throw new PlexRequestError(response, body);
    }

    return await options.parse(response);
  } finally {
    clearTimeout(timeout);
  }
}

async function requestXml(
  baseUrl: string,
  path: string,
  init?: RequestInit,
  includeTokenQuery = false,
  token?: string,
): Promise<XmlNode> {
  return requestPlex(baseUrl, path, {
    init,
    includeTokenQuery,
    token,
    accept: "application/xml",
    parse: async (response) => parseMediaContainer(await response.text()),
    onConnectionError: (url, message) => {
      const host = url.host || baseUrl;

      if (baseUrl === getConfiguredPlexampUrl()) {
        return new Error(
          `Could not reach Plexamp at ${getConfiguredPlexampUrl()}. Use the player's HTTP endpoint, usually http://<host>:32500, and verify ${getConfiguredPlexampUrl()}/resources loads from this Mac. Original error: ${message}`,
        );
      }

      return new Error(`Could not reach Plex server at ${host}. Original error: ${message}`);
    },
  });
}

async function requestJson<T>(baseUrl: string, path: string, init?: RequestInit, token?: string): Promise<T> {
  return requestPlex(baseUrl, path, {
    init,
    token,
    accept: "application/json",
    parse: async (response) => (await response.json()) as T,
    onConnectionError: (url, message) => new Error(`Could not reach ${url.host}. Original error: ${message}`),
  });
}

export async function requestPlayer(path: string, params: Record<string, string | undefined> = {}): Promise<XmlNode> {
  const config = await getConfig();
  const url = new URL(path, `${config.plexampUrl}/`);
  const commandId = await nextCommandId();

  url.searchParams.set("commandID", commandId);

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) {
      url.searchParams.set(key, value);
    }
  }

  return requestXml(config.plexampUrl, url.pathname + url.search, undefined, false, config.plexToken);
}

export async function requestServer(path: string, init?: RequestInit): Promise<XmlNode> {
  const config = await requireServerConfig();
  return requestXml(config.plexServerUrl, path, init, true, config.plexServerToken ?? config.plexToken);
}

export async function requestServerWithConnection(
  baseUrl: string,
  path: string,
  token?: string,
  init?: RequestInit,
): Promise<XmlNode> {
  return requestXml(baseUrl, path, init, true, token);
}

export function getTimelineServerBaseUrl(timeline: TimelineInfo): string | undefined {
  if (!timeline.protocol || !timeline.address || !timeline.port) {
    return undefined;
  }

  return `${timeline.protocol}://${timeline.address}:${timeline.port}`;
}

export async function requestTimelineServer(
  timeline: TimelineInfo,
  path: string,
  init?: RequestInit,
): Promise<XmlNode> {
  const baseUrl = getTimelineServerBaseUrl(timeline);

  if (!baseUrl) {
    return requestServer(path, init);
  }

  const { plexToken } = await getConfig();
  return requestServerWithConnection(baseUrl, path, plexToken, init);
}

export function isRequestStatusError(error: unknown, statusCode: number): boolean {
  if (error instanceof PlexRequestError) {
    return error.statusCode === statusCode;
  }

  const message = error instanceof Error ? error.message : String(error);
  return message.includes(`Request failed (${statusCode} `);
}

export async function requestPlayQueueViaPlayer(playQueueId: string, params: URLSearchParams): Promise<XmlNode> {
  return requestPlayer(`/playQueues/${encodeURIComponent(playQueueId)}`, {
    ...Object.fromEntries(params.entries()),
  });
}

export { requestJson, requestXml };
