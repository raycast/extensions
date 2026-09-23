import { randomUUID } from "node:crypto";
import { diagnostic } from "./diagnostics";

const CLIENT_ID = "client_01JZJ0XBDAT8PHJWQY09Y0VD61";
const AUTH_URL = "https://auth.granola.ai/user_management";

export class GranolaSignInError extends Error {
  constructor(
    public kind: "declined" | "expired" | "connection" | "unknown",
    message: string,
  ) {
    super(message);
    this.name = "GranolaSignInError";
  }
}

export interface DeviceGrant {
  device_code: string;
  user_code: string;
  verification_uri_complete: string;
  expires_in: number;
  interval: number;
}

async function request(endpoint: string, values: Record<string, string>, signal?: AbortSignal) {
  const requestId = randomUUID();
  const started = Date.now();
  const target = `auth.granola.ai/user_management/${endpoint}`;
  const response = await fetch(`${AUTH_URL}/${endpoint}`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: CLIENT_ID, ...values }),
    signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(20_000)]) : AbortSignal.timeout(20_000),
  }).catch(() => {
    diagnostic("auth.request_failed", {
      endpoint: target,
      requestId,
      durationMs: Date.now() - started,
      code: signal?.aborted ? "cancelled" : "network_error",
    });
    signal?.throwIfAborted();
    throw new GranolaSignInError("connection", `Granola sign-in could not be reached. Reference: ${requestId}`);
  });
  diagnostic("auth.response", {
    endpoint: target,
    method: "POST",
    requestId,
    status: response.status,
    durationMs: Date.now() - started,
  });
  let body: Record<string, unknown>;
  try {
    const value: unknown = await response.json();
    if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error();
    body = value as Record<string, unknown>;
  } catch {
    diagnostic("auth.invalid_response", { requestId, status: response.status });
    throw new Error(`Granola returned an invalid sign-in response (HTTP ${response.status}).`);
  }
  if (
    ["authorization_pending", "slow_down", "invalid_grant", "access_denied", "expired_token"].includes(
      String(body.error),
    )
  )
    diagnostic("auth.outcome", { requestId, code: String(body.error) });
  return { response, body };
}

export const exchangeToken = (values: Record<string, string>, signal?: AbortSignal) =>
  request("authenticate", values, signal);

export async function requestDeviceGrant(signal?: AbortSignal): Promise<DeviceGrant> {
  const { response, body } = await request("authorize/device", {}, signal);
  if (!response.ok) throw new Error(`Could not start Granola sign-in (HTTP ${response.status}). Please try again.`);
  if (
    typeof body.device_code !== "string" ||
    !body.device_code ||
    typeof body.user_code !== "string" ||
    !body.user_code ||
    typeof body.verification_uri_complete !== "string" ||
    typeof body.expires_in !== "number" ||
    body.expires_in <= 0 ||
    !Number.isFinite(body.expires_in)
  ) {
    throw new Error("Granola returned an incomplete sign-in request.");
  }
  const url = new URL(body.verification_uri_complete);
  if (url.origin !== "https://mcp-auth.granola.ai" || url.pathname !== "/device" || url.username || url.password) {
    throw new Error("Granola returned an unexpected sign-in address.");
  }
  return {
    device_code: body.device_code,
    user_code: body.user_code,
    verification_uri_complete: url.href,
    expires_in: Math.min(body.expires_in, 900),
    interval:
      typeof body.interval === "number" && Number.isFinite(body.interval) && body.interval > 0 ? body.interval : 5,
  };
}

export function parseTokens(body: Record<string, unknown>) {
  if (
    typeof body.access_token !== "string" ||
    !body.access_token ||
    typeof body.refresh_token !== "string" ||
    !body.refresh_token
  ) {
    throw new Error("Granola did not return a complete session. Please sign in again.");
  }
  let lifetime = typeof body.expires_in === "number" ? body.expires_in : 0;
  if (!lifetime) {
    try {
      const claims = JSON.parse(Buffer.from(body.access_token.split(".")[1], "base64url").toString());
      lifetime = typeof claims.exp === "number" ? claims.exp - Date.now() / 1000 : 0;
    } catch {
      /* Missing expiry must not create an indefinitely valid session. */
    }
  }
  if (!Number.isFinite(lifetime) || lifetime <= 60)
    throw new Error("Granola returned an expired session. Please sign in again.");
  return { accessToken: body.access_token, refreshToken: body.refresh_token, expiresIn: Math.floor(lifetime - 60) };
}

export function nextPoll(error: unknown, interval: number): number {
  if (error === "authorization_pending") return interval;
  if (error === "slow_down") return interval + 5;
  if (error === "access_denied")
    throw new GranolaSignInError("declined", "Sign-in was declined. Press Return to try again.");
  if (error === "expired_token")
    throw new GranolaSignInError("expired", "Your sign-in code expired. Press Return to get a new code.");
  throw new Error("Granola could not complete sign-in. Please try again.");
}
