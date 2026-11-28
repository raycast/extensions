import {
  accessToken,
  forgetSession,
  origin,
  read,
  remove,
  saveSnapshot,
  SignedOutError,
  type Snapshot,
  tokenStore,
  write,
} from "./store";
import { ApiError, requestJson, type RateState } from "./http";
import { DeviceFlowError } from "./device-flow";
import type {
  Billing,
  DeviceCode,
  EntriesPage,
  Resources,
  Session,
  Timer,
  TokenResponse,
  Report,
} from "./types";
export const CLIENT_ID = "ttrackii-raycast";

export async function api<T>(
  path: string,
  body?: unknown,
  background = false,
): Promise<T> {
  const token = await accessToken();
  const rate = await read<RateState>("rate");
  if (
    rate &&
    rate.resetAt > Date.now() &&
    rate.remaining <= (background ? 5 : 0)
  ) {
    throw new ApiError(
      "API quota reserved for timer actions. Refresh after the quota resets.",
      429,
      rate.resetAt,
    );
  }
  try {
    const result = await requestJson<T>(origin(), path, token, body);
    if (result.rate) await write("rate", result.rate);
    return result.data;
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      await forgetSession();
      throw new SignedOutError("Your ttrackii session expired. Sign in again.");
    }
    if (error instanceof ApiError && error.status === 429)
      await write("rate", { remaining: 0, resetAt: error.retryAt });
    throw error;
  }
}
async function cached<T>(key: string, path: string, force = false): Promise<T> {
  await accessToken();
  const saved = await read<Snapshot<T>>(key);
  if (!force && saved && Date.now() - saved.savedAt < 300000) return saved.data;
  const data = await api<T>(path);
  await saveSnapshot(key, data);
  return data;
}
export const session = (force = false) =>
  cached<Session>("session", "/api/v1/session", force);
export const resources = (id: string, force = false) =>
  cached<Resources>(
    `resources:${id}`,
    `/api/v1/resources?workspaceId=${encodeURIComponent(id)}`,
    force,
  );
export async function timer(background = false) {
  const data = await api<Timer>("/api/v1/timer", undefined, background);
  await saveSnapshot("timer", data);
  return data;
}
export async function startTimer(body: {
  workspaceId: string;
  taskName: string;
  projectId: string | null;
  tagIds: string[];
  billing: Billing;
}) {
  await remove("timer");
  const data = await api<Timer>("/api/v1/timer/start", body);
  await saveSnapshot("timer", data);
  return data;
}
/** Edits the running timer in place; omitted fields stay as they are. */
export async function updateTimer(body: {
  entryId: string;
  taskName?: string;
  projectId?: string | null;
  tagIds?: string[];
  billing?: Billing;
}) {
  const data = await api<Timer>("/api/v1/timer/update", body);
  await saveSnapshot("timer", data);
  return data;
}
export async function stopTimer() {
  await remove("timer");
  const data = await api<Timer>("/api/v1/timer/stop", {});
  await saveSnapshot("timer", data);
  return data;
}
/** Totals and breakdowns only; the entries page is not used by reports. */
export function report(workspaceId: string, from: string, to: string) {
  const query = new URLSearchParams({
    workspaceId,
    from,
    to,
    scope: "mine",
    limit: "1",
  });
  return api<Report>(`/api/v1/report?${query}`);
}
/** The user's entries, newest first across all dates; `search` matches task, project, or tags. */
/** `background` marks automatic searches, which leave the last requests to timer actions. */
export function entries(
  workspaceId: string,
  search = "",
  cursor?: string,
  background = false,
) {
  const query = new URLSearchParams({ workspaceId, limit: "50" });
  if (search) query.set("q", search);
  if (cursor) query.set("cursor", cursor);
  return api<EntriesPage>(`/api/v1/entries?${query}`, undefined, background);
}
export async function deviceRequest<T>(
  path: string,
  body: unknown,
  signal: AbortSignal,
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${origin()}${path}`, {
      method: "POST",
      redirect: "error",
      credentials: "omit",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.any([signal, AbortSignal.timeout(15000)]),
    });
  } catch (error) {
    if (signal.aborted) throw error;
    throw new Error(
      "Could not reach ttrackii. Start sign-in again when connected.",
    );
  }
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const code = payload?.error ?? "server_error";
    throw new DeviceFlowError(code, deviceErrorMessage(code, payload));
  }
  if (!payload) throw new Error("Invalid sign-in response.");
  return payload as T;
}
function deviceErrorMessage(
  code: string,
  payload: { error_description?: string; message?: string } | null,
) {
  switch (code) {
    case "invalid_client":
      return `${new URL(origin()).host} doesn't support Raycast sign-in yet. Change the Server URL in the extension preferences.`;
    case "access_denied":
      return "The request was denied in the browser. Connect again to retry.";
    case "expired_token":
      return "The code expired. Connect again for a new one.";
    default:
      return (
        payload?.error_description ??
        payload?.message ??
        "Could not connect to ttrackii. Try again."
      );
  }
}
/** Revokes this Raycast session on the server, then always forgets it locally. */
export async function signOut(): Promise<{ revoked: boolean }> {
  const tokens = await tokenStore().getTokens();
  let revoked = true;
  try {
    if (tokens?.accessToken)
      await requestJson(origin(), "/api/auth/sign-out", tokens.accessToken, {});
  } catch {
    revoked = false;
  } finally {
    await forgetSession();
  }
  return { revoked };
}
export const requestCode = (signal: AbortSignal) =>
  deviceRequest<DeviceCode>(
    "/api/auth/device/code",
    { client_id: CLIENT_ID },
    signal,
  );
export const requestToken = (code: DeviceCode, signal: AbortSignal) =>
  deviceRequest<TokenResponse>(
    "/api/auth/device/token",
    {
      client_id: CLIENT_ID,
      device_code: code.device_code,
      grant_type: "urn:ietf:params:oauth:grant-type:device_code",
    },
    signal,
  );
