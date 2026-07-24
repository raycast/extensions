import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ─── Module-level mock state ─────────────────────────────────────────────────

// Captured postgres_changes callback from channel.on()
let capturedInsertHandler: (() => void) | null = null;

// vi.hoisted runs before vi.mock factories, so these are available at hoist time.
const {
  channelMock,
  realtimeClientMock,
  getExtensionConfig,
  getAuthSession,
  readSecureDeviceId,
  ingestEncryptedPendingMessages,
} = vi.hoisted(() => {
  const _channelMock: Record<string, ReturnType<typeof vi.fn>> = {
    on: vi.fn(),
    subscribe: vi.fn(),
    unsubscribe: vi.fn(),
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const _realtimeClientMock: Record<string, any> = {
    channel: vi.fn(() => _channelMock),
    connect: vi.fn(),
    disconnect: vi.fn(async () => "ok"),
    getChannels: vi.fn(() => [_channelMock]),
    socketAdapter: { socket: { conn: {} } },
  };
  return {
    channelMock: _channelMock,
    realtimeClientMock: _realtimeClientMock,
    getExtensionConfig: vi.fn(() => ({
      supabaseUrl: "https://example.supabase.co",
      supabaseAnonKey: "test-anon-key",
      authBridgeUrl: "https://auth.example.com",
      appBaseUrl: "",
      blobRelayUrl: "",
    })),
    getAuthSession: vi.fn(async () => ({ accessToken: "jwt", authType: "supabase" })),
    readSecureDeviceId: vi.fn(async () => "device-abc" as string | null),
    ingestEncryptedPendingMessages: vi.fn(async () => []),
  };
});

vi.mock("@supabase/realtime-js", () => ({
  // Must use `function` (not arrow) so vi.fn can be called with `new`.
  RealtimeClient: vi.fn(function () {
    return realtimeClientMock;
  }),
}));
vi.mock("./config", () => ({ getExtensionConfig }));
vi.mock("./oauth", () => ({ getAuthSession }));
vi.mock("./client", () => ({
  getSharedClient: () => ({ readSecureDeviceId, ingestEncryptedPendingMessages }),
}));

// ─── Import under test (static — mock declarations above are hoisted) ───────

import { subscribeToInboxUpdates } from "./realtime";

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Flush microtasks so the async setup inside subscribeToInboxUpdates completes. */
function flushMicrotasks(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

function neverEndingSseResponse(): Response {
  return new Response(new ReadableStream({ start() {} }), {
    status: 200,
    headers: { "Content-Type": "text/event-stream" },
  });
}

function sseResponse(frames: string[]): Response {
  const encoder = new TextEncoder();
  return new Response(
    new ReadableStream({
      start(controller) {
        for (const frame of frames) controller.enqueue(encoder.encode(frame));
        controller.close();
      },
    }),
    { status: 200, headers: { "Content-Type": "text/event-stream" } },
  );
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("subscribeToInboxUpdates", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    capturedInsertHandler = null;
    // Re-apply default mock implementations after clearAllMocks.
    channelMock.on.mockImplementation((_event: string, _config: unknown, handler: () => void) => {
      capturedInsertHandler = handler;
      return channelMock;
    });
    channelMock.subscribe.mockReturnThis();
    realtimeClientMock.channel.mockReturnValue(channelMock);
    getAuthSession.mockResolvedValue({ accessToken: "jwt", authType: "supabase" });
    readSecureDeviceId.mockResolvedValue("device-abc");
    ingestEncryptedPendingMessages.mockResolvedValue([]);
    vi.unstubAllGlobals();
  });

  afterEach(() => {
    capturedInsertHandler = null;
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("calls the update callback when a realtime INSERT event arrives", async () => {
    const onUpdate = vi.fn();

    subscribeToInboxUpdates(onUpdate);
    await flushMicrotasks();

    // Simulate a new push arriving via realtime
    capturedInsertHandler?.();

    expect(onUpdate).toHaveBeenCalledOnce();
  });

  it("subscribes with a filter scoped to the current device ID", async () => {
    subscribeToInboxUpdates(vi.fn());
    await flushMicrotasks();

    expect(channelMock.on).toHaveBeenCalledWith(
      "postgres_changes",
      expect.objectContaining({ filter: "target_device_id=eq.device-abc" }),
      expect.any(Function),
    );
  });

  it("does not call the callback after unsubscribe (cancelled guard)", async () => {
    const onUpdate = vi.fn();

    const unsubscribe = subscribeToInboxUpdates(onUpdate);
    await flushMicrotasks();

    unsubscribe();

    // Simulate a late-arriving INSERT event after teardown
    capturedInsertHandler?.();

    expect(onUpdate).not.toHaveBeenCalled();
  });

  it("disconnects the WebSocket client on unsubscribe", async () => {
    const unsubscribe = subscribeToInboxUpdates(vi.fn());
    await flushMicrotasks();

    unsubscribe();

    expect(realtimeClientMock.disconnect).toHaveBeenCalledOnce();
  });

  it("skips subscription when device ID is not yet available", async () => {
    readSecureDeviceId.mockResolvedValue(null);

    subscribeToInboxUpdates(vi.fn());
    await flushMicrotasks();

    expect(realtimeClientMock.channel).not.toHaveBeenCalled();
  });

  it("continues delivering events after simulated reconnect (reconcile on reconnect)", async () => {
    const onUpdate = vi.fn();

    subscribeToInboxUpdates(onUpdate);
    await flushMicrotasks();

    // First push
    capturedInsertHandler?.();
    // Simulate reconnect — library calls the same handler again for new events
    capturedInsertHandler?.();

    expect(onUpdate).toHaveBeenCalledTimes(2);
  });

  it("backs off reconnects when streams close after ready without useful events", async () => {
    vi.useFakeTimers();
    const onUpdate = vi.fn();
    getAuthSession.mockResolvedValue({ accessToken: "nb_test_key", authType: "api_key" });
    const fetchMock = vi.fn(async () => sseResponse(['event: ready\ndata: {"device_id":"device-abc"}\n\n']));
    vi.stubGlobal("fetch", fetchMock);

    const unsubscribe = subscribeToInboxUpdates(onUpdate);
    await vi.advanceTimersByTimeAsync(0);
    await Promise.resolve();
    await Promise.resolve();
    expect(fetchMock).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(999);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    await Promise.resolve();
    await Promise.resolve();
    expect(fetchMock).toHaveBeenCalledTimes(2);

    await vi.advanceTimersByTimeAsync(1999);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(1);
    await Promise.resolve();
    await Promise.resolve();
    expect(fetchMock).toHaveBeenCalledTimes(3);
    unsubscribe();
  });

  it("does not retry permanent SSE authorization failures", async () => {
    vi.useFakeTimers();
    getAuthSession.mockResolvedValue({ accessToken: "nb_test_key", authType: "api_key" });
    const fetchMock = vi.fn(async () => new Response("Forbidden", { status: 403 }));
    vi.stubGlobal("fetch", fetchMock);

    subscribeToInboxUpdates(vi.fn());
    await vi.advanceTimersByTimeAsync(0);
    await Promise.resolve();
    await Promise.resolve();
    expect(fetchMock).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(60_000);
    await Promise.resolve();
    await Promise.resolve();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("reconnects when the SSE stream stops receiving heartbeats", async () => {
    vi.useFakeTimers();
    getAuthSession.mockResolvedValue({ accessToken: "nb_test_key", authType: "api_key" });
    const fetchMock = vi.fn(async () => neverEndingSseResponse());
    vi.stubGlobal("fetch", fetchMock);

    const unsubscribe = subscribeToInboxUpdates(vi.fn());
    await vi.advanceTimersByTimeAsync(0);
    await Promise.resolve();
    await Promise.resolve();
    expect(fetchMock).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(60_000);
    await Promise.resolve();
    await Promise.resolve();
    await vi.advanceTimersByTimeAsync(1000);
    await Promise.resolve();
    await Promise.resolve();
    expect(fetchMock).toHaveBeenCalledTimes(2);
    unsubscribe();
  });

  it("reconnects after server-sent error events", async () => {
    vi.useFakeTimers();
    getAuthSession.mockResolvedValue({ accessToken: "nb_test_key", authType: "api_key" });
    const fetchMock = vi.fn(async () => sseResponse(['event: error\ndata: {"error":"database unavailable"}\n\n']));
    vi.stubGlobal("fetch", fetchMock);

    const unsubscribe = subscribeToInboxUpdates(vi.fn());
    await vi.advanceTimersByTimeAsync(0);
    await Promise.resolve();
    await Promise.resolve();
    expect(fetchMock).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(1000);
    await Promise.resolve();
    await Promise.resolve();
    expect(fetchMock).toHaveBeenCalledTimes(2);
    unsubscribe();
  });

  it("retries 401 SSE auth failures with backoff", async () => {
    vi.useFakeTimers();
    getAuthSession.mockResolvedValue({ accessToken: "nb_test_key", authType: "api_key" });
    const fetchMock = vi.fn(async () => new Response("Unauthorized", { status: 401 }));
    vi.stubGlobal("fetch", fetchMock);

    const unsubscribe = subscribeToInboxUpdates(vi.fn());
    await vi.advanceTimersByTimeAsync(0);
    await Promise.resolve();
    await Promise.resolve();
    expect(fetchMock).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(1000);
    await Promise.resolve();
    await Promise.resolve();
    expect(fetchMock).toHaveBeenCalledTimes(2);
    unsubscribe();
  });

  it("uses Nibit SSE and ingests streamed pending rows for API-key sessions", async () => {
    const onUpdate = vi.fn();
    getAuthSession.mockResolvedValue({ accessToken: "nb_test_key", authType: "api_key" });
    const pendingRow = {
      id: "11111111-1111-4111-8111-111111111111",
      user_id: "user-1",
      target_device_id: "device-abc",
      channel: "push",
      message_type: "text",
      sender_device_id: "22222222-2222-4222-8222-222222222222",
      correlation_id: null,
      encrypted_payload: "encrypted",
      requires_auth: false,
      payload_schema_version: 2,
      created_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 60_000).toISOString(),
    };
    const fetchMock = vi.fn(async () =>
      sseResponse([
        'event: ready\ndata: {"device_id":"device-abc"}\n\n',
        `event: pending_messages\ndata: ${JSON.stringify({ messages: [pendingRow] })}\n\n`,
      ]),
    );
    vi.stubGlobal("fetch", fetchMock);

    const unsubscribe = subscribeToInboxUpdates(onUpdate);
    await flushMicrotasks();
    await flushMicrotasks();
    unsubscribe();

    expect(realtimeClientMock.channel).not.toHaveBeenCalled();
    expect(fetchMock).toHaveBeenCalledWith(
      "https://auth.example.com/v1/realtime/pushes",
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: "Bearer nb_test_key", Accept: "text/event-stream" }),
      }),
    );
    expect(ingestEncryptedPendingMessages).toHaveBeenCalledWith([pendingRow]);
    expect(onUpdate).toHaveBeenCalledWith({ alreadySynced: true });
  });
});
