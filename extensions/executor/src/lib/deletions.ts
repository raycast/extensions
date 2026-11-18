import type { ConfirmationDetails } from "./ai-tools";
import { getIntegration, request } from "./client";
import { connectionTargetInfo, exactConnection, type ConnectionTargetInput } from "./connection-ai";

export type DeletionTarget =
  { kind: "integration"; integration: string } | ({ kind: "connection" } & ConnectionTargetInput);

async function deletionDetails(target: DeletionTarget) {
  if (target.kind === "connection") {
    for (const value of [target.integration, target.connection]) {
      if (typeof value !== "string" || !value.trim() || [".", ".."].includes(value.trim()))
        throw new Error("Use the exact integration and connection name from list-connections.");
    }
    const connection = await exactConnection(target);
    return {
      path: `/api/connections/${encodeURIComponent(connection.owner)}/${encodeURIComponent(connection.integration)}/${encodeURIComponent(connection.name)}`,
      connection,
    };
  }
  if (target.kind !== "integration") throw new Error("Choose a connection or integration to delete.");
  const slug = typeof target.integration === "string" ? target.integration.trim() : "";
  if (!slug || slug.split(".").some((segment) => !/^[a-zA-Z0-9_-]+$/.test(segment)))
    throw new Error("Use an exact integration slug from list-integrations.");
  const integration = await getIntegration(slug);
  if (integration.slug !== slug) throw new Error("The integration changed. Refresh list-integrations.");
  if (integration.canRemove !== true) throw new Error("Executor does not allow this integration to be deleted.");
  return {
    path: `/api/integrations/${encodeURIComponent(slug)}`,
    confirmation: {
      message: "Removes this integration, its connections, and its tools from this workspace. This cannot be undone.",
      info: [{ name: "Integration", value: integration.name }],
    } satisfies ConfirmationDetails,
  };
}

/** Read-only preparation shared by native and AI confirmations. */
export async function deletionConfirmation(target: DeletionTarget): Promise<ConfirmationDetails> {
  const details = await deletionDetails(target);
  if (details.connection) {
    return {
      message:
        "Tools using this connection will lose access. This cannot be undone; reconnecting creates a new connection.",
      info: (await connectionTargetInfo(details.connection)).filter(({ name }) => name !== "Address"),
    };
  }
  return details.confirmation;
}

/** Recheck the exact target and removal capability; never retry an uncertain deletion. */
export async function deleteExecutorItem(target: DeletionTarget) {
  const { path } = await deletionDetails(target);
  const result = await request<{ removed: boolean }>(path, { method: "DELETE" });
  if (result?.removed !== true)
    throw new Error("Executor did not confirm deletion. Refresh the list before trying again.");
  return { removed: true, target };
}
