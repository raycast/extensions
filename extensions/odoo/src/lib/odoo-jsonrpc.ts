export class OdooRpcError extends Error {
  constructor(
    message: string,
    readonly code?: number,
    readonly data?: unknown,
  ) {
    super(message);
    this.name = "OdooRpcError";
  }
}

export function normalizeBaseUrl(url: string): string {
  return url.trim().replace(/\/+$/, "");
}

type JsonRpcRequest = {
  jsonrpc: "2.0";
  method: "call";
  params: {
    service: string;
    method: string;
    args: unknown[];
  };
  id: number;
};

type JsonRpcSuccess<T> = {
  jsonrpc: "2.0";
  id: number;
  result: T;
};

type JsonRpcFailure = {
  jsonrpc: "2.0";
  id: number;
  error: { code: number; message: string; data?: unknown };
};

/** Odoo wraps real failures in JSON-RPC with message "Odoo Server Error" and details in `data`. */
function extractOdooDetail(data: unknown): string | undefined {
  if (data == null) return undefined;
  if (typeof data === "string") {
    const t = data.trim();
    return t.length > 0 ? t.slice(0, 4000) : undefined;
  }
  if (typeof data !== "object") return undefined;

  const d = data as Record<string, unknown>;

  if (typeof d.message === "string" && d.message.trim().length > 0) {
    return d.message.trim();
  }

  if (Array.isArray(d.arguments) && d.arguments.length > 0) {
    const parts = d.arguments.filter((a): a is string => typeof a === "string" && a.trim().length > 0);
    if (parts.length > 0) return parts.join(" — ");
  }

  if (typeof d.name === "string" && typeof d.message !== "string") {
    return d.name;
  }

  if (typeof d.debug === "string" && d.debug.length > 0) {
    const firstBlock = d.debug.split("\n").find((line) => line.trim().length > 0);
    if (firstBlock) return firstBlock.trim().slice(0, 500);
  }

  return undefined;
}

function rpcUserMessage(message: string | undefined, data: unknown): string {
  const detail = extractOdooDetail(data);
  const generic = message === "Odoo Server Error" || !message?.trim();

  if (detail) {
    if (generic) return detail;
    return `${detail} (${message})`;
  }

  return message?.trim() || "Odoo RPC error";
}

/** Extra guidance when Postgres/Odoo reports an unknown DB name (wrong Raycast "Database" pref). */
function appendConfigHints(message: string): string {
  if (/database\s+"[^"]+"\s+does not exist/i.test(message) || /database.*does not exist/i.test(message)) {
    return `${message}\n\nFix: Ensure \`ODOO_DATABASE_NAME\` in odoo-internal-config.ts matches your PostgreSQL db_name (deploy config).`;
  }
  return message;
}

export async function jsonRpc<T>(baseUrl: string, service: string, method: string, args: unknown[]): Promise<T> {
  const url = `${normalizeBaseUrl(baseUrl)}/jsonrpc`;
  const body: JsonRpcRequest = {
    jsonrpc: "2.0",
    method: "call",
    params: { service, method, args },
    id: Math.floor(Math.random() * 1_000_000_000),
  };

  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new OdooRpcError(`Network error calling ${url}: ${msg}`);
  }

  if (!response.ok) {
    throw new OdooRpcError(`HTTP ${response.status}: ${response.statusText} (${url})`);
  }

  const text = await response.text();
  let payload: JsonRpcSuccess<T> | JsonRpcFailure;
  try {
    payload = JSON.parse(text) as JsonRpcSuccess<T> | JsonRpcFailure;
  } catch {
    throw new OdooRpcError(
      `Invalid JSON from Odoo (wrong URL or HTML error page?). First bytes: ${text.slice(0, 200)}`,
    );
  }

  if ("error" in payload && payload.error) {
    const { message, code, data } = payload.error;
    throw new OdooRpcError(appendConfigHints(rpcUserMessage(message, data)), code, data);
  }

  return payload.result;
}

/** Web `/web/session/*` and other JSON routes use the same envelope shape without `service`/`method`. */
export function throwIfWebJsonRpcError(envelope: unknown): void {
  if (typeof envelope !== "object" || envelope === null || !("error" in envelope)) return;
  const err = (envelope as { error?: { message?: string; data?: unknown; code?: number } }).error;
  if (!err) return;
  throw new OdooRpcError(appendConfigHints(rpcUserMessage(err.message, err.data)), err.code, err.data);
}

export async function authenticate(baseUrl: string, db: string, login: string, password: string): Promise<number> {
  const uid = await jsonRpc<number | false>(baseUrl, "common", "authenticate", [db, login, password, {}]);
  if (uid === false || uid === 0) {
    throw new OdooRpcError("Authentication failed. Check database name, email, and password or API key.");
  }
  return uid;
}

export async function executeKw<T>(
  baseUrl: string,
  db: string,
  uid: number,
  password: string,
  model: string,
  method: string,
  args: unknown[],
  kwargs: Record<string, unknown> = {},
): Promise<T> {
  return jsonRpc<T>(baseUrl, "object", "execute_kw", [db, uid, password, model, method, args, kwargs]);
}
