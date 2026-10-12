import { randomUUID } from "node:crypto";
import type { Tool } from "@raycast/api";
import { callCapability, probeCapability } from "../lib/api";
import { formatProbeQuote, probeError, probeQuoteFingerprint, PROBE_QUOTE_DISCLAIMER } from "../lib/format";
import { parseJsonObject } from "../lib/json";

type Input = {
  /** Exact capability ID returned by Discover. */
  toolId: string;
  /** Exact search ID returned by the Discover call that produced the selected capability. */
  searchId: string;
  /** A JSON object encoded as text, built only from the current schema returned by Inspect. */
  parametersJson: string;
};

const CONFIRMED_QUOTE_TTL_MS = 5 * 60 * 1000;
const confirmedQuotes = new Map<string, { fingerprint: string; display: string; confirmedAt: number }>();

function confirmationKey(input: Input): string {
  return JSON.stringify([input.toolId, input.searchId, input.parametersJson]);
}

export const confirmation: Tool.Confirmation<Input> = async (input) => {
  const parameters = parseJsonObject(input.parametersJson);
  const probe = await probeCapability({ toolId: input.toolId, parameters });
  const validationError = probeError(probe);
  if (validationError) throw new Error(`Parameters failed validation:\n${validationError}`);

  confirmedQuotes.set(confirmationKey(input), {
    fingerprint: probeQuoteFingerprint(probe),
    display: formatProbeQuote(probe),
    confirmedAt: Date.now(),
  });

  return {
    message: `Run this capability? It may consume QVeris credits and may cause side effects in a third-party service. ${PROBE_QUOTE_DISCLAIMER}`,
    info: [
      { name: "Tool ID", value: input.toolId },
      { name: "Current Probe Estimate", value: formatProbeQuote(probe) },
      { name: "Parameters", value: input.parametersJson },
    ],
  };
};

/**
 * Execute a capability selected through Discover. Parameters are revalidated before execution. This may consume credits or cause third-party side effects.
 */
export default async function call(input: Input) {
  const parameters = parseJsonObject(input.parametersJson);
  const key = confirmationKey(input);
  const confirmedQuote = confirmedQuotes.get(key);
  confirmedQuotes.delete(key);

  if (!confirmedQuote || Date.now() - confirmedQuote.confirmedAt > CONFIRMED_QUOTE_TTL_MS) {
    throw new Error(
      "The confirmed Probe estimate is missing or expired. No call was made. Run Call Capability again to review a fresh estimate.",
    );
  }

  const probe = await probeCapability({ toolId: input.toolId, parameters });
  const validationError = probeError(probe);
  if (validationError) throw new Error(`Parameters failed validation:\n${validationError}`);

  const currentFingerprint = probeQuoteFingerprint(probe);
  if (currentFingerprint !== confirmedQuote.fingerprint) {
    throw new Error(
      `The Probe estimate changed from ${confirmedQuote.display} to ${formatProbeQuote(probe)}. No call was made. Run Call Capability again to review and confirm the updated non-binding estimate.`,
    );
  }

  return callCapability({
    toolId: input.toolId,
    searchId: input.searchId,
    parameters,
    sessionId: randomUUID(),
  });
}
