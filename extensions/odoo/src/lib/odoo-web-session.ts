import { normalizeBaseUrl, OdooRpcError, throwIfWebJsonRpcError } from "./odoo-jsonrpc";

function parseSessionId(response: Response): string | undefined {
  const h = response.headers as Headers & { getSetCookie?: () => string[] };
  let blob = "";
  if (typeof h.getSetCookie === "function") {
    blob = h.getSetCookie().join("; ");
  }
  if (!blob) {
    blob = response.headers.get("set-cookie") ?? "";
  }
  const m = /session_id=([^;]+)/.exec(blob);
  return m?.[1];
}

type WebSessionAuthResult = {
  uid?: number | null;
  [key: string]: unknown;
};

function randomJsonRpcId(): number {
  return Math.floor(Math.random() * 1_000_000_000);
}

/**
 * Same login as the Odoo web UI: establishes `session_id` cookie semantics for JSON routes.
 */
export async function webSessionAuthenticate(
  baseUrl: string,
  db: string,
  login: string,
  password: string,
): Promise<string> {
  const root = normalizeBaseUrl(baseUrl);
  const url = `${root}/web/session/authenticate`;
  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        method: "call",
        params: { db, login, password },
        id: randomJsonRpcId(),
      }),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new OdooRpcError(`Network error calling ${url}: ${msg}`);
  }

  const text = await response.text();
  let envelope: { result?: WebSessionAuthResult; error?: unknown };
  try {
    envelope = JSON.parse(text) as typeof envelope;
  } catch {
    throw new OdooRpcError(`Invalid JSON from web auth. First bytes: ${text.slice(0, 200)}`);
  }

  throwIfWebJsonRpcError(envelope);

  const sessionId = parseSessionId(response);
  const uid = envelope.result?.uid;

  if (!sessionId) {
    throw new OdooRpcError(
      "Web login did not return a session cookie (session_id). Check HTTPS, proxies, and Odoo web configuration.",
    );
  }

  if (uid == null || uid === false) {
    throw new OdooRpcError("Web authentication failed. Check email and password or API key.");
  }

  return sessionId;
}

/**
 * Toggles check-in/out exactly like the Odoo systray (same permissions as the UI).
 */
export async function systrayAttendanceToggle(baseUrl: string, sessionId: string): Promise<void> {
  const root = normalizeBaseUrl(baseUrl);
  const url = `${root}/hr_attendance/systray_check_in_out`;
  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `session_id=${sessionId}`,
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        method: "call",
        params: {},
        id: randomJsonRpcId(),
      }),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new OdooRpcError(`Network error calling ${url}: ${msg}`);
  }

  const text = await response.text();
  let envelope: unknown;
  try {
    envelope = JSON.parse(text);
  } catch {
    throw new OdooRpcError(`Invalid JSON from systray route. First bytes: ${text.slice(0, 200)}`);
  }

  throwIfWebJsonRpcError(envelope);
}
