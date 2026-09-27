import { Action, Tool } from "@raycast/api";
import { Candidate, DeployType, resolveCandidate } from "../candidates";
import { SERVICE_ACTIONS, callServiceAction } from "../service-actions";

// Deliberately a closed list: the model's `action` argument is never passed to Dokploy unchecked,
// since `SERVICE_ACTIONS` also holds a database's `rebuild`, which deletes its data volume.
// A plain literal union - Raycast's tool-schema extractor can't resolve `(typeof X)[number]`.
type ControlAction = "start" | "stop" | "reload";
const CONTROL_ACTIONS: ControlAction[] = ["start", "stop", "reload"];

const CONSEQUENCES: Record<ControlAction, string> = {
  start: "It will start serving again.",
  stop: "It will become unreachable until it is started again.",
  reload: "It will restart, causing a brief interruption.",
};

const LABELS: Record<ControlAction, string> = { start: "Start", stop: "Stop", reload: "Reload" };

type Input = {
  /** Name or id of the service. */
  service: string;
  /** "start" or "stop" the service, or "reload" (restart) it. Compose stacks can't be reloaded. */
  action: ControlAction;
  /** Narrows the lookup when more than one project has a service with this name. */
  project?: string;
  /** Narrows the lookup when one project has a service with this name in more than one environment, e.g. "staging". */
  environment?: string;
  /** Narrows the lookup to one kind of service. */
  kind?: DeployType;
  /** Narrows the lookup to one configured instance, by name. */
  instance?: string;
};

/** Resolves the service and rejects an action it doesn't support - before anything is confirmed or sent. */
async function lookup(input: Input): Promise<Candidate> {
  if (!CONTROL_ACTIONS.includes(input.action)) {
    throw new Error(`"${input.action}" isn't a supported action - use "start", "stop", or "reload".`);
  }
  const candidate = await resolveCandidate(input.service, {
    instance: input.instance,
    project: input.project,
    environment: input.environment,
    kind: input.kind,
  });
  if (!SERVICE_ACTIONS[candidate.deployType].includes(input.action)) {
    throw new Error(
      `${candidate.name} is a ${candidate.deployType} service, which Dokploy can't ${input.action} - stop and start it instead.`,
    );
  }
  return candidate;
}

export const confirmation: Tool.Confirmation<Input> = async (input) => {
  const candidate = await lookup(input);
  return {
    style: input.action === "stop" ? Action.Style.Destructive : Action.Style.Regular,
    message: `${LABELS[input.action]} ${candidate.name}? ${CONSEQUENCES[input.action]}`,
    info: [
      { name: "Service", value: candidate.name },
      { name: "Kind", value: candidate.deployType },
      { name: "Project", value: `${candidate.projectName} / ${candidate.environmentName}` },
      { name: "Instance", value: candidate.instanceName },
    ],
  };
};

/** Starts, stops, or reloads (restarts) a service. To rebuild it from source, use `deploy-service` instead. */
export default async function tool(input: Input) {
  const candidate = await lookup(input);

  await callServiceAction(
    candidate.url,
    candidate.headers,
    { id: candidate.id, type: candidate.deployType, name: candidate.name, appName: candidate.appName },
    input.action,
  );

  return {
    service: candidate.name,
    kind: candidate.deployType,
    action: input.action,
    instance: candidate.instanceName,
    project: candidate.projectName,
    environment: candidate.environmentName,
  };
}
