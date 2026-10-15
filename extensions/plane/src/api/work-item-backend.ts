import { Cache } from "@raycast/api";
import { planeClient, requirePlaneClient } from "./auth";
import { sendPlaneRequest } from "./request";
import { getApiBasePath } from "../helpers/urls";
import {
  BackendKind,
  Capabilities,
  invalidateCapability,
  ProbeFetcher,
  readCachedCapabilities,
  resolveCapabilities,
} from "../helpers/work-item-backends";

/** Shared by every command of the extension (Raycast's `Cache` is per extension). */
const capabilityStore = new Cache({ namespace: "plane-work-item-backends" });

const probeFetcher: ProbeFetcher = async (url) => {
  const response = await sendPlaneRequest(url);
  return { status: response.status, headers: response.headers, body: response.body };
};

let inFlight: { key: string; promise: Promise<Capabilities> } | undefined;

/** Capabilities of the current server and workspace, probing at most once per 24 h (and once per run at a time). */
export function getCapabilities(): Promise<Capabilities> {
  const workspaceSlug = requirePlaneClient().workspaceSlug;
  const baseUrl = getApiBasePath();
  const key = `${baseUrl}|${workspaceSlug}`;
  if (inFlight?.key === key) return inFlight.promise;
  const promise = resolveCapabilities({ store: capabilityStore, fetcher: probeFetcher, baseUrl, workspaceSlug });
  inFlight = { key, promise };
  promise
    .finally(() => {
      if (inFlight?.promise === promise) inFlight = undefined;
    })
    .catch(() => undefined);
  return promise;
}

/** Cached capabilities only (no requests). Before the first probe this reports neither fast backend. */
export function getCachedCapabilities(): Capabilities {
  if (!planeClient) return { v2: false };
  return readCachedCapabilities({
    store: capabilityStore,
    baseUrl: getApiBasePath(),
    workspaceSlug: planeClient.workspaceSlug,
  });
}

export function invalidateBackend(kind: BackendKind): void {
  invalidateCapability(capabilityStore, kind, getApiBasePath(), requirePlaneClient().workspaceSlug);
}
