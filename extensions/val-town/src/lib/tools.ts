import { getPreferenceValues } from "@raycast/api";
import { endpointOf, getValDetail, listFiles, runFile } from "./api";
import { pickEntrypoint } from "./schema";
import { mutateState, type ExtensionState } from "./store";
import { type ValConfig } from "./valconfig";

/** Membership only. The caller writes the val's config first, so nothing is defaulted here. */
export async function addTool(identifier: string): Promise<ExtensionState> {
  const entry = { val: identifier, addedAt: new Date().toISOString() };
  return mutateState((state) => ({
    ...state,
    tools: { ...state.tools, [identifier]: { ...state.tools[identifier], ...entry } },
  }));
}

export type ExecutionResult = {
  ok: boolean;
  via: "endpoint" | "run_file";
  status?: number;
  output: string;
  logs?: string[];
};

/**
 * Resolved per call rather than cached: a val's entrypoint and privacy both change without warning,
 * and there is no spec to keep in step with them.
 */
export async function executeTool(
  val: string,
  config: ValConfig,
  args?: Record<string, unknown>,
): Promise<ExecutionResult> {
  const [{ files }, detail] = await Promise.all([listFiles(val), getValDetail(val)]);

  // The config names the file to call. Only a config written before that field was set falls back.
  const target = config.entrypoint ? files.find((file) => file.path === config.entrypoint) : pickEntrypoint(files);
  if (config.entrypoint && !target) throw new Error(`${val} has no file at ${config.entrypoint}.`);
  if (!target) throw new Error(`${val} has no http, script, interval or email file, so it cannot be called.`);

  const endpoint = endpointOf(target);
  const hasArgs = args !== undefined && Object.keys(args).length > 0;

  if (endpoint) return callEndpoint(endpoint, detail.httpPrivacy === "restricted", args, hasArgs);
  if (hasArgs) throw new Error(`${target.path} is not an http file, so it cannot be called with arguments.`);

  const result = await runFile(val, target.path);
  const logs = result.logs?.map((line) => `[${line.level}] ${line.log}`);
  const failed = result.type === "error";

  return {
    ok: !failed,
    via: "run_file",
    output: failed
      ? [result.message, result.stack].filter(Boolean).join("\n")
      : JSON.stringify(result.value ?? result, null, 2),
    logs,
  };
}

async function callEndpoint(
  endpoint: string,
  restricted: boolean,
  args: Record<string, unknown> | undefined,
  hasArgs: boolean,
): Promise<ExecutionResult> {
  const headers: Record<string, string> = { Accept: "application/json, text/plain" };

  // Only a restricted val needs the account token, so a public val's code never sees it.
  if (restricted) {
    headers.Authorization = `Bearer ${getPreferenceValues<Preferences>().apiToken}`;
  }

  const method: "GET" | "POST" = hasArgs ? "POST" : "GET";
  if (method === "POST") headers["Content-Type"] = "application/json";

  const response = await fetch(endpoint, {
    method,
    headers,
    body: method === "POST" ? JSON.stringify(args ?? {}) : undefined,
    redirect: "manual",
  });

  if (response.status >= 300 && response.status < 400) {
    throw new Error("This val's HTTP access is restricted, so Raycast could not reach its endpoint.");
  }

  const output = await response.text();
  return { ok: response.ok, via: "endpoint", status: response.status, output };
}
