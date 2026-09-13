import { ClientError, GrokClient, record, requiredString } from "./client";

export type ResourceKind = "routines" | "skills";
export interface BotResource {
  id: string;
  name: string;
  text: string;
  enabled?: boolean;
  schedule: string;
}
export async function listResources(
  client: Pick<GrokClient, "command">,
  agentId: string,
  kind: ResourceKind,
  signal?: AbortSignal,
): Promise<BotResource[]> {
  const result = await client.command(
    kind === "routines" ? "getAgentAutomations" : "getAgentWorkflows",
    { id: agentId },
    { signal },
  );
  if (!Array.isArray(result)) throw new ClientError("Invalid resource list.");
  return result.map((value) => {
    if (
      !record(value) ||
      (kind === "routines" && typeof value.isEnabled !== "boolean")
    )
      throw new ClientError("Invalid resource details.");
    const body = kind === "routines" ? value.prompt : value.body;
    if (typeof body !== "string")
      throw new ClientError("Resource instructions are unavailable.");
    return {
      id: requiredString(value.id, "resource ID"),
      name: requiredString(value.name, "resource name"),
      text: body,
      enabled:
        typeof value.isEnabled === "boolean" ? value.isEnabled : undefined,
      schedule:
        typeof value.triggerDescription === "string"
          ? value.triggerDescription
          : "",
    };
  });
}
export async function actOnResource(
  client: Pick<GrokClient, "command">,
  agentId: string,
  kind: ResourceKind,
  resource: BotResource,
  action: "run" | "toggle",
): Promise<void> {
  if (kind === "skills" && action === "toggle")
    throw new ClientError("Skills do not have routine schedules.");
  const current = (await listResources(client, agentId, kind)).find(
    (item) => item.id === resource.id,
  );
  if (
    !current ||
    current.name !== resource.name ||
    current.text !== resource.text ||
    current.enabled !== resource.enabled ||
    current.schedule !== resource.schedule
  )
    throw new ClientError(
      "This resource changed. Refresh and review it again.",
    );
  if (action === "toggle")
    await client.command(
      "setAgentAutomationEnabled",
      { id: agentId, automationId: resource.id, isEnabled: !current.enabled },
      { mutation: true },
    );
  else
    await client.command(
      kind === "routines" ? "runAgentAutomationNow" : "runAgentWorkflowNow",
      {
        id: agentId,
        [kind === "routines" ? "automationId" : "workflowId"]: resource.id,
      },
      { mutation: true },
    );
}
