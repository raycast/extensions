import { Action, Tool } from "@raycast/api";
import { runServiceAction } from "../api/dokploy-api";
import { requireClient, resolveService } from "../lib/ai";
import { ACTION_LABELS, serviceKindConfig, supportsAction } from "../lib/service-kinds";
import { ServiceKind } from "../types/dokploy";

/** Deleting is deliberately not offered here - it is not something a chat turn should do. */
type ControlAction = "start" | "stop" | "reload";

type Input = {
  /** Name or id of the service. */
  service: string;
  /** What to do: start it, stop it, or reload (restart) it. */
  action: ControlAction;
  /** Narrows the lookup when several projects have a service with the same name. */
  project?: string;
  /** Narrows the lookup to one type of service. */
  kind?: ServiceKind;
  /** Name of the Dokploy account. Defaults to the active one. */
  account?: string;
};

export const confirmation: Tool.Confirmation<Input> = async (input) => {
  const client = await requireClient(input.account);
  const service = await resolveService(client, input.service, { kind: input.kind, project: input.project });

  const consequence =
    input.action === "stop"
      ? "It will stop serving traffic until it is started again."
      : input.action === "reload"
        ? "It will restart, causing a brief interruption."
        : "It will start serving traffic again.";

  return {
    // Stopping takes something down; the other two don't.
    style: input.action === "stop" ? Action.Style.Destructive : Action.Style.Regular,
    message: `${ACTION_LABELS[input.action]} ${service.name}? ${consequence}`,
    info: [
      { name: "Service", value: service.name },
      { name: "Type", value: serviceKindConfig(service.kind).label },
      { name: "Project", value: `${service.projectName} / ${service.environmentName}` },
      { name: "Account", value: client.account.label },
    ],
  };
};

/** Starts, stops or reloads a service. */
export default async function tool(input: Input) {
  const client = await requireClient(input.account);
  const service = await resolveService(client, input.service, { kind: input.kind, project: input.project });

  if (!supportsAction(service.kind, input.action)) {
    const label = serviceKindConfig(service.kind).label;
    throw new Error(`${label} services do not support “${input.action}”. Dokploy has no such route for them.`);
  }

  await runServiceAction(client, service, input.action);

  return {
    ok: true,
    action: input.action,
    service: service.name,
    project: service.projectName,
    account: client.account.label,
  };
}
