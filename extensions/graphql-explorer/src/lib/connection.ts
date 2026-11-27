import { showToast, Toast } from "@raycast/api";
import { executeGraphQL } from "./request";
import { GraphQLEnvironment } from "./types";

/** Sends `{ __typename }` to the endpoint and reports the outcome in a toast. */
export async function testConnection(env: Pick<GraphQLEnvironment, "url" | "headers">): Promise<void> {
  const toast = await showToast({ style: Toast.Style.Animated, title: "Testing connection…", message: env.url });
  const result = await executeGraphQL(env, { query: "{ __typename }" }, { timeoutMs: 15_000 });

  if (result.error) {
    toast.style = Toast.Style.Failure;
    toast.title = "Connection failed";
    toast.message = result.error;
    return;
  }
  const typename = (result.json as { data?: { __typename?: string } } | undefined)?.data?.__typename;
  if (result.status !== undefined && result.status < 400 && typename) {
    toast.style = Toast.Style.Success;
    toast.title = `Connected in ${result.durationMs} ms`;
    toast.message = `HTTP ${result.status} · root type ${typename}`;
    return;
  }
  const firstError = (result.json as { errors?: { message?: string }[] } | undefined)?.errors?.[0]?.message;
  toast.style = Toast.Style.Failure;
  toast.title = `HTTP ${result.status} ${result.statusText ?? ""}`.trim();
  toast.message = firstError ?? (result.json ? "Unexpected GraphQL response" : "Response is not JSON");
}
