import { getActionCatalog, getCapabilityCatalog } from "../api/client";

type Input = {
  /** Workspace ID. Runnable actions and their governance are workspace-specific; get this from orient after the user selects a lens. */
  workspaceId: string;
  /** Optional natural-language filter for the executable action catalog. */
  query?: string;
  /** Optional capability kind filter returned by the live catalog. */
  kind?: string;
  /** Maximum actions to return (default 20, max 100). */
  limit?: number;
};

/**
 * Return only actions the shared execute door can launch now. Each action has
 * its real parameter schema, last-known connection state, and execution mode;
 * catalog-only, draft, disconnected, and teaching-only entries are absent.
 * Empty result explains blocked packs and catalog-ready packs with no execute
 * row — it is not a silent [].
 */
export default async function tool(input: Input) {
  const workspaceId = input.workspaceId?.trim();
  if (!workspaceId) {
    return {
      found: false as const,
      actions: [],
      message: "workspaceId is required. Get it from orient after the user selects a lens. Do not invent a workspace.",
    };
  }

  const catalog = await getActionCatalog({
    workspaceId,
    query: input.query,
    kind: input.kind,
    limit: input.limit === undefined ? 20 : Math.min(Math.max(input.limit, 1), 100),
  });

  // Happy path: Hub execute projection unchanged — do not merge packs into actions.
  if (catalog.actions.length > 0) {
    return catalog;
  }

  const packs = await getCapabilityCatalog({ workspaceId });
  const blockedPacks = packs.capabilities
    .filter((card) => {
      const kind = card.nextAction.kind;
      return kind === "add" || kind === "connect" || kind === "enable";
    })
    .slice(0, 5)
    .map((card) => ({
      key: card.key,
      name: card.name,
      status: card.status,
      nextAction: card.nextAction,
    }));

  // nextAction.run = pack ready (enabled + connection ok), not "execute door has a row".
  const catalogReadyNotExecutable = packs.capabilities
    .filter((card) => card.nextAction.kind === "run")
    .slice(0, 5)
    .map((card) => ({
      key: card.key,
      name: card.name,
      status: card.status,
      nextAction: card.nextAction,
    }));

  let reason: string;
  if (catalogReadyNotExecutable.length > 0) {
    reason =
      "No verbs on the execute door. Some packs are catalog-ready (nextAction run) but have no backing executable skill — do not call run-action. Use get-capability-brief / Browser. Packs that need add/connect/enable are in blockedPacks.";
  } else if (blockedPacks.length > 0) {
    reason = "No verbs runnable now in this workspace (need connect, enable, or add).";
  } else {
    reason = "No verbs runnable now.";
  }

  return {
    found: false as const,
    actions: [] as const,
    reason,
    blockedPacks,
    catalogReadyNotExecutable,
    hint: "See blockedPacks (add|connect|enable) and catalogReadyNotExecutable (nextAction run but no execute row). Catalog runnable ≠ execute door. Pack catalog is list-capabilities; do not invent verbs or call run-action from either array. For add|connect|enable use get-capability-brief then bounce Browser.",
  };
}
