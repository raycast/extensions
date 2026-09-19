import { probeCapability } from "../lib/api";
import { parseJsonObject } from "../lib/json";

type Input = {
  /** Exact capability ID returned by Discover. */
  toolId: string;
  /** A JSON object encoded as text, built from the current schema returned by Inspect. */
  parametersJson: string;
};

/**
 * Validate capability parameters and request a free pre-call quote without executing the capability.
 */
export default async function probe(input: Input) {
  return probeCapability({ toolId: input.toolId, parameters: parseJsonObject(input.parametersJson) });
}
