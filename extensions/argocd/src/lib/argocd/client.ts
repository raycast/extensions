/**
 * The ArgoCD REST client.
 *
 * The API offers no field projection, so a list response is projected to the row model here and
 * the raw body is dropped immediately (see fields.ts for the measurements behind that).
 *
 * A Raycast command gets a 100 MB JS heap, and one applications list does not fit: 30.2 MB of
 * compact JSON becomes roughly 60 MB as a UTF-16 string plus another 50 MB of object graph, and
 * `response.json()` holds both at once. So list responses are streamed and projected element by
 * element (stream.ts), never materialised. Single-application reads use `response.json()`,
 * being a few tens of kilobytes each.
 *
 * Every request carries its own timeout, and every write is refused unless the instance is
 * explicitly marked writable. That last check duplicates what the UI already does by hiding the
 * action: the duplication is the point, because a UI regression must not be able to produce a
 * write against production.
 */

import type { ArgoInstance } from "../config/instances";
import { AuthError } from "../auth/provider";
import {
  ApiError,
  ForbiddenError,
  NetworkError,
  NotFoundError,
  ReadOnlyInstanceError,
  TimeoutError,
} from "./errors";
import { projectAppSet, type AppSetSummary } from "./appset";
import { projectDetail, projectResourceDiff, projectRevisionMetadata, projectSummary } from "./project";
import { decodeStream, streamArrayItems } from "./stream";
import type { SyncRequest } from "./sync";
import type { AppDetail, AppSummary, ResourceDiff, ResourceStatus, RevisionMetadata } from "./types";

export interface ClientDeps {
  fetch: typeof globalThis.fetch;
  getToken: (instance: ArgoInstance) => Promise<string>;
  timeoutMs?: number;
}

export interface ListResult {
  apps: AppSummary[];
}

export interface AppSetListResult {
  appSets: AppSetSummary[];
}

const DEFAULT_TIMEOUT_MS = 15_000;

export class ArgoClient {
  constructor(
    private readonly instance: ArgoInstance,
    private readonly deps: ClientDeps,
  ) {}

  appUrl(name: string, appNamespace: string): string {
    return `${this.instance.baseUrl}/applications/${encodeURIComponent(appNamespace)}/${encodeURIComponent(name)}`;
  }

  appSetUrl(name: string, namespace: string): string {
    return `${this.instance.baseUrl}/applicationsets/${encodeURIComponent(namespace)}/${encodeURIComponent(name)}`;
  }

  async listApplications(signal?: AbortSignal): Promise<ListResult> {
    const apps = await this.streamList(
      "/api/v1/applications",
      (item) => projectSummary(item, this.instance.id),
      signal,
    );
    return { apps };
  }

  async listApplicationSets(signal?: AbortSignal): Promise<AppSetListResult> {
    const appSets = await this.streamList(
      "/api/v1/applicationsets",
      (item) => projectAppSet(item, this.instance.id),
      signal,
    );
    return { appSets };
  }

  /**
   * Streams a list endpoint, projecting each element as it arrives so the response is never
   * held whole. A single malformed element is dropped rather than taking the list down.
   */
  private async streamList<T>(
    path: string,
    project: (item: unknown) => T | undefined,
    signal?: AbortSignal,
    query: Record<string, string> = {},
  ): Promise<T[]> {
    const response = await this.send("GET", path, query, undefined, signal);
    if (!response.body) {
      throw new ApiError(`${this.instance.name} returned an empty response.`, response.status);
    }

    const projected: T[] = [];
    try {
      await streamArrayItems(decodeStream(response.body), {
        key: "items",
        onItem: (item) => {
          const value = project(item);
          if (value !== undefined) {
            projected.push(value);
          }
        },
      });
    } catch (error) {
      if (isAbort(error)) {
        throw new TimeoutError(`${this.instance.name} did not answer in time.`);
      }
      throw new NetworkError(`The connection to ${this.instance.name} was interrupted.`);
    }
    return projected;
  }

  async getApplication(
    name: string,
    appNamespace: string,
    refresh?: "normal" | "hard",
    signal?: AbortSignal,
  ): Promise<AppDetail> {
    const query: Record<string, string> = { appNamespace };
    if (refresh) {
      query.refresh = refresh;
    }
    return this.readApplication(name, query, signal);
  }

  async getApplicationStatus(name: string, appNamespace: string, signal?: AbortSignal): Promise<AppDetail> {
    return this.readApplication(name, { appNamespace }, signal);
  }

  /**
   * The diff of what is out of sync. ArgoCD precomputes the `diff` string, so nothing here has
   * to diff anything; the response is streamed because its `liveState`, `targetState` and
   * `predictedLiveState` fields are the bulk of it and are dropped on projection.
   *
   * Passing a resource narrows the request to that one object, which is what the per-resource
   * action does and what keeps the common case small.
   */
  async getManagedResources(
    name: string,
    appNamespace: string,
    resource?: Pick<ResourceStatus, "group" | "kind" | "namespace" | "name" | "version">,
    signal?: AbortSignal,
  ): Promise<ResourceDiff[]> {
    const query: Record<string, string> = { appNamespace };
    if (resource) {
      query.name = resource.name;
      query.namespace = resource.namespace;
      query.kind = resource.kind;
      query.group = resource.group;
      query.version = resource.version;
    }
    return this.streamList(
      `/api/v1/applications/${encodeURIComponent(name)}/managed-resources`,
      projectResourceDiff,
      signal,
      query,
    );
  }

