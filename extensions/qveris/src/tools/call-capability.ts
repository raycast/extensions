import { randomUUID } from "node:crypto";
import type { Tool } from "@raycast/api";
import { callCapability, probeCapability } from "../lib/api";
import { formatProbeQuote, probeError } from "../lib/format";
import { parseJsonObject } from "../lib/json";

type Input = {
  /** Exact capability ID returned by Discover. */
  toolId: string;
  /** Exact search ID returned by the Discover call that produced the selected capability. */
  searchId: string;
  /** A JSON object encoded as text, built only from the current schema returned by Inspect. */
  parametersJson: string;
};

export const confirmation: Tool.Confirmation<Input> = async (input) => {
  const parameters = parseJsonObject(input.parametersJson);
  const probe = await probeCapability({ toolId: input.toolId, parameters });
  const validationError = probeError(probe);
  if (validationError) throw new Error(`Parameters failed validation:\n${validationError}`);

  return {
    message: "Run this capability? It may consume QVeris credits and may cause side effects in a third-party service.",
    info: [
      { name: "Tool ID", value: input.toolId },
      { name: "Pre-call Quote", value: formatProbeQuote(probe) },
      { name: "Parameters", value: input.parametersJson },
    ],
  };
};

/**
 * Execute a capability selected through Discover. Parameters are revalidated before execution. This may consume credits or cause third-party side effects.
 */
export default async function call(input: Input) {
  const parameters = parseJsonObject(input.parametersJson);
  const probe = await probeCapability({ toolId: input.toolId, parameters });
  const validationError = probeError(probe);
  if (validationError) throw new Error(`Parameters failed validation:\n${validationError}`);

  return callCapability({
    toolId: input.toolId,
    searchId: input.searchId,
    parameters,
    sessionId: randomUUID(),
  });
}
