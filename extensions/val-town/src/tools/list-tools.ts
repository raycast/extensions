import { listVals } from "../lib/api";
import { loadState, type JsonSchema } from "../lib/store";
import { readConfigs } from "../lib/valconfig";

type ListedTool = {
  val: string;
  description: string | null;
  /** Null means the val takes none, so there is nothing to look up before running it. */
  arguments: JsonSchema | null;
};

/**
 * Each val's config is read, not just the registry: the description written for the model lives
 * there, and so does whether the val is switched on. The allow list is user-curated and small, so
 * that is a handful of reads rather than one per val the account owns.
 */
export default async function listTools(): Promise<{ tools: ListedTool[]; note?: string }> {
  const state = await loadState();
  const registered = Object.keys(state.tools);

  if (registered.length === 0) {
    return {
      tools: [],
      note: "The user has enabled none of their Val Town vals. They enable one with Enable in this extension's Search Vals command.",
    };
  }

  const [{ vals }, configs] = await Promise.all([listVals({}), readConfigs(registered)]);

  // The val's own description is the fallback, for a config that leaves it empty.
  const ownDescription = new Map(vals.map((val) => [val.identifier, val.description]));

  const tools = registered
    .filter((val) => configs[val]?.active)
    .map((val) => ({
      val,
      description: configs[val]?.description ?? ownDescription.get(val) ?? null,
      arguments: configs[val]?.inputSchema ?? null,
    }));

  if (tools.length === 0) {
    return { tools: [], note: "Every val the user allowed is switched off, so none can be called." };
  }

  return {
    tools,
    note: "The user set these up to be run: when their request matches a description, call execute-tool with that val and arguments matching its schema, without asking first — each val's own confirmation setting handles that. Only a question about the collection itself ends here. get-val-info is for reading a val's source, such as when a run failed.",
  };
}
