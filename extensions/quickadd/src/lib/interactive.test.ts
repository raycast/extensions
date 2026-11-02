import { type Server, createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { text } from "node:stream/consumers";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  type Handoff,
  type InteractiveSession,
  type SessionState,
  doneMessage,
  driveSession,
  firstEvent,
} from "./interactive";

let server: Server | undefined;

afterEach(() => {
  server?.closeAllConnections();
  server?.close();
});

/** Like QuickAdd's server, one poll parks at a time and a second one gets an idle at once. */
async function promptServer(
  queue: object[] = [],
  {
    dropReplies = false,
    rejectReply,
  }: {
    dropReplies?: boolean;
    rejectReply?: { status: number; body: object };
  } = {},
) {
  const requests: string[] = [];
  const dropped: string[] = [];
  let parked: ((event: object) => void) | null = null;
  server = createServer(async (req, res) => {
    await text(req);
    const path = new URL(req.url ?? "/", "http://127.0.0.1").pathname;
    requests.push(`${req.method} ${path}`);
    res.on("close", () => {
      if (!res.writableFinished) dropped.push(`${req.method} ${path}`);
    });
    if (dropReplies && path === "/reply") return req.socket.destroy();
    const send = (body: object, status = 200) => {
      res.writeHead(status, { "content-type": "application/json" });
      res.end(JSON.stringify(body));
    };
    if (rejectReply && path === "/reply")
      return send(rejectReply.body, rejectReply.status);
    if (path !== "/poll") return send({ ok: true, interrupted: 0 });
    const event = queue.shift();
    if (event) return send(event);
    if (parked) return send({ kind: "idle" });
    const waiter = (body: object) => {
      clearTimeout(keepalive);
      if (parked === waiter) parked = null;
      send(body);
    };
    const keepalive = setTimeout(() => waiter({ kind: "idle" }), 200);
    parked = waiter;
  });
  await new Promise<void>((resolve) => server?.listen(0, "127.0.0.1", resolve));
  const session: InteractiveSession = {
    host: "127.0.0.1",
    port: (server.address() as AddressInfo).port,
    sessionId: "s",
    token: "t",
  };
  const emit = (event: object) => (parked ? parked(event) : queue.push(event));
  return { session, requests, dropped, emit };
}

function drive(session: InteractiveSession, handoff?: Handoff) {
  const states: SessionState[] = [];
  const driver = driveSession(session, {
    handoff,
    onChange: (state) => states.push(state),
  });
  return { driver, states };
}

