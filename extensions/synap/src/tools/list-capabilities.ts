import type { HubCapabilityCatalogCard } from "@synap/hub-rest-client";
import { getCapabilityCatalog } from "../api/client";

type Input = {
  /** Workspace ID. Pack status and nextAction are workspace-specific; get this from orient after the user selects a lens. Never invent a workspace. */
  workspaceId: string;
  /** Optional client-side filter on pack key, name, description, or verb labels. */
  query?: string;
  /** Optional pack key excluded from default-sync — passed through so the catalog can resolve it. */
  extraKey?: string;
};

function projectCard(card: HubCapabilityCatalogCard) {
  return {
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
    verbs: card.verbs.map((verb) => ({
      verbId: verb.verbId,
      label: verb.label,
      type: verb.type,
      enabled: verb.enabled,
      runnable: verb.runnable,
      governance: verb.governance,
    })),
    nextAction: card.nextAction,
  };
}

function matchesQuery(card: ReturnType<typeof projectCard>, query: string): boolean {
  const q = query.toLowerCase();
  if (card.key.toLowerCase().includes(q)) return true;
  if (card.name.toLowerCase().includes(q)) return true;
  if (card.description?.toLowerCase().includes(q)) return true;
  return card.verbs.some((verb) => verb.label.toLowerCase().includes(q) || verb.verbId.toLowerCase().includes(q));
}

/**
 * Pack catalog for install/connect/enable. Dual with list-actions (runnable-now
 * only) — these are not the same door.
 */
export default async function tool(input: Input) {
  const workspaceId = input.workspaceId?.trim();
  if (!workspaceId) {
    return {
      found: false,
      capabilities: [],
      message: "workspaceId is required. Get it from orient after the user selects a lens. Do not invent a workspace.",
    };
  }

  const catalog = await getCapabilityCatalog({
    workspaceId,
    extraKey: input.extraKey?.trim() || undefined,
  });

  let capabilities = catalog.capabilities.map(projectCard);

  const query = input.query?.trim();
  if (query) {
    capabilities = capabilities.filter((card) => matchesQuery(card, query));
  }

  return { capabilities };
}
