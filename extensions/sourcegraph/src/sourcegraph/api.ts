import { Sourcegraph } from "./types";

/**
 * getAPIHeaders returns the headers to use for API requests to this Sourcegraph instance.
 */
export function getAPIHeaders(src: Pick<Sourcegraph, "token" | "oauth" | "anonymousUserID">): Record<string, string> {
  const headers: Record<string, string> = {
    "X-Requested-With": "raycast-sourcegraph 0.0.0",
  };
  if (src.token) {
    headers["Authorization"] = `${src.oauth ? "Bearer" : "token"} ${src.token}`;
  }
  if (src.anonymousUserID) {
    headers["X-Sourcegraph-Actor-Anonymous-UID"] = src.anonymousUserID;
  }
  return headers;
}
