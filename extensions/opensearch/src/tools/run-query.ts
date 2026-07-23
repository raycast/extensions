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

/**
 * Ask before running mutating requests. GET/HEAD/POST (searches, counts) run without
 * a prompt; PUT and DELETE change data, so confirm them first.
 */
export const confirmation: Tool.Confirmation<Input> = async (input) => {
  const method = input.method.toUpperCase();
  if (method !== "PUT" && method !== "DELETE") return undefined;

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