describe("driveSession", () => {
  it("aborts the run when the user cancels while no prompt is open", async () => {
    const { session, requests } = await promptServer();
    const { driver, states } = drive(session);
    await vi.waitFor(() => expect(requests).toContain("GET /poll"));

    driver.cancel();

    await vi.waitFor(() => expect(requests).toContain("POST /abort"));
    expect(states).toEqual([{ state: "cancelled" }]);
  });

  it("aborts the run when the view goes away mid-work", async () => {
    const { session, requests } = await promptServer();
    const { driver } = drive(session, {
      kind: "prompt",
      pending: {
        requestId: "r1",
        prompt: { type: "confirm", header: "Proceed?" },
      },
    });
    driver.answer(true);
    await vi.waitFor(() => expect(requests).toContain("POST /reply"));

    driver.cancelQuietly();

    await vi.waitFor(() => expect(requests).toContain("POST /abort"));
  });

  it("aborts the run and stops polling when a reply cannot be sent", async () => {
    const { session, requests } = await promptServer([], { dropReplies: true });
    const { driver, states } = drive(session, {
      kind: "prompt",
      pending: {
        requestId: "r1",
        prompt: { type: "confirm", header: "Proceed?" },
      },
    });
    await vi.waitFor(() => expect(requests).toContain("GET /poll"));

    driver.answer(true);

    await vi.waitFor(() => expect(requests).toContain("POST /abort"));
    const pollsAtAbort = requests.filter((r) => r === "GET /poll").length;
    await new Promise((resolve) => setTimeout(resolve, 300));
    expect(requests.filter((r) => r === "POST /abort")).toHaveLength(1);
    expect(requests.filter((r) => r === "GET /poll")).toHaveLength(
      pollsAtAbort,
    );
    expect(states.at(-1)).toMatchObject({ state: "failed" });
  });

  it("fails with the server's reason and aborts when it rejects a reply", async () => {
    const { session, requests } = await promptServer([], {
      rejectReply: { status: 400, body: { ok: false, error: "too long" } },
    });
    const { driver, states } = drive(session, {
      kind: "prompt",
      pending: {
        requestId: "r1",
        prompt: { type: "input", header: "Note", multiline: false },
      },
    });
    await vi.waitFor(() => expect(requests).toContain("GET /poll"));

    driver.answer("draft");

    await vi.waitFor(() => expect(requests).toContain("POST /abort"));
    const pollsAtAbort = requests.filter((r) => r === "GET /poll").length;
    await new Promise((resolve) => setTimeout(resolve, 300));
    expect(requests.filter((r) => r === "POST /abort")).toHaveLength(1);
    expect(requests.filter((r) => r === "GET /poll")).toHaveLength(
      pollsAtAbort,
    );
    expect(states.at(-1)).toEqual({ state: "failed", message: "too long" });
  });

  it("turns a prompt type this version does not know into an unknown prompt", async () => {
    const { session } = await promptServer([
      {
        kind: "prompt",
        requestId: "r1",
        prompt: { type: "color", header: "Pick a color" },
      },
    ]);
    const { driver, states } = drive(session);
    await vi.waitFor(() =>
      expect(states).toEqual([
        {
          state: "prompt",
          pending: {
            requestId: "r1",
            prompt: { type: "unknown", wireType: "color" },
          },
        },
      ]),
    );
    driver.cancelQuietly();
  });

  it("takes over the poll of a run that raised nothing in time", async () => {
    const { session, emit } = await promptServer();
    const first = await firstEvent(session, 50);
    if (first.kind !== "poll")
      throw new Error(`expected a poll, got ${first.kind}`);

    emit({
      kind: "prompt",
      requestId: "r1",
      prompt: { type: "confirm", header: "Proceed?" },
    });
    const { driver, states } = drive(session, first);

    await vi.waitFor(() =>
      expect(states).toEqual([
        {
          state: "prompt",
          pending: {
            requestId: "r1",
            prompt: { type: "confirm", header: "Proceed?" },
          },
        },
      ]),
    );
    driver.cancelQuietly();
  });

  it("closes the handed-over poll and aborts the run on cancel", async () => {
    const { session, requests, dropped } = await promptServer();
    const first = await firstEvent(session, 50);
    if (first.kind !== "poll")
      throw new Error(`expected a poll, got ${first.kind}`);
    const { driver } = drive(session, first);

    driver.cancel();

    await vi.waitFor(() => expect(dropped).toContain("GET /poll"));
    await vi.waitFor(() => expect(requests).toContain("POST /abort"));
  });

  it("sends no abort after the run is done", async () => {
    const { session, requests } = await promptServer([
      { kind: "done", result: { ok: true } },
    ]);
    const { driver, states } = drive(session);
    await vi.waitFor(() =>
      expect(states).toEqual([{ state: "done", result: { ok: true } }]),
    );

    driver.cancel();
    driver.cancelQuietly();

    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(requests).toEqual(["GET /poll"]);
    expect(states).toEqual([{ state: "done", result: { ok: true } }]);
  });
});

describe("doneMessage", () => {
  it("names the file the run created", () => {
    expect(
      doneMessage("New note", { effect: "created", file: "Output/A.md" }),
    ).toBe("Created Output/A.md");
  });

  it("names the file the run added to", () => {
    expect(
      doneMessage("Log", { effect: "changed", file: "Output/Inbox.md" }),
    ).toBe("Added to Output/Inbox.md");
  });

  it("names the choice when the file did not change or the effect is unknown", () => {
    expect(
      doneMessage("Log", { effect: "unchanged", file: "Output/Inbox.md" }),
    ).toBe("Ran Log");
    expect(doneMessage("Macro", { effect: "unknown" })).toBe("Ran Macro");
    expect(doneMessage("Old QuickAdd", { file: "Output/A.md" })).toBe(
      "Ran Old QuickAdd",
    );
  });
});
