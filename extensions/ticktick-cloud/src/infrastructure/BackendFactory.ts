import type { TickTickBackend } from "./backend/TickTickBackend";
import { RELEASE_REMOTE_BACKEND, type ReleaseRemoteBackendId } from "./remote/backendDecision";

export interface BackendLoaders {
  loadReleaseRemote(backendId: ReleaseRemoteBackendId): TickTickBackend | Promise<TickTickBackend>;
}

/**
 * Selects the single release-approved remote backend. The decision is code,
 * not configuration: a failed MCP operation surfaces its error instead of
 * silently retrying against another transport.
 */
export async function selectTickTickBackend(loaders: BackendLoaders): Promise<TickTickBackend> {
  return loaders.loadReleaseRemote(RELEASE_REMOTE_BACKEND);
}
