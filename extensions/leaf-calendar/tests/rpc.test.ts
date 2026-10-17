import { afterEach, describe, expect, it } from "vitest";
import { LeafClient, LeafError, pipePath } from "../src/lib/rpc";
import { HELLO, RpcFailure, SILENT, startFakeLeaf, type FakeLeaf } from "./fake-leaf";

const hello = { client: "Raycast", icon: "iVBORw0KGgo=", returnUrl: "raycast://extensions/me/leaf-calendar/agenda" };

let leaf: FakeLeaf | undefined;
let client: LeafClient | undefined;

afterEach(async () => {
  client?.close();
  await leaf?.close();
  client = undefined;
  leaf = undefined;
});

async function connect(handlers: Parameters<typeof startFakeLeaf>[0], timeouts = {}) {
  leaf = await startFakeLeaf({ "leaf.hello": () => HELLO, ...handlers });
  client = new LeafClient({ path: leaf.path, hello: (send) => send(hello), ...timeouts });
  return { leaf, client };
}

describe("pipePath", () => {
  it("names the pipe after the Windows user, lowercase", () => {
    expect(pipePath("Artistro08")).toBe("\\\\.\\pipe\\leaf-calendar-artistro08");
  });
});

describe("LeafClient", () => {
  it("lets a hello function say hello again on the same connection after approval_needed", async () => {
    let allowed = false;
    leaf = await startFakeLeaf({
      "leaf.hello": () => {
        if (!allowed) {
          allowed = true;
          throw new RpcFailure(-32000, "Open the connect link.", "approval_needed");
        }

        return HELLO;
      },
      "calendars.list": () => [],
    });
    client = new LeafClient({
      path: leaf.path,
      hello: async (send) => {
        const first = await send({ ...hello, askOnLink: "0123456789abcdef0123456789abcdef" }).catch((e) => e);
        expect(first).toMatchObject({ code: "approval_needed" });
        return send(hello);
      },
    });

    await client.call("calendars.list");

    expect(leaf.received.map((r) => r.method)).toEqual(["leaf.hello", "leaf.hello", "calendars.list"]);
  });

  it("sends leaf.hello with the icon and return link before the first call", async () => {
    const { leaf, client } = await connect({ "calendars.list": () => [] });

    await client.call("calendars.list");

    expect(leaf.received.map((r) => r.method)).toEqual(["leaf.hello", "calendars.list"]);
    expect(leaf.received[0].params).toEqual(hello);
  });

  it("says hello once per connection, even for calls made at the same time", async () => {
    const { leaf, client } = await connect({ "calendars.list": () => [], "scheduling.links": () => [] });

    await Promise.all([client.call("calendars.list"), client.call("scheduling.links"), client.call("calendars.list")]);

    expect(leaf.received.map((r) => r.method)).toEqual([
      "leaf.hello",
      "calendars.list",
      "scheduling.links",
      "calendars.list",
    ]);
  });

  it("writes JSON-RPC 2.0, one message per line, with params as an object", async () => {
    const { leaf, client } = await connect({ "calendars.list": () => [] });

    await client.call("calendars.list");

    const request = JSON.parse(leaf.received[1].raw);
    expect(request).toEqual({ jsonrpc: "2.0", id: 2, method: "calendars.list", params: {} });
  });

  it("never sends params that were left out, since Leaf Calendar refuses unknown and mistyped members", async () => {
    const { leaf, client } = await connect({ "events.create": () => ({ id: "ZQpx" }) });

    await client.call("events.create", {
      title: "Coffee",
      start: "2026-10-15T10:00:00-04:00",
      end: "2026-10-15T10:30:00-04:00",
      calendarId: undefined,
      guests: undefined,
    });

    expect(leaf.received[1].raw).not.toContain("calendarId");
    expect(leaf.received[1].raw).not.toContain("null");
    expect(leaf.received[1].params).toEqual({
      title: "Coffee",
      start: "2026-10-15T10:00:00-04:00",
      end: "2026-10-15T10:30:00-04:00",
    });
  });

  it("returns each call's own result", async () => {
    const { client } = await connect({
      "events.get": (p) => ({ id: p.id, title: `Event ${p.id}` }),
    });

    const [a, b] = await Promise.all([client.call("events.get", { id: "a" }), client.call("events.get", { id: "b" })]);

    expect(a.title).toBe("Event a");
    expect(b.title).toBe("Event b");
  });

  it("turns Leaf Calendar's errors into LeafError with data.code", async () => {
    const { client } = await connect({
      "events.get": () => {
        throw new RpcFailure(-32000, "No event with that ID.", "not_found");
      },
    });

    const error = await client.call("events.get", { id: "gone" }).catch((e) => e);

    expect(error).toBeInstanceOf(LeafError);
    expect(error.code).toBe("not_found");
    expect(error.message).toBe("No event with that ID.");
  });

  it("names invalid params and other JSON-RPC errors", async () => {
    const { client } = await connect({
      "events.list": () => {
        throw new RpcFailure(-32602, "start must be a time with an offset.");
      },
    });

    await expect(client.call("events.list", { start: "x", end: "y" })).rejects.toMatchObject({ code: "invalid_params" });
    await expect(client.call("app.showDay", { date: "2026-10-14" })).rejects.toMatchObject({ code: "failed" });
  });

  it("keeps the connection after an error", async () => {
    const { leaf, client } = await connect({
      "events.get": () => {
        throw new RpcFailure(-32000, "No event with that ID.", "not_found");
      },
      "calendars.list": () => [],
    });

    await client.call("events.get", { id: "gone" }).catch(() => undefined);
    await client.call("calendars.list");

    expect(leaf.received.filter((r) => r.method === "leaf.hello")).toHaveLength(1);
  });

  it("fails with not_approved when Leaf Calendar refuses the app, and asks again on the next call", async () => {
    let allowed = false;
    const { leaf, client } = await connect({
      "leaf.hello": () => {
        if (!allowed) {
          throw new RpcFailure(-32000, "You didn't allow this app to connect to Leaf Calendar.", "not_approved", true);
        }

        return HELLO;
      },
      "calendars.list": () => [],
    });

    await expect(client.call("calendars.list")).rejects.toMatchObject({ code: "not_approved" });

    allowed = true;
    await expect(client.call("calendars.list")).resolves.toEqual([]);
    expect(leaf.received.filter((r) => r.method === "leaf.hello")).toHaveLength(2);
  });

  it("fails with not_running when there's no pipe", async () => {
    client = new LeafClient({ path: "\\\\.\\pipe\\leaf-calendar-nobody-here", hello: (send) => send(hello) });

    await expect(client.call("calendars.list")).rejects.toMatchObject({ code: "not_running" });
  });

  it("fails with timeout when Leaf Calendar doesn't answer", async () => {
    const { client } = await connect({ "calendars.list": () => SILENT }, { timeoutMs: 50 });

    await expect(client.call("calendars.list")).rejects.toMatchObject({ code: "timeout" });
  });

  it("fails what's waiting when Leaf Calendar closes the connection, then reconnects", async () => {
    let drop = true;
    const { leaf, client } = await connect({
      "calendars.list": () => {
        if (drop) {
          drop = false;
          throw new RpcFailure(-32603, "Leaf Calendar couldn't do that.", undefined, true);
        }

        return [];
      },
      "scheduling.links": () => SILENT,
    });

    const waiting = client.call("scheduling.links");
    await client.call("calendars.list").catch(() => undefined);
    await expect(waiting).rejects.toMatchObject({ code: "disconnected" });

    await expect(client.call("calendars.list")).resolves.toEqual([]);
    expect(leaf.received.filter((r) => r.method === "leaf.hello")).toHaveLength(2);
  });

  it("ignores an old connection closing after a retry has started", async () => {
    let refuse = true;
    const { client } = await connect(
      {
        "leaf.hello": () => {
          if (refuse) {
            refuse = false;
            throw new RpcFailure(-32000, "Not now.");
          }

          return HELLO;
        },
        "scheduling.links": () => SILENT,
      },
      { timeoutMs: 300 },
    );

    await expect(client.call("calendars.list")).rejects.toMatchObject({ code: "failed" });
    await expect(client.call("scheduling.links")).rejects.toMatchObject({ code: "timeout" });
  });

  it("reads replies split across chunks and several replies in one chunk", async () => {
    const { client } = await connect({ "events.get": (p) => ({ id: p.id, title: "x".repeat(200_000) }) });

    const results = await Promise.all(["a", "b", "c"].map((id) => client!.call("events.get", { id })));

    expect(results.map((r) => r.id)).toEqual(["a", "b", "c"]);
    expect(results[0].title).toHaveLength(200_000);
  });
});
