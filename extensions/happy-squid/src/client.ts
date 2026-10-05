import { LocalStorage } from "@raycast/api";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";
import { type TaskControlRequest, type TaskControlResponse } from "./vendor/task-control";

const NETWORK_TIMEOUT_MS = 10_000;
export const RAYCAST_SUPABASE_URL = process.env.HS_RAYCAST_SUPABASE_URL ?? "https://dtptcpfaeqstzzdumfeb.supabase.co";

export function createTaskClient(): SupabaseClient {
  return createClient(
    RAYCAST_SUPABASE_URL,
    process.env.HS_RAYCAST_SUPABASE_KEY ?? "sb_publishable_Y5IcTkTqpNR_-zL_A9nXag_9IqfWME7",
    {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
        storage: {
          getItem: async (key) => (await LocalStorage.getItem<string>(key)) ?? null,
          setItem: (key, value) => LocalStorage.setItem(key, value),
          removeItem: (key) => LocalStorage.removeItem(key),
        },
      },
      global: {
        fetch: (input, init) =>
          fetch(input, {
            ...init,
            signal: AbortSignal.any([AbortSignal.timeout(NETWORK_TIMEOUT_MS), ...(init?.signal ? [init.signal] : [])]),
          }),
      },
    },
  );
}

export async function requestTasks(client: SupabaseClient, request: TaskControlRequest): Promise<TaskControlResponse> {
  const { data, error } = await client.functions.invoke("tasks", { body: { id: randomUUID(), request } });
  if (error || !data || typeof data.ok !== "boolean") {
    throw new Error(
      request.action.kind === "snapshot"
        ? "Could not connect to Happy Squid. Check your connection."
        : "Could not confirm that action. Refresh Tasks before trying again.",
    );
  }
  return data as TaskControlResponse;
}
