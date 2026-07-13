import { Action, Tool } from "@raycast/api";
import { runServiceAction } from "../api/dokploy-api";
import { requireClient, resolveService } from "../lib/ai";
import { serviceKindConfig, supportsAction } from "../lib/service-kinds";
import { ServiceKind } from "../types/dokploy";

type Input = {
  /** Name or id of the service to deploy, e.g. "api". */
  service: string;
  /** Narrows the lookup when several projects have a service with the same name. */
  project?: string;
  /** Narrows the lookup to one type of service. */
  kind?: ServiceKind;
  /** Name of the Dokploy account. Defaults to the active one. */
  account?: string;
};

/**
 * Picks the right route for the kind: applications and compose stacks `redeploy` (rebuild from
 * source), databases `rebuild`. Both are reached through the same registry-driven action.
 */
function deployAction(kind: ServiceKind) {
  if (supportsAction(kind, "redeploy")) return "redeploy" as const;
  if (supportsAction(kind, "rebuild")) return "rebuild" as const;
  return "deploy" as const;
}

export const confirmation: Tool.Confirmation<Input> = async (input) => {
  const client = await requireClient(input.account);
  const service = await resolveService(client, input.service, { kind: input.kind, project: input.project });

  return {
    style: Action.Style.Regular,
    message: `Deploy ${service.name}? This starts a new build and replaces what is currently running.`,
    info: [
      { name: "Service", value: service.name },
      { name: "Type", value: serviceKindConfig(service.kind).label },
      { name: "Project", value: `${service.projectName} / ${service.environmentName}` },
      { name: "Account", value: client.account.label },
    ],
  };
};

/** Triggers a deployment. The build runs server-side, so this returns as soon as it is queued. */
export default async function tool(input: Input) {
  const client = await requireClient(input.account);
  const service = await resolveService(client, input.service, { kind: input.kind, project: input.project });
  const action = deployAction(service.kind);

  await runServiceAction(client, service, action);

  return {
    ok: true,
    action,
    service: service.name,
    project: service.projectName,
    account: client.account.label,
    message: `Deployment queued for ${service.name}. The build runs on the server; check its deployments to see the result.`,
  };
}
