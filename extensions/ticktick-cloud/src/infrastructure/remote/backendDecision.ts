/**
 * The single release-approved remote backend. This is a release-time decision
 * proven by the authenticated contract suite, never a runtime fallback: a
 * failed MCP operation must surface its error instead of silently retrying
 * against a different transport, because that could duplicate mutations.
 */
export const RELEASE_REMOTE_BACKEND = "mcp" as const;

export type ReleaseRemoteBackendId = typeof RELEASE_REMOTE_BACKEND;
