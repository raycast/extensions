import { beforeEach, expect, test, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { beginHappySquidConnection, cancelHappySquidConnection, completeHappySquidConnection } from "../src/handoff";
import { getApplications, LocalStorage, open } from "./raycast-api";
import { parseRaycastAuthorization, RAYCAST_REDIRECT_URI } from "../src/vendor/raycast-auth";

const storage = new Map<string, string>();
const invoke = vi.fn();
const verifyOtp = vi.fn();
const getSession = vi.fn();
const client = { functions: { invoke }, auth: { verifyOtp, getSession } } as unknown as SupabaseClient;

beforeEach(() => {
  vi.clearAllMocks();
  storage.clear();
  LocalStorage.setItem.mockImplementation(async (key, value) => {
    storage.set(key, value);
  });
  LocalStorage.getItem.mockImplementation(async (key) => storage.get(key));
  LocalStorage.removeItem.mockImplementation(async (key) => {
    storage.delete(key);
  });
  getApplications.mockResolvedValue([{ bundleId: "com.logik.app" }]);
  open.mockResolvedValue(undefined);
  invoke.mockResolvedValue({ data: { tokenHash: "one-time-handoff" }, error: null });
  verifyOtp.mockResolvedValue({ error: null });
  getSession.mockResolvedValue({ data: { session: null } });
});

function authorization() {
  return parseRaycastAuthorization(new URL(open.mock.calls.at(-1)![0]).searchParams)!;
}

test("approval survives closing and reopening Raycast; only the public challenge leaves it", async () => {
  await beginHappySquidConnection(false);
  const request = authorization();
  const pending = JSON.parse([...storage.values()][0]);
  expect(open.mock.calls[0][0]).toMatch(/^happysquid-raycast:\/\/connect\?/);
  expect(open.mock.calls[0][0]).not.toContain(pending.verifier);
  expect(request.redirectUri).toBe(RAYCAST_REDIRECT_URI);
  expect(invoke).not.toHaveBeenCalled();
  await completeHappySquidConnection(client, { state: request.state, code: "one-time-code" });
  expect(invoke).toHaveBeenCalledExactlyOnceWith("raycast-auth", {
    body: {
      mode: "exchange",
      clientId: request.clientId,
      code: "one-time-code",
      verifier: pending.verifier,
      redirectUri: RAYCAST_REDIRECT_URI,
    },
  });
  expect(verifyOtp).toHaveBeenCalledExactlyOnceWith({ token_hash: "one-time-handoff", type: "magiclink" });
  expect(storage.size).toBe(0);
  await completeHappySquidConnection(client, { state: request.state, code: "one-time-code" });
  expect(invoke).toHaveBeenCalledOnce();
});

test.each([true, false])("browser sign-in needs no desktop app (explicit browser: %s)", async (browserOnly) => {
  getApplications.mockResolvedValue([]);
  await beginHappySquidConnection(browserOnly);
  expect(new URL(open.mock.calls[0][0]).pathname).toBe("/functions/v1/raycast-auth");
});

test("a forged or superseded callback cannot consume the current pending connection", async () => {
  await beginHappySquidConnection(false);
  const old = authorization();
  await beginHappySquidConnection(false);
  await completeHappySquidConnection(client, { state: old.state, code: "old-code" });
  await completeHappySquidConnection(client, { state: "forged", code: "old-code" });
  expect(invoke).not.toHaveBeenCalled();
  expect(storage.size).toBe(1);
});

test.each(["cancel", "expire", "email"])(
  "%s leaves the other account signed in and never exchanges",
  async (action) => {
    await beginHappySquidConnection(false);
    const request = authorization();
    if (action === "email") await cancelHappySquidConnection();
    if (action === "expire") vi.spyOn(Date, "now").mockReturnValue(Date.now() + 6 * 60_000);
    try {
      await completeHappySquidConnection(client, {
        state: request.state,
        code: "unused-code",
        ...(action === "cancel" ? { error: "access_denied" } : {}),
      });
      expect(invoke).not.toHaveBeenCalled();
      expect(storage.size).toBe(0);
    } finally {
      vi.restoreAllMocks();
    }
  },
);

test("cancelling while exchange is outstanding cannot sign in later", async () => {
  await beginHappySquidConnection(false);
  invoke.mockImplementationOnce(async () => {
    await cancelHappySquidConnection();
    return { data: { tokenHash: "unused-handoff" }, error: null };
  });
  await completeHappySquidConnection(client, { state: authorization().state, code: "code" });
  expect(verifyOtp).not.toHaveBeenCalled();
});

test("a sign-in completed elsewhere is not replaced by an outstanding handoff", async () => {
  await beginHappySquidConnection(false);
  getSession.mockResolvedValueOnce({ data: { session: null } });
  getSession.mockResolvedValueOnce({ data: { session: { user: { id: "already-signed-in" } } } });
  await completeHappySquidConnection(client, { state: authorization().state, code: "code" });
  expect(verifyOtp).not.toHaveBeenCalled();
});

test("a failed exchange never redeems a session", async () => {
  await beginHappySquidConnection(false);
  invoke.mockResolvedValue({ data: null, error: new Error("invalid_grant") });
  await expect(completeHappySquidConnection(client, { state: authorization().state, code: "code" })).rejects.toThrow(
    "invalid_grant",
  );
  expect(verifyOtp).not.toHaveBeenCalled();
});