  /** Who committed the revision that is actually deployed, and what they wrote. */
  async getRevisionMetadata(
    name: string,
    appNamespace: string,
    revision: string,
    signal?: AbortSignal,
  ): Promise<RevisionMetadata> {
    const body = await this.get(
      `/api/v1/applications/${encodeURIComponent(name)}/revisions/${encodeURIComponent(revision)}/metadata`,
      { appNamespace },
      signal,
    );
    return projectRevisionMetadata(body);
  }

  /** Deep link that opens the application with one resource selected in the web UI. */
  resourceUrl(name: string, appNamespace: string, resource: ResourceStatus): string {
    const node = [resource.group, resource.kind, resource.namespace, resource.name].join("/");
    const params = new URLSearchParams({ node, tab: "diff" });
    return `${this.appUrl(name, appNamespace)}?${params.toString()}`;
  }

  async sync(name: string, appNamespace: string, body: SyncRequest, signal?: AbortSignal): Promise<void> {
    if (!this.instance.allowWrite) {
      throw new ReadOnlyInstanceError(this.instance.name);
    }
    await this.request(
      "POST",
      `/api/v1/applications/${encodeURIComponent(name)}/sync`,
      { appNamespace },
      body,
      signal,
    );
  }

  private async readApplication(
    name: string,
    query: Record<string, string>,
    signal?: AbortSignal,
  ): Promise<AppDetail> {
    const body = await this.get(`/api/v1/applications/${encodeURIComponent(name)}`, query, signal);
    const detail = projectDetail(body, this.instance.id);
    if (!detail) {
      throw new ApiError(`${this.instance.name} returned an application without a name.`, 200);
    }
    return detail;
  }

  private get(path: string, query: Record<string, string>, signal?: AbortSignal): Promise<unknown> {
    return this.request("GET", path, query, undefined, signal);
  }

  private async request(
    method: "GET" | "POST",
    path: string,
    query: Record<string, string>,
    body: unknown,
    signal?: AbortSignal,
  ): Promise<unknown> {
    const response = await this.send(method, path, query, body, signal);
    if (response.status === 204) {
      return undefined;
    }
    try {
      return await response.json();
    } catch {
      throw new ApiError(`${this.instance.name} returned a response that is not JSON.`, response.status);
    }
  }

  /** Performs the request and maps a failure to a typed error, leaving the body unread. */
  private async send(
    method: "GET" | "POST",
    path: string,
    query: Record<string, string>,
    body: unknown,
    signal?: AbortSignal,
  ): Promise<Response> {
    const token = await this.deps.getToken(this.instance);
    const url = new URL(`${this.instance.baseUrl}${path}`);
    for (const [key, value] of Object.entries(query)) {
      url.searchParams.set(key, value);
    }

    const timeout = AbortSignal.timeout(this.deps.timeoutMs ?? DEFAULT_TIMEOUT_MS);
    const combined = signal ? AbortSignal.any([signal, timeout]) : timeout;

    // No Accept-Encoding here on purpose: Node's fetch negotiates gzip itself and decompresses
    // the body. Setting the header by hand is how you end up holding a compressed buffer.
    const headers: Record<string, string> = {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    };
    if (body !== undefined) {
      headers["Content-Type"] = "application/json";
    }

    let response: Response;
    try {
      response = await this.deps.fetch(url.toString(), {
        method,
        headers,
        signal: combined,
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      });
    } catch (error) {
      // The URL is deliberately absent from these messages: a query string can carry more than
      // it looks like, and these strings end up in toasts and in Raycast's log.
      if (isAbort(error)) {
        throw new TimeoutError(`${this.instance.name} did not answer in time.`);
      }
      throw new NetworkError(`Could not reach ${this.instance.name}. Check your VPN connection.`);
    }

    if (!response.ok) {
      throw await this.toError(response);
    }
    return response;
  }

  private async toError(response: Response): Promise<Error> {
    const detail = await serverMessage(response);
    const host = hostOf(this.instance.baseUrl);

    switch (response.status) {
      case 401:
        return new AuthError(
          `The session for ${host} is not valid any more. Log in again.`,
          this.instance.id,
          host,
        );
      case 403:
        return new ForbiddenError(
          `Your account is not allowed to do this on ${this.instance.name}.${detail ? ` ${detail}` : ""}`,
        );
      case 404:
        return new NotFoundError(`Not found on ${this.instance.name}. It may have been deleted.`);
      default:
        return new ApiError(
          `${this.instance.name} answered ${response.status}.${detail ? ` ${detail}` : ""}`,
          response.status,
        );
    }
  }
}

function hostOf(baseUrl: string): string {
  try {
    return new URL(baseUrl).host;
  } catch {
    return baseUrl;
  }
}

function isAbort(error: unknown): boolean {
  return error instanceof Error && (error.name === "AbortError" || error.name === "TimeoutError");
}

/**
 * ArgoCD reports errors as {"error": "...", "message": "..."}. Only that field is surfaced, and
 * only when it is short: a whole response body in a toast is noise at best and a leak at worst.
 */
async function serverMessage(response: Response): Promise<string | undefined> {
  try {
    const body = (await response.json()) as { message?: unknown; error?: unknown };
    const message = body.message ?? body.error;
    if (typeof message !== "string" || message.length === 0) {
      return undefined;
    }
    return message.length > 200 ? `${message.slice(0, 200)}...` : message;
  } catch {
    return undefined;
  }
}
