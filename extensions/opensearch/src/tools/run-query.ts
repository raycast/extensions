import { Action, Tool } from "@raycast/api";
import { osRequest, type HttpMethod } from "../lib/client";
import { getActiveConnection } from "../lib/connections";

type Input = {
  /** The HTTP method to use. */
  method: "GET" | "POST" | "PUT" | "DELETE" | "HEAD";
  /** The request path, starting with "/", e.g. "/_cluster/health" or "/my-index/_search". */
  path: string;
  /** An optional JSON string body, e.g. '{"query":{"match_all":{}},"size":10}'. */
  body?: string;
};

// POST endpoints that only read data — these don't need a confirmation prompt.
const READ_ONLY_POST =
  /\/(_search|_msearch|_count|_explain|_field_caps|_validate|_analyze|_mget|_mtermvectors|_render|_search\/scroll)\b/;

/**
 * Ask before running mutating requests. Read-only calls (GET/HEAD and POST search
 * endpoints such as `_search`/`_count`) run without a prompt; everything else —
 * PUT, DELETE, and mutating POST like `_delete_by_query`, `_update_by_query`, `_bulk`,
 * or document writes — is confirmed first.
 */
export const confirmation: Tool.Confirmation<Input> = async (input) => {
  const method = input.method.toUpperCase();
  const isReadOnly = method === "GET" || method === "HEAD" || (method === "POST" && READ_ONLY_POST.test(input.path));
  if (isReadOnly) return undefined;

  const connection = await getActiveConnection();
  return {
    style: Action.Style.Destructive,
    message: `Run ${method} ${input.path} against OpenSearch?`,
    info: [
      { name: "Connection", value: connection?.name },
      { name: "Method", value: method },
      { name: "Path", value: input.path },
      { name: "Body", value: input.body },
    ],
  };
};

/**
 * Sends a request to the active OpenSearch connection and returns the response.
 * The active connection is the default one saved in Manage Connections, or the
 * extension preferences fallback.
 */
export default async function (input: Input) {
  const connection = await getActiveConnection();
  if (!connection) {
    throw new Error("No OpenSearch connection configured. Add one with the Manage Connections command.");
  }

  const response = await osRequest(connection, input.method as HttpMethod, input.path, input.body);
  return {
    connection: connection.name,
    status: response.status,
    ok: response.ok,
    durationMs: response.durationMs,
    data: response.data,
  };
}
