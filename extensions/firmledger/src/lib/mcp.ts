import { Alert, Toast, confirmAlert, open, showToast } from "@raycast/api";
import { Args, Config, McpError, ToolOutcome, callTool, callWithHandshake, listRemoteTools } from "./core";
import { authMode, configuredEndpoint, getBearer } from "./auth";
import { TOOL_MAP } from "./tools";

export { McpError };
export type { ToolOutcome };

export async function getConfig(force = false): Promise<Config> {
  return { endpoint: configuredEndpoint(), apiKey: await getBearer(force) };
}

/** Runs fn with credentials; on an expired/invalid OAuth token refreshes (or signs in again) once. */
async function withAuth<T>(fn: (cfg: Config) => Promise<T>): Promise<T> {
  try {
    return await fn(await getConfig());
  } catch (e) {
    if (authMode() === "oauth" && e instanceof McpError && (e.status === 401 || e.code === "invalid_token")) {
      return fn(await getConfig(true));
    }
    throw e;
  }
}

/** Read-only call (no confirmation handshake needed). */
export function read(name: string, args: Args = {}): Promise<ToolOutcome> {
  return withAuth((cfg) => callTool(cfg, name, args));
}

const DESTRUCTIVE_ACTIONS = ["close", "remove", "delete", "revoke", "rotate_secret"];

/** Runs any tool; account changes go through prepare → native confirm dialog → execute. */
export function run(name: string, args: Args = {}): Promise<ToolOutcome> {
  const def = TOOL_MAP[name];
  const destructive = Boolean(def?.destructive) && (args.action === undefined || DESTRUCTIVE_ACTIONS.includes(String(args.action)));
  return withAuth((cfg) =>
    callWithHandshake(cfg, name, args, (info) =>
      confirmAlert({
        title: info.action.replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase()),
        message: info.summary,
        icon: undefined,
        primaryAction: { title: "Confirm", style: destructive ? Alert.ActionStyle.Destructive : Alert.ActionStyle.Default },
        dismissAction: { title: "Cancel" },
      }),
    ),
  );
}

export function remoteTools() {
  return withAuth((cfg) => listRemoteTools(cfg));
}

const URL_KEYS = ["upgrade_url", "free_trial_url", "manage_keys_url", "create_key_url", "dashboard_url", "setup_guide_url"];

export function friendly(e: unknown): { title: string; message: string; url?: string } {
  if (e instanceof McpError) {
    const d = (e.details ?? {}) as Record<string, any>;
    const url = URL_KEYS.map((k) => d[k]).find((v) => typeof v === "string") as string | undefined;
    const titles: Record<string, string> = {
      key_required: "API key required",
      pro_required: "FirmLedger Pro required",
      scope_required: `Key needs the ${d.required_scope ?? "account"} scope`,
      invalid_key: "Invalid API key",
      invalid_token: "Sign-in expired, run Connection & Access → Sign In",
      wrong_endpoint: "Wrong endpoint for this sign-in",
      key_revoked: "API key revoked",
      account_suspended: "Account suspended",
      insufficient_scope: "Key needs read:listings",
      confirmation_invalid: "Confirmation failed",
      not_found: "Not found",
      ambiguous: "Ambiguous name, use the slug",
      dashboard_only: "Dashboard only",
    };
    return { title: titles[e.code] ?? "FirmLedger error", message: e.message, url };
  }
  return { title: "Something went wrong", message: e instanceof Error ? e.message : String(e) };
}

export async function reportError(e: unknown) {
  const f = friendly(e);
  await showToast({
    style: Toast.Style.Failure,
    title: f.title,
    message: f.message.slice(0, 200),
    primaryAction: f.url ? { title: "Open Link", onAction: () => open(f.url!) } : undefined,
  });
}
