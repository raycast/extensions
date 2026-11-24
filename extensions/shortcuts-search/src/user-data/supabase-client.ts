import { createClient as createSupabaseClient, type SupabaseClient } from "@supabase/supabase-js";
import WebSocket from "ws";
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from "../auth/config";

interface UserDataClientOptions {
  accessToken: () => Promise<string | null>;
  auth: {
    persistSession: false;
    autoRefreshToken: false;
    detectSessionInUrl: false;
  };
  realtime: {
    transport: typeof WebSocket;
  };
}

type ClientFactory<T> = (url: string, publishableKey: string, options: UserDataClientOptions) => T;

export function createUserDataClient<T>(accessToken: () => Promise<string | null>, factory: ClientFactory<T>): T;
export function createUserDataClient(accessToken: () => Promise<string | null>): SupabaseClient;
export function createUserDataClient<T>(
  accessToken: () => Promise<string | null>,
  factory: ClientFactory<T> = createSupabaseClient as unknown as ClientFactory<T>
): T {
  return factory(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    accessToken,
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    realtime: {
      transport: WebSocket,
    },
  });
}

export function getUserDataClient(token: string): SupabaseClient {
  return createUserDataClient(async () => {
    const { isAccessTokenCurrent } = await import("../auth/session");
    if (!(await isAccessTokenCurrent(token))) throw new Error("Account changed. Please retry.");
    return token;
  });
}
