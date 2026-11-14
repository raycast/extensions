import type { Tool } from "@raycast/api";
import { requireAllowed } from "../lib/allowed";
import { executeTool as run } from "../lib/tools";
import { missingConfigError, readValConfig, type ValConfig } from "../lib/valconfig";

type Input = {
  /** The val as `handle/valName`, exactly as list-tools returned it. Never guess this. */
  val: string;
  /** The request body as a JSON object string, matching the val's `arguments` from list-tools. */
  argumentsJson?: string;
};

export default async function executeTool(input: Input) {
  const config = await resolve(input.val);
  const result = await run(input.val, config, parseArgs(input.argumentsJson));

  return {
    val: input.val,
    ok: result.ok,
    calledVia: result.via,
    status: result.status,
    output: result.output.slice(0, 40000),
    logs: result.logs,
  };
}

/**
 * Only the documented fields — `message`, `info`, `style`, `image` — and never a thrown error:
 * excess-property checks do not reach this return, and a confirmation that throws cancels the call
 * without ever asking. When the config cannot be read the safe answer is to ask anyway; the tool
 * itself then reports the real error.
 */
export const confirmation: Tool.Confirmation<Input> = async (input) => {
  let config: ValConfig | null = null;
  try {
    config = await resolve(input.val);
  } catch {
    // Fail closed: ask rather than silently skipping or silently cancelling.
  }

  if (config && !config.confirm) return undefined;

  return {
    message: `Run ${input.val}?`,
    info: [
      ...(config?.description ? [{ name: "Does", value: config.description }] : []),
      ...(input.argumentsJson ? [{ name: "Body", value: input.argumentsJson }] : []),
    ],
  };
};

async function resolve(val: string): Promise<ValConfig> {
  await requireAllowed(val);

  const config = await readValConfig(val);
  if (!config) throw missingConfigError(val);
  if (!config.active)
    throw new Error(`${val} is disabled. The user re-enables it with Enable Tool in the Val Town extension.`);

  return config;
}

function parseArgs(raw: string | undefined): Record<string, unknown> | undefined {
  if (!raw || !raw.trim()) return undefined;
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) return parsed as Record<string, unknown>;
    throw new Error("not an object");
  } catch {
    throw new Error('`argumentsJson` must be a JSON object, for example {"city":"Berlin"}.');
  }
}
