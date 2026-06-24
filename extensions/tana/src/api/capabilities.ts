import { TanaMcpClient } from "./TanaAPIClient";
import { TanaTool } from "./contracts";
import { createTanaError } from "./errors";

export type CapabilitySnapshot = {
  available: string[];
  missing: string[];
};

export const compareCapabilities = (available: string[], required: readonly string[]): CapabilitySnapshot => {
  const names = new Set(available);
  return { available: [...names].sort(), missing: required.filter((name) => !names.has(name)) };
};

export const requireTools = async (
  client: TanaMcpClient,
  required: readonly TanaTool[],
  signal?: AbortSignal,
): Promise<CapabilitySnapshot> => {
  const tools = await client.listTools(signal);
  const snapshot = compareCapabilities(
    tools.map(({ name }) => name),
    required,
  );
  if (snapshot.missing.length) {
    throw createTanaError(
      "tool",
      `This Tana Desktop version is missing required Local API tools: ${snapshot.missing.join(", ")}`,
    );
  }
  return snapshot;
};
