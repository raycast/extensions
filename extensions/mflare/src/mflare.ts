import { getApplications, LocalStorage, open, showToast, Toast } from "@raycast/api";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport, StreamableHTTPError } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

// MFlare's Raycast Integration (ADR-0007): the extension reads through the same read-only MCP tools agents use,
// with a token of its own.

export type Service = "workers" | "durable_objects" | "kv" | "r2" | "d1";
export type Unit = "count" | "bytes" | "milliseconds" | "minutes" | "gigabyte_seconds";
export type Level = "normal" | "warning" | "exceeded";

export interface Account {
  id: string;
  name: string;
  user: string;
  is_current: boolean;
  workers_plan: "free" | "paid";
  plan_source: "chosen" | "assumed" | "paid_ended";
  needs_reauthorization: boolean;
  usage_fetched_at: string | null;
}

export interface UsageItem {
  id: string;
  service: Service;
  metric: string;
  used: number;
  quota: number | null;
  remaining: number | null;
  unit: Unit;
  percent: number | null;
  level: Level;
  billed_beyond_quota: boolean;
  overage_unit_price: number | null;
  estimated_overage_cost: number | null;
  period: { kind: "daily" | "monthly"; start: string; end: string };
  resets: boolean;
}

export interface AccountUsage {
  account_id: string;
  account_name: string;
  workers_plan: "free" | "paid";
  plan_source: Account["plan_source"];
  fetched_at: string | null;
  items: UsageItem[];
  hidden: { services: Service[]; usages: string[] };
  // Services whose last refresh failed, e.g. `rate_limited`; their items are the last ones fetched.
  errors?: Partial<Record<Service, string>>;
}

// Why MFlare couldn't answer, so a command can say what to do about it.
export class MFlareError extends Error {
  constructor(
    readonly kind: "noConnection" | "badConnection" | "offline" | "unauthorized" | "needsPro" | "failed",
    message: string,
  ) {
    super(message);
  }
}

// The released app and its Debug build each have a URL scheme. A connection is on the scheme of the app it was copied
// from, so the extension opens that one, even while a released MFlare is on the same Mac as a Debug build.
const RELEASE_SCHEME = "mflare";
const SCHEMES = [RELEASE_SCHEME, "mflare-debug"];
const RELEASE_BUNDLE_ID = "io.yuy1n.mflare";
export const MFLARE_WEBSITE = "https://mflare.yuy1n.io";

// A page of MFlare to open on: in its menu bar Panel, an Account's Usage, or its Deployments at a Worker and one of
// its Deployments or Builds; in its Settings, Integrations or License.
export type MFlarePage =
  | { page: "usage"; accountId: string }
  | { page: "deployments"; accountId: string; worker?: string; activity?: Activity }
  | { page: "integrations" }
  | { page: "license" };

// MFlare's link for a page, on its URL scheme. An app from before a page had its link just comes up.
function linkTo(scheme: string, target: MFlarePage): string {
  if (target.page === "integrations" || target.page === "license") return `${scheme}://${target.page}`;
  const query = new URLSearchParams({ account: target.accountId });
  if (target.page === "deployments" && target.worker) {
    query.set("worker", target.worker);
    // The app names a Deployment or Build by its kind and ID, as `build-<id>`.
    if (target.activity) query.set("activity", `${target.activity.kind}-${target.activity.id}`);
  }
  return `${scheme}://${target.page}?${query}`;
}

// Opens MFlare's Panel on a page, or just the app without one, or says it isn't installed and offers its website.
// It's the app the connection came from; the released one before there's a connection.
//
// Raycast only lists apps in the Applications folders, so a Debug build, which runs from its build folder, isn't
// looked for there: its link is opened and only a failure says it's missing. A link MFlare doesn't know, like
// `mflare://open`, just brings the app up.
export async function openMFlare(target?: MFlarePage): Promise<void> {
  const scheme = await connectionScheme();
  const isInstalled =
    scheme !== RELEASE_SCHEME ||
    (await getApplications()).some((application) => application.bundleId === RELEASE_BUNDLE_ID);
  if (isInstalled) {
    try {
      await open(target ? linkTo(scheme, target) : `${scheme}://open`);
      return;
    } catch {
      // No app takes the link: say so below.
    }
  }
  await showToast({
    style: Toast.Style.Failure,
    title: "MFlare isn't installed",
    message: "Get it from mflare.yuy1n.io",
    primaryAction: { title: "Open Website", onAction: () => open(MFLARE_WEBSITE) },
  });
}

// Where to reach MFlare, as Settings › Integrations › Copy Connection gives it: `mflare://127.0.0.1:<port>?token=<token>`,
// on `mflare-debug` from a Debug build. Only this Mac is accepted, so a tampered connection can't send the token
// elsewhere.
export function parseConnection(connection: string): { scheme: string; port: number; token: string } {
  const bad = new MFlareError("badConnection", "Paste the connection from MFlare's Settings › Integrations.");
  let url: URL;
  try {
    url = new URL(connection.trim());
  } catch {
    throw bad;
  }
  const port = Number(url.port);
  const token = url.searchParams.get("token");
  const scheme = url.protocol.replace(/:$/, "");
  const isThisMac = url.hostname === "127.0.0.1" || url.hostname === "localhost";
  if (!SCHEMES.includes(scheme) || !isThisMac || !Number.isInteger(port) || port < 1024 || port > 65535 || !token) {
    throw bad;
  }
  return { scheme, port, token };
}

// The URL scheme of the app the kept connection came from; the released app's while there's none.
async function connectionScheme(): Promise<string> {
  const connection = await LocalStorage.getItem<string>(CONNECTION_KEY);
  try {
    return connection === undefined ? RELEASE_SCHEME : parseConnection(connection).scheme;
  } catch {
    return RELEASE_SCHEME;
  }
}

