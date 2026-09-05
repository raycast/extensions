import { getCapabilityCatalog } from "../api/client";
import { getConnection } from "../utils/preferences";
import { openUrl as portableOpen } from "../utils/deeplinks";

type Input = {
  /** Workspace ID used for the pack catalog. */
  workspaceId: string;
  /** Pack key from list-capabilities (not a synap_* tool name). */
  key: string;
};

/**
 * Pack brief from the same catalog card as list-capabilities, plus a Browser
 * bounce URL when install/connect/enable is needed. Raycast cannot complete
 * OAuth or apply a pack — do not call get-action-brief (those keys are runnable
 * synap_* tool names, not pack keys).
 */
export default async function tool(input: Input) {
  const workspaceId = input.workspaceId?.trim();
  const key = input.key?.trim();
  if (!workspaceId) {
    return {
      found: false as const,
      message: "workspaceId is required. Get it from orient after the user selects a lens. Do not invent a workspace.",
    };
  }
  if (!key) {
    return {
      found: false as const,
      message: "key is required — pass a pack key from list-capabilities.",
    };
  }

  const catalog = await getCapabilityCatalog({ workspaceId, extraKey: key });
  const card = catalog.capabilities.find((c) => c.key.toLowerCase() === key.toLowerCase());
  if (!card) {
    return {
      found: false as const,
      message: `No pack with key "${key}" in this workspace catalog. Call list-capabilities first; do not invent a connection or pack.`,
    };
  }

  const conn = await getConnection();
  const pod = conn?.podUrl.replace(/\/$/, "") ?? "";
  const openUrl = pod && typeof card.id === "string" && card.id.length > 0 ? portableOpen(pod, card.id) : undefined;

  const verbs = card.verbs.map((verb) => ({
    verbId: verb.verbId,
    label: verb.label,
    type: verb.type,
    enabled: verb.enabled,
    runnable: verb.runnable,
    governance: verb.governance,
  }));

  const bounce = card.nextAction.kind !== "run";
  let message: string;
  if (card.nextAction.kind === "run") {
    message = "This pack is ready. Discover runnable verbs with list-actions, then run-action. Do not install again.";
  } else if (openUrl) {
    message = `Enable/connect/add this pack in Synap Browser: ${openUrl}. Raycast cannot complete OAuth or apply a pack.`;
  } else {
    message = `${card.nextAction.hint} Open Synap Capabilities in the Browser. Raycast cannot complete OAuth or apply a pack.`;
  }

  return {
    found: true as const,
    key: card.key,
    name: card.name,
    description: card.description,
    source: card.source,
    status: card.status,
    connection: card.connection
      ? {
          required: card.connection.required,
          kind: card.connection.kind,
          state: card.connection.state,
          provider: card.connection.provider,
          account: card.connection.account,
        }
      : undefined,
    verbs,
    nextAction: card.nextAction,
    openUrl,
    bounce,
    message,
  };
}
