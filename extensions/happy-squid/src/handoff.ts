import { getApplications, LocalStorage, open } from "@raycast/api";
import { createHash, randomBytes } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  RAYCAST_APP_URL,
  RAYCAST_CLIENT_ID,
  RAYCAST_REDIRECT_URI,
  raycastAuthorizationParams,
} from "./vendor/raycast-auth";
import { RAYCAST_SUPABASE_URL } from "./client";

const PENDING_CONNECTION_KEY = "happy-squid.pending-connection";
const CONNECTION_TTL_MS = 5 * 60_000;

interface PendingConnection {
  verifier: string;
  state: string;
  expiresAt: number;
}

export interface ConnectionCallback {
  state: string;
  code?: string;
  error?: string;
}

export async function cancelHappySquidConnection(): Promise<void> {
  await LocalStorage.removeItem(PENDING_CONNECTION_KEY);
}

export async function beginHappySquidConnection(browserOnly: boolean): Promise<void> {
  const pending: PendingConnection = {
    verifier: randomBytes(32).toString("base64url"),
    state: randomBytes(32).toString("base64url"),
    expiresAt: Date.now() + CONNECTION_TTL_MS,
  };
  await LocalStorage.setItem(PENDING_CONNECTION_KEY, JSON.stringify(pending));
  const desktop = !browserOnly && (await getApplications()).some((app) => app.bundleId === "com.logik.app");
  const parameters = raycastAuthorizationParams({
    clientId: RAYCAST_CLIENT_ID,
    challenge: createHash("sha256").update(pending.verifier).digest("base64url"),
    redirectUri: RAYCAST_REDIRECT_URI,
    state: pending.state,
  });
  await open(`${desktop ? RAYCAST_APP_URL : `${RAYCAST_SUPABASE_URL}/functions/v1/raycast-auth`}?${parameters}`);
}

export async function completeHappySquidConnection(
  client: SupabaseClient,
  callback: ConnectionCallback,
): Promise<void> {
  const stored = await LocalStorage.getItem<string>(PENDING_CONNECTION_KEY);
  if (!stored) return;
  const pending = JSON.parse(stored) as PendingConnection;
  if (callback.state !== pending.state) return;
  if (pending.expiresAt <= Date.now() || callback.error || !callback.code) {
    await cancelHappySquidConnection();
    return;
  }
  const { data: existing } = await client.auth.getSession();
  if (existing.session) {
    await cancelHappySquidConnection();
    return;
  }
  const { data, error } = await client.functions.invoke("raycast-auth", {
    body: {
      mode: "exchange",
      clientId: RAYCAST_CLIENT_ID,
      code: callback.code,
      verifier: pending.verifier,
      redirectUri: RAYCAST_REDIRECT_URI,
    },
  });
  if (error || typeof data?.tokenHash !== "string") throw error ?? new Error("Missing handoff token");
  const { data: account } = await client.auth.getSession();
  // Another login or a newer connection must win over an outstanding exchange.
  if (account.session || (await LocalStorage.getItem(PENDING_CONNECTION_KEY)) !== stored) return;
  const { error: signInError } = await client.auth.verifyOtp({ token_hash: data.tokenHash, type: "magiclink" });
  if (signInError) throw signInError;
  if ((await LocalStorage.getItem(PENDING_CONNECTION_KEY)) === stored) await cancelHappySquidConnection();
}