// The connection lives in the extension's LocalStorage, which Raycast encrypts, rather than in a preference: an
// extension can't change its own preferences, and this way a command can clear it and take a new one.
const CONNECTION_KEY = "connection";

// Keeps a connection once MFlare takes it: asks MFlare for its Accounts with it first, and throws what went wrong,
// the way a command's read would (`badConnection`, `offline`, `unauthorized`, `needsPro`), keeping nothing then.
export async function saveConnection(connection: string): Promise<void> {
  await callToolWith(connection, "list_accounts");
  await LocalStorage.setItem(CONNECTION_KEY, connection.trim());
}

export async function clearConnection(): Promise<void> {
  await LocalStorage.removeItem(CONNECTION_KEY);
}

async function callTool<T>(name: string, args: Record<string, unknown> = {}): Promise<T> {
  const connection = await LocalStorage.getItem<string>(CONNECTION_KEY);
  if (connection === undefined) throw new MFlareError("noConnection", "Paste the connection from MFlare.");
  return callToolWith<T>(connection, name, args);
}

async function callToolWith<T>(connection: string, name: string, args: Record<string, unknown> = {}): Promise<T> {
  const { port, token } = parseConnection(connection);
  const transport = new StreamableHTTPClientTransport(new URL(`http://127.0.0.1:${port}/mcp`), {
    requestInit: { headers: { Authorization: `Bearer ${token}` } },
  });
  const client = new Client({ name: "mflare-raycast", version: "1.0.0" });
  try {
    await client.connect(transport);
    const result = await client.callTool({ name, arguments: args });
    if (result.isError) {
      throw new MFlareError("failed", textOf(result.content) ?? `MFlare couldn't run ${name}.`);
    }
    return result.structuredContent as T;
  } catch (error) {
    throw classify(error);
  } finally {
    await client.close().catch(() => undefined);
  }
}

function textOf(content: unknown): string | undefined {
  if (!Array.isArray(content)) return undefined;
  const text = content.find((part) => part?.type === "text")?.text;
  return typeof text === "string" ? text : undefined;
}

function classify(error: unknown): MFlareError {
  if (error instanceof MFlareError) return error;
  if (error instanceof StreamableHTTPError) {
    if (error.code === 401) return new MFlareError("unauthorized", "MFlare didn't accept the token.");
    if (error.code === 403) return new MFlareError("needsPro", "The Raycast Integration needs MFlare Pro.");
  }
  // fetch fails with a TypeError whose cause carries the socket error when nothing listens on the port.
  const cause = (error as { cause?: { code?: string } })?.cause;
  if (error instanceof TypeError || cause?.code === "ECONNREFUSED") {
    return new MFlareError("offline", "MFlare isn't running, or Raycast is off in its Settings › Integrations.");
  }
  return new MFlareError("failed", error instanceof Error ? error.message : String(error));
}

export async function listAccounts(): Promise<Account[]> {
  return (await callTool<{ accounts: Account[] }>("list_accounts")).accounts;
}

// The Current Account's Usage when `accountId` is undefined.
export async function getUsage(accountId?: string): Promise<AccountUsage> {
  const { accounts } = await callTool<{ accounts: AccountUsage[] }>(
    "get_usage",
    accountId ? { account_id: accountId } : {},
  );
  if (!accounts[0]) throw new MFlareError("failed", "MFlare returned no Usage for this Account.");
  return accounts[0];
}

export type BuildStatus = "queued" | "building" | "succeeded" | "failed" | "cancelled";

export function isRunning(status: BuildStatus): boolean {
  return status === "queued" || status === "building";
}

// A Deployment or a Build, told apart by kind. A Deployment made by a Build shows as that Build.
export type Activity =
  | {
      kind: "deployment";
      id: string;
      created_on: string;
      source: string;
      author_email: string | null;
      message: string | null;
    }
  | {
      kind: "build";
      id: string;
      created_on: string;
      status: BuildStatus;
      started_on: string | null;
      stopped_on: string | null;
      branch: string | null;
      commit_hash: string | null;
      commit_message: string | null;
      author: string | null;
    };

export interface Worker {
  name: string;
  last_activity_at: string | null;
  latest: Activity | null;
  has_build_in_progress: boolean;
  muted: boolean;
  dashboard_url: string;
}

export interface BuildLogLine {
  date: string;
  text: string;
  level: "error" | "warning" | null;
}

export interface BuildLogPage {
  build_status: BuildStatus;
  lines: BuildLogLine[];
  cursor: string | null;
  has_more: boolean;
  is_complete: boolean;
}

function withAccount(accountId: string | undefined, args: Record<string, unknown> = {}): Record<string, unknown> {
  return accountId ? { ...args, account_id: accountId } : args;
}

export async function listWorkers(accountId?: string): Promise<Worker[]> {
  return (await callTool<{ workers: Worker[] }>("list_workers", withAccount(accountId))).workers;
}

export async function listDeployments(worker: string, accountId?: string): Promise<Activity[]> {
  return (await callTool<{ history: Activity[] }>("list_deployments", withAccount(accountId, { worker }))).history;
}

// Reads a Build Log from Cloudflare, which uses up MFlare's request budget, so it's read only when asked for.
export async function getBuildLog(
  worker: string,
  buildId: string,
  accountId?: string,
  cursor?: string,
): Promise<BuildLogPage> {
  const args: Record<string, unknown> = { worker, build_id: buildId };
  if (cursor) args.cursor = cursor;
  return callTool<BuildLogPage>("get_build_log", withAccount(accountId, args));
}
