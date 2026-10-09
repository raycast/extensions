import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { requestTasks } from "../src/client";

vi.mock("@supabase/supabase-js", () => ({ createClient: vi.fn() }));

const request = {
  action: { kind: "start" as const, description: "Write launch notes", durationMinutes: 5 },
  expectedTaskId: null,
  expectedReviewId: null,
};
const invoke = vi.fn();
const from = vi.fn(() => {
  throw new Error("Raycast must not wait on a device queue");
});
const client = { functions: { invoke }, from } as unknown as SupabaseClient;
beforeEach(() => vi.clearAllMocks());
afterEach(() => vi.unstubAllEnvs());

test("environment overrides cannot send Raycast accounts to another backend", async () => {
  vi.stubEnv("HS_RAYCAST_SUPABASE_URL", "https://other-backend.invalid");
  vi.stubEnv("HS_RAYCAST_SUPABASE_KEY", "other-key");
  vi.resetModules();
  const { createTaskClient } = await import("../src/client");
  createTaskClient();
  expect(createClient).toHaveBeenCalledExactlyOnceWith(
    "https://dtptcpfaeqstzzdumfeb.supabase.co",
    "sb_publishable_Y5IcTkTqpNR_-zL_A9nXag_9IqfWME7",
    expect.any(Object),
  );
});

test("task actions return the backend response directly without selecting a device or polling its queue", async () => {
  const response = { ok: true, snapshot: { review: { status: "checking" } } };
  invoke.mockResolvedValue({ data: response, error: null });
  expect(await requestTasks(client, request)).toEqual(response);
  expect(invoke).toHaveBeenCalledExactlyOnceWith("tasks", { body: { id: expect.any(String), request } });
  expect(from).not.toHaveBeenCalled();
});

test("backend refusals preserve their message and authoritative task snapshot", async () => {
  const response = { ok: false, error: "The task review has changed.", snapshot: { task: null } };
  invoke.mockResolvedValue({ data: response, error: null });
  expect(await requestTasks(client, request)).toEqual(response);
});

test.each([
  { error: new Error("offline"), data: null },
  { error: null, data: null },
  { error: null, data: {} },
])("a missing response is reported without replaying the task action", async (result) => {
  invoke.mockResolvedValue(result);
  await expect(requestTasks(client, request)).rejects.toThrow(
    "Could not confirm that action. Refresh Tasks before trying again.",
  );
  expect(invoke).toHaveBeenCalledTimes(1);
});

test("snapshot connection errors do not ask the user to open a browser extension", async () => {
  invoke.mockResolvedValue({ data: null, error: new Error("offline") });
  await expect(requestTasks(client, { ...request, action: { kind: "snapshot" } })).rejects.toThrow(
    "Could not connect to Happy Squid. Check your connection.",
  );
});
