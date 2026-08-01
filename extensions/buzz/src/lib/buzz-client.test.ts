import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createHash } from "node:crypto";
import { BuzzClient, RelayError, __resetReplaceableClock, __nextReplaceableCreatedAt } from "./buzz-client";
import { parseSecretKey, signEvent, getPublicKeyHex } from "./nostr";
import type { NostrEvent } from "./types";

const SK = parseSecretKey("0000000000000000000000000000000000000000000000000000000000000001");
const fetchMock = () => globalThis.fetch as unknown as ReturnType<typeof vi.fn>;

afterEach(() => vi.unstubAllGlobals());

/**
 * The error a rejected promise settles with, so a test can assert the WHOLE
 * message. `rejects.toThrow("...")` only substring-matches, which lets an
 * added prefix or suffix (an untruncated relay body, for instance) survive.
 */
async function rejection(promise: Promise<unknown>): Promise<Error> {
  return promise.then(
    () => {
      throw new Error("expected the promise to reject, but it resolved");
    },
    (err: Error) => err,
  );
}

/** A tag the relay sent as a bare string instead of an array. */
function stringTag(value: string): string[] {
  return value as unknown as string[];
}

/**
 * A client whose fetch is stubbed to answer a sequence of POST calls in order,
 * one response per call. A response that is an array is returned as-is (the
 * `/query` shape); an object is returned as-is too (the `/events` shape).
 * `calls` records each call's parsed JSON body, in order, for assertions.
 */
function clientWithResponses(responses: unknown[]): { client: BuzzClient; calls: { body: unknown }[] } {
  const calls: { body: unknown }[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (_url: string, init: RequestInit) => {
      const body: unknown = JSON.parse(init.body as string);
      calls.push({ body });
      const response = responses[calls.length - 1];
      return new Response(JSON.stringify(response), { status: 200 });
    }),
  );
  const client = new BuzzClient("https://relay.test", SK);
  return { client, calls };
}

function ownPubkey(): string {
  return getPublicKeyHex(SK);
}

function profileEvent(pubkey: string, content: string, created_at = 1000): NostrEvent {
  return { id: `${pubkey}-${created_at}`, pubkey, created_at, kind: 0, tags: [], content, sig: "s" };
}

function dmEvent(channelId: string, participants: string[]): NostrEvent {
  return {
    id: channelId,
    pubkey: participants[0],
    created_at: 1000,
    kind: 39000,
    tags: [["d", channelId], ["t", "dm"], ...participants.map((p) => ["p", p])],
    content: "",
    sig: "s",
  };
}

describe("BuzzClient.query", () => {
  it("posts filters as a JSON array to /query with a NIP-98 header", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify([{ id: "e1" }]), { status: 200 })),
    );
    const client = new BuzzClient("https://relay.test", SK);
    const events = await client.query([{ kinds: [39000] }]);
    expect(events).toEqual([{ id: "e1" }]);

    const [url, init] = fetchMock().mock.calls[0];
    expect(url).toBe("https://relay.test/query");
    expect(init.method).toBe("POST");
    expect((init.headers as Record<string, string>).Authorization.startsWith("Nostr ")).toBe(true);
    expect(JSON.parse(init.body as string)).toEqual([{ kinds: [39000] }]);
  });

  it("signs the NIP-98 header for exactly the request it sends", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("[]", { status: 200 })),
    );
    const client = new BuzzClient("https://relay.test", SK);
    // A non-ASCII search term, so the payload hash is only right if the header
    // hashes the very bytes the body carries.
    await client.query([{ kinds: [9], search: "café \u{1F4C5}" }]);

    const [url, init] = fetchMock().mock.calls[0];
    const header: string = (init.headers as Record<string, string>).Authorization;
    expect(header.startsWith("Nostr ")).toBe(true);
    const auth = JSON.parse(Buffer.from(header.slice("Nostr ".length), "base64").toString("utf8")) as NostrEvent;
    const authTag = (name: string) => auth.tags.find((t) => t[0] === name)?.[1];

    // The header must describe the request that actually carries it: a `u`,
    // `method` or `payload` that drifts from the real call 401s every request
    // while a header-shape-only assertion stays green.
    expect(auth.kind).toBe(27235);
    expect(authTag("u")).toBe(url);
    expect(authTag("method")).toBe(init.method);
    expect(authTag("payload")).toBe(
      createHash("sha256")
        .update(init.body as string, "utf8")
        .digest("hex"),
    );
    // NIP-98 created_at is in seconds; milliseconds would be ~1000x too large.
    expect(Math.abs(auth.created_at - Math.floor(Date.now() / 1000))).toBeLessThanOrEqual(5);
  });

  it("signs the /events URL, not the /query one, when publishing", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify({ accepted: true }), { status: 200 })),
    );
    const client = new BuzzClient("https://relay.test", SK);
    await client.publish(signEvent({ kind: 9, created_at: 1700000000, tags: [], content: "hi" }, SK));

    const [url, init] = fetchMock().mock.calls[0];
    const header: string = (init.headers as Record<string, string>).Authorization;
    const auth = JSON.parse(Buffer.from(header.slice("Nostr ".length), "base64").toString("utf8")) as NostrEvent;
    expect(url).toBe("https://relay.test/events");
    expect(auth.tags.find((t) => t[0] === "u")?.[1]).toBe("https://relay.test/events");
  });

  it("strips a trailing slash from the relay URL", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("[]", { status: 200 })),
    );
    const client = new BuzzClient("https://relay.test/", SK);
    await client.query([{ kinds: [9] }]);
    expect(fetchMock().mock.calls[0][0]).toBe("https://relay.test/query");
  });

  it("throws RelayError on a non-2xx response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("denied", { status: 401 })),
    );
    const client = new BuzzClient("https://relay.test", SK);
    await expect(client.query([{ kinds: [9] }])).rejects.toBeInstanceOf(RelayError);
  });

  it("surfaces the relay's JSON error body in the RelayError message", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(JSON.stringify({ error: "invalid: kind 20001 is only accepted via WebSocket" }), {
            status: 400,
          }),
      ),
    );
    const client = new BuzzClient("https://relay.test", SK);
    await expect(client.query([{ kinds: [9] }])).rejects.toThrow(/invalid: kind 20001/);
  });

  it("reports an unreachable relay without echoing the underlying fetch error", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("ECONNREFUSED 10.0.0.1:443 body=<secret>");
      }),
    );
    const client = new BuzzClient("https://relay.test", SK);
    await expect(client.query([{ kinds: [9] }])).rejects.toThrow("Cannot reach relay at https://relay.test");
    await expect(client.query([{ kinds: [9] }])).rejects.not.toThrow(/secret|ECONNREFUSED/);
  });

  it("omits the detail suffix when an error response has an empty body", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("", { status: 500 })),
    );
    const client = new BuzzClient("https://relay.test", SK);
    // Whole-message equality, not toThrow's substring match: a stray ": " or a
    // detail appended to the end has to fail a test whose name says "omits".
    const err = await rejection(client.query([{ kinds: [9] }]));
    expect(err.message).toBe("Relay rejected the request (status 500)");
  });

  it("still reports the status when the error body cannot be read", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: false,
        status: 502,
        text: async () => {
          throw new Error("stream closed");
        },
      })),
    );
    const client = new BuzzClient("https://relay.test", SK);
    const err = await rejection(client.query([{ kinds: [9] }]));
    expect(err.message).toBe("Relay rejected the request (status 502)");
  });

  it("uses a non-JSON error body verbatim", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("upstream timeout", { status: 504 })),
    );
    const client = new BuzzClient("https://relay.test", SK);
    const err = await rejection(client.query([{ kinds: [9] }]));
    expect(err.message).toBe("Relay rejected the request (status 504): upstream timeout");
  });

  it("bounds a long JSON relay error to 200 characters", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify({ error: "x".repeat(500) }), { status: 400 })),
    );
    const client = new BuzzClient("https://relay.test", SK);
    // Asserting the whole message pins the length: a regex for 200 x's also
    // matches an untruncated 500-character one.
    const err = await rejection(client.query([{ kinds: [9] }]));
    expect(err.message).toBe(`Relay rejected the request (status 400): ${"x".repeat(200)}`);
  });

  it("bounds a long non-JSON relay error to 200 characters", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("y".repeat(500), { status: 400 })),
    );
    const client = new BuzzClient("https://relay.test", SK);
    const err = await rejection(client.query([{ kinds: [9] }]));
    expect(err.message).toBe(`Relay rejected the request (status 400): ${"y".repeat(200)}`);
  });

  it("ignores a JSON error body whose error field is not a string", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify({ error: { code: 7 } }), { status: 400 })),
    );
    const client = new BuzzClient("https://relay.test", SK);
    // Falls back to the raw body rather than rendering "[object Object]".
    await expect(client.query([{ kinds: [9] }])).rejects.toThrow(/\{"error":\{"code":7\}\}/);
  });

  it("throws RelayError instead of a TypeError when the body is not an array", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify({ error: null }), { status: 200 })),
    );
    const client = new BuzzClient("https://relay.test", SK);
    await expect(client.query([{ kinds: [9] }])).rejects.toBeInstanceOf(RelayError);
    await expect(client.query([{ kinds: [9] }])).rejects.toThrow(/unexpected response/);
  });
});

describe("BuzzClient.publish", () => {
  it("defaults accepted to false and message to empty when the relay omits them", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify({ event_id: "abc" }), { status: 200 })),
    );
    const client = new BuzzClient("https://relay.test", SK);
    const ev = signEvent({ kind: 9, created_at: 1700000000, tags: [], content: "hi" }, SK);
    expect(await client.publish(ev)).toEqual({ accepted: false, message: "" });
  });

  it("posts a single signed event to /events and returns accepted/message", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () => new Response(JSON.stringify({ event_id: "abc", accepted: true, message: "" }), { status: 200 }),
      ),
    );
    const client = new BuzzClient("https://relay.test", SK);
    const ev = signEvent({ kind: 9, created_at: 1700000000, tags: [["h", "c"]], content: "hi" }, SK);
    const res = await client.publish(ev);
    expect(res).toEqual({ accepted: true, message: "" });

    const [url, init] = fetchMock().mock.calls[0];
    expect(url).toBe("https://relay.test/events");
    expect(JSON.parse(init.body as string).kind).toBe(9);
  });
});

function ev(partial: Partial<NostrEvent>): NostrEvent {
  return { id: "", pubkey: "", created_at: 0, kind: 0, tags: [], content: "", sig: "", ...partial };
}

describe("BuzzClient.listChannels", () => {
  it("queries kind 39000 and maps d/name/about tags", async () => {
    const client = new BuzzClient("https://relay.test", SK);
    const qSpy = vi.spyOn(client, "query").mockResolvedValue([
      ev({
        kind: 39000,
        tags: [
          ["d", "uuid-1"],
          ["name", "general"],
          ["about", "the main room"],
        ],
      }),
    ]);
    const channels = await client.listChannels();
    expect(qSpy).toHaveBeenCalledWith([{ kinds: [39000], limit: 500 }]);
    expect(channels).toEqual([{ id: "uuid-1", name: "general", about: "the main room" }]);
  });

  it("asks for the relay's documented 500-result ceiling explicitly", async () => {
    const client = new BuzzClient("https://relay.test", SK);
    const qSpy = vi.spyOn(client, "query").mockResolvedValue([]);
    await client.listChannels();
    // Channels and DM conversations share the kind:39000 space, so an
    // unlimited query silently competes with listDirectMessages for the ceiling.
    expect((qSpy.mock.calls[0][0][0] as { limit?: number }).limit).toBe(500);
  });

  it("keeps an identified channel that carries no name or about tag", async () => {
    const client = new BuzzClient("https://relay.test", SK);
    vi.spyOn(client, "query").mockResolvedValue([ev({ kind: 39000, tags: [["d", "uuid-9"]] })]);
    expect(await client.listChannels()).toEqual([{ id: "uuid-9", name: "", about: undefined }]);
  });

  it("drops channels with no d tag, which have no usable identifier", async () => {
    const client = new BuzzClient("https://relay.test", SK);
    vi.spyOn(client, "query").mockResolvedValue([
      ev({ kind: 39000, tags: [["name", "no-identifier"]] }),
      ev({
        kind: 39000,
        tags: [
          ["d", "uuid-1"],
          ["name", "general"],
        ],
      }),
      ev({ kind: 39000, tags: [["name", "also-no-identifier"]] }),
    ]);
    const channels = await client.listChannels();
    expect(channels).toEqual([{ id: "uuid-1", name: "general", about: undefined }]);
  });

  it("excludes a DM channel (tagged t=dm) and keeps a normal channel", async () => {
    const client = new BuzzClient("https://relay.test", SK);
    vi.spyOn(client, "query").mockResolvedValue([
      ev({
        kind: 39000,
        tags: [
          ["d", "dm-channel"],
          ["name", "DM"],
          ["t", "dm"],
        ],
      }),
      ev({
        kind: 39000,
        tags: [
          ["d", "normal-channel"],
          ["name", "general"],
        ],
      }),
    ]);
    const channels = await client.listChannels();
    expect(channels.map((c) => c.id)).toEqual(["normal-channel"]);
  });

  it("keeps a channel whose t tag is an ordinary topic rather than dm", async () => {
    const client = new BuzzClient("https://relay.test", SK);
    // The DM test above only proves the tag NAME is read. Without checking the
    // VALUE too, any channel carrying a topic tag is taken for a DM and
    // disappears from the channel list into a phantom conversation.
    vi.spyOn(client, "query").mockResolvedValue([
      ev({
        kind: 39000,
        tags: [
          ["d", "topical-channel"],
          ["name", "announcements"],
          ["t", "announcements"],
        ],
      }),
    ]);
    expect((await client.listChannels()).map((c) => c.id)).toEqual(["topical-channel"]);
  });

  it("reads the real d tag past a valueless one", async () => {
    const client = new BuzzClient("https://relay.test", SK);
    // Live Buzz 39000 events carry valueless tags; a valueless `d` that
    // shadowed the real one would resolve the id to "" and drop the channel.
    vi.spyOn(client, "query").mockResolvedValue([
      ev({ kind: 39000, tags: [["d"], ["d", "real-id"], ["name", "General"]] }),
    ]);
    expect(await client.listChannels()).toEqual([{ id: "real-id", name: "General", about: undefined }]);
  });

  it("ignores a tag the relay sent as a bare string", async () => {
    const client = new BuzzClient("https://relay.test", SK);
    // "dinner"[0] === "d" and "dinner"[1] === "i", so an unguarded lookup reads
    // the string character by character and gives this channel the id "i".
    vi.spyOn(client, "query").mockResolvedValue([
      ev({ kind: 39000, tags: [stringTag("dinner"), ["d", "real-id"], ["name", "General"]] }),
    ]);
    expect(await client.listChannels()).toEqual([{ id: "real-id", name: "General", about: undefined }]);
  });
});

describe("BuzzClient.getMessages", () => {
  it("builds a kind:9 #h filter with an over-fetched limit and returns newest-first", async () => {
    const client = new BuzzClient("https://relay.test", SK);
    const qSpy = vi
      .spyOn(client, "query")
      .mockResolvedValue([
        ev({ id: "old", pubkey: "a", created_at: 100, kind: 9, tags: [["h", "chan"]], content: "old" }),
        ev({ id: "new", pubkey: "b", created_at: 200, kind: 9, tags: [["h", "chan"]], content: "new" }),
      ]);
    const { messages: msgs } = await client.getMessages("chan", 10);
    expect(qSpy).toHaveBeenCalledWith([{ kinds: [9], "#h": ["chan"], limit: 40 }]);
    expect(msgs.map((m) => m.content)).toEqual(["new", "old"]);
    expect(msgs[0]).toMatchObject({ id: "new", author: "b", channelId: "chan", createdAt: 200, replyCount: 0 });
  });

  it("defaults the limit to 50, over-fetched", async () => {
    const client = new BuzzClient("https://relay.test", SK);
    const qSpy = vi.spyOn(client, "query").mockResolvedValue([]);
    await client.getMessages("chan");
    expect(qSpy).toHaveBeenCalledWith([{ kinds: [9], "#h": ["chan"], limit: 200 }]);
  });
});

describe("BuzzClient.getMessages thread collapsing", () => {
  const ROOT = "a".repeat(64);

  function reply(id: string, rootId: string, extraTags: string[][] = []) {
    return ev({
      id,
      kind: 9,
      created_at: 50,
      content: "a reply",
      tags: [["h", "chan"], ["e", rootId, "", "root"], ["e", rootId, "", "reply"], ...extraTags],
    });
  }

  it("hides thread replies and keeps the root", async () => {
    const client = new BuzzClient("https://relay.test", SK);
    vi.spyOn(client, "query").mockResolvedValue([
      ev({ id: ROOT, kind: 9, created_at: 10, content: "the question", tags: [["h", "chan"]] }),
      reply("r1", ROOT),
      reply("r2", ROOT),
    ]);
    const { messages: msgs } = await client.getMessages("chan");
    expect(msgs.map((m) => m.id)).toEqual([ROOT]);
  });

  it("counts the hidden replies against their root", async () => {
    const client = new BuzzClient("https://relay.test", SK);
    vi.spyOn(client, "query").mockResolvedValue([
      ev({ id: ROOT, kind: 9, created_at: 10, content: "the question", tags: [["h", "chan"]] }),
      reply("r1", ROOT),
      reply("r2", ROOT),
    ]);
    expect((await client.getMessages("chan")).messages[0].replyCount).toBe(2);
  });

  it("reports zero replies for a message that has none", async () => {
    const client = new BuzzClient("https://relay.test", SK);
    vi.spyOn(client, "query").mockResolvedValue([
      ev({ id: ROOT, kind: 9, created_at: 10, content: "alone", tags: [["h", "chan"]] }),
    ]);
    expect((await client.getMessages("chan")).messages[0].replyCount).toBe(0);
  });

  it("keeps a broadcast reply visible, as Buzz does", async () => {
    const client = new BuzzClient("https://relay.test", SK);
    vi.spyOn(client, "query").mockResolvedValue([
      ev({ id: ROOT, kind: 9, created_at: 10, content: "the question", tags: [["h", "chan"]] }),
      reply("b1", ROOT, [["broadcast", "1"]]),
    ]);
    const { messages: msgs } = await client.getMessages("chan");
    expect(msgs.map((m) => m.id).sort()).toEqual([ROOT, "b1"].sort());
  });

  it("counts a broadcast reply against its root as well as showing it", async () => {
    const client = new BuzzClient("https://relay.test", SK);
    vi.spyOn(client, "query").mockResolvedValue([
      ev({ id: ROOT, kind: 9, created_at: 10, content: "the question", tags: [["h", "chan"]] }),
      reply("b1", ROOT, [["broadcast", "1"]]),
    ]);
    const { messages: msgs } = await client.getMessages("chan");
    const root = msgs.find((m) => m.id === ROOT);
    expect(root?.replyCount).toBe(1);
  });

  it("loses the count when the root fell outside the fetched window", async () => {
    const client = new BuzzClient("https://relay.test", SK);
    vi.spyOn(client, "query").mockResolvedValue([reply("r1", "some-root-we-did-not-fetch")]);
    // The reply is hidden and there is no visible root to attribute it to. This
    // is accepted rather than papered over: fetchedCount stays 1 so the caller
    // can tell "all replies, root out of window" apart from a truly empty channel.
    expect(await client.getMessages("chan")).toEqual({ messages: [], fetchedCount: 1 });
  });

  it("reports fetchedCount 0 for a genuinely empty channel", async () => {
    const client = new BuzzClient("https://relay.test", SK);
    vi.spyOn(client, "query").mockResolvedValue([]);
    expect(await client.getMessages("chan")).toEqual({ messages: [], fetchedCount: 0 });
  });

  it("over-fetches so filtering does not empty a channel that is mostly replies", async () => {
    const client = new BuzzClient("https://relay.test", SK);
    // 3 roots plus 12 replies to the first root: a plain (non-over-fetched)
    // limit of 5 would return only replies to root0, none of which are roots.
    const events = [
      ev({ id: "root0", kind: 9, created_at: 100, content: "root0", tags: [["h", "chan"]] }),
      ev({ id: "root1", kind: 9, created_at: 90, content: "root1", tags: [["h", "chan"]] }),
      ev({ id: "root2", kind: 9, created_at: 80, content: "root2", tags: [["h", "chan"]] }),
      ...Array.from({ length: 12 }, (_, i) => reply(`r${i}`, "root0")),
    ];
    vi.spyOn(client, "query").mockResolvedValue(events);
    const { messages: msgs } = await client.getMessages("chan", 5);
    expect(msgs.map((m) => m.id)).toEqual(["root0", "root1", "root2"]);
  });

  it("never asks for more than the relay's 500 result ceiling", async () => {
    const client = new BuzzClient("https://relay.test", SK);
    const qSpy = vi.spyOn(client, "query").mockResolvedValue([]);
    await client.getMessages("chan", 400);
    expect(qSpy.mock.calls[0][0][0].limit).toBe(500);
  });

  it("trims the collapsed result back to the requested limit", async () => {
    const client = new BuzzClient("https://relay.test", SK);
    vi.spyOn(client, "query").mockResolvedValue(
      Array.from({ length: 10 }, (_, i) =>
        ev({ id: `m${i}`, kind: 9, created_at: i, content: "x", tags: [["h", "chan"]] }),
      ),
    );
    const { messages: msgs } = await client.getMessages("chan", 3);
    // Fixture is 10 root messages with ascending created_at (m0..m9), so the
    // newest three, newest-first, are m9/m8/m7. Asserting only the length would
    // still pass if the implementation sliced before sorting instead of after.
    expect(msgs.map((m) => m.id)).toEqual(["m9", "m8", "m7"]);
  });

  it("still returns newest first after collapsing", async () => {
    const client = new BuzzClient("https://relay.test", SK);
    vi.spyOn(client, "query").mockResolvedValue([
      ev({ id: "old", kind: 9, created_at: 10, content: "old", tags: [["h", "chan"]] }),
      ev({ id: "new", kind: 9, created_at: 99, content: "new", tags: [["h", "chan"]] }),
    ]);
    expect((await client.getMessages("chan")).messages.map((m) => m.id)).toEqual(["new", "old"]);
  });

  it("orders messages sharing a created_at by id, so a limit boundary is stable", async () => {
    const client = new BuzzClient("https://relay.test", SK);
    // Buzz stamps whole seconds, so ties are ordinary. Fed in descending id
    // order: without a tie-break a stable sort would hand them back unchanged.
    vi.spyOn(client, "query").mockResolvedValue([
      ev({ id: "m-c", kind: 9, created_at: 42, content: "c", tags: [["h", "chan"]] }),
      ev({ id: "m-b", kind: 9, created_at: 42, content: "b", tags: [["h", "chan"]] }),
      ev({ id: "m-a", kind: 9, created_at: 42, content: "a", tags: [["h", "chan"]] }),
    ]);
    expect((await client.getMessages("chan")).messages.map((m) => m.id)).toEqual(["m-a", "m-b", "m-c"]);
  });

  it("counts a nested reply against the thread root rather than its parent", async () => {
    const client = new BuzzClient("https://relay.test", SK);
    // A genuine nested thread, where root and parent differ: R is the root, A
    // replies to R, and B replies to A. Both replies belong to R's count.
    const nested = (id: string, rootId: string, parentId: string) =>
      ev({
        id,
        kind: 9,
        created_at: 50,
        content: "a reply",
        tags: [
          ["h", "chan"],
          ["e", rootId, "", "root"],
          ["e", parentId, "", "reply"],
        ],
      });
    vi.spyOn(client, "query").mockResolvedValue([
      ev({ id: ROOT, kind: 9, created_at: 10, content: "the question", tags: [["h", "chan"]] }),
      nested("reply-a", ROOT, ROOT),
      nested("reply-b", ROOT, "reply-a"),
    ]);
    const { messages: msgs } = await client.getMessages("chan");
    expect(msgs.map((m) => m.id)).toEqual([ROOT]);
    expect(msgs[0].replyCount).toBe(2);
  });

  it("dedupes an event the relay echoed twice", async () => {
    const client = new BuzzClient("https://relay.test", SK);
    // A duplicate would otherwise become a duplicate React key downstream and
    // count twice against its root.
    const duplicate = ev({ id: ROOT, kind: 9, created_at: 10, content: "the question", tags: [["h", "chan"]] });
    const echoedReply = reply("r1", ROOT);
    vi.spyOn(client, "query").mockResolvedValue([duplicate, duplicate, echoedReply, echoedReply]);
    const { messages: msgs } = await client.getMessages("chan");
    expect(msgs.map((m) => m.id)).toEqual([ROOT]);
    expect(msgs[0].replyCount).toBe(1);
  });
});

describe("BuzzClient message mapping", () => {
  it("maps a message with no h tag to an empty channel id", async () => {
    const client = new BuzzClient("https://relay.test", SK);
    vi.spyOn(client, "query").mockResolvedValue([ev({ id: "m", pubkey: "a", created_at: 1, kind: 9, content: "x" })]);
    const { messages: msgs } = await client.getMessages("chan");
    expect(msgs[0].channelId).toBe("");
  });
});

describe("BuzzClient.searchMessages", () => {
  it("defaults the limit to 50 when no options are given", async () => {
    const client = new BuzzClient("https://relay.test", SK);
    const qSpy = vi.spyOn(client, "query").mockResolvedValue([]);
    await client.searchMessages("hello");
    expect(qSpy).toHaveBeenCalledWith([{ search: "hello", kinds: [9], limit: 50 }]);
  });

  it("builds a NIP-50 search filter and maps results", async () => {
    const client = new BuzzClient("https://relay.test", SK);
    const qSpy = vi
      .spyOn(client, "query")
      .mockResolvedValue([
        ev({ id: "m", pubkey: "a", created_at: 5, kind: 9, tags: [["h", "chan"]], content: "hello world" }),
      ]);
    const msgs = await client.searchMessages("hello", { limit: 25 });
    expect(qSpy).toHaveBeenCalledWith([{ search: "hello", kinds: [9], limit: 25 }]);
    expect(msgs[0]).toMatchObject({ content: "hello world", channelId: "chan" });
  });

  it("returns hits newest first whatever order the relay used", async () => {
    const client = new BuzzClient("https://relay.test", SK);
    vi.spyOn(client, "query").mockResolvedValue([
      ev({ id: "old", pubkey: "a", created_at: 5, kind: 9, tags: [["h", "chan"]], content: "hello old" }),
      ev({ id: "new", pubkey: "a", created_at: 90, kind: 9, tags: [["h", "chan"]], content: "hello new" }),
    ]);
    expect((await client.searchMessages("hello")).map((m) => m.id)).toEqual(["new", "old"]);
  });

  it("orders hits sharing a created_at by id", async () => {
    const client = new BuzzClient("https://relay.test", SK);
    vi.spyOn(client, "query").mockResolvedValue([
      ev({ id: "s-b", pubkey: "a", created_at: 7, kind: 9, tags: [["h", "chan"]], content: "hello b" }),
      ev({ id: "s-a", pubkey: "a", created_at: 7, kind: 9, tags: [["h", "chan"]], content: "hello a" }),
    ]);
    expect((await client.searchMessages("hello")).map((m) => m.id)).toEqual(["s-a", "s-b"]);
  });
});

/**
 * A client with both relay calls stubbed: `publish` to capture the signed
 * event, and `query` because publishing a replaceable kind first reads the
 * event the relay already stores for that coordinate. `stored` is what that
 * pre-read finds.
 */
function writeClient(stored: NostrEvent[] = []) {
  const client = new BuzzClient("https://relay.test", SK);
  const qSpy = vi.spyOn(client, "query").mockResolvedValue(stored);
  const pSpy = vi.spyOn(client, "publish").mockResolvedValue({ accepted: true, message: "" });
  return { client, qSpy, pSpy };
}

describe("BuzzClient write helpers", () => {
  it("sendMessage publishes a signed kind:9 with an h tag", async () => {
    const client = new BuzzClient("https://relay.test", SK);
    const pSpy = vi.spyOn(client, "publish").mockResolvedValue({ accepted: true, message: "" });
    await client.sendMessage("chan", "hello");
    const published = pSpy.mock.calls[0][0];
    expect(published.kind).toBe(9);
    expect(published.content).toBe("hello");
    expect(published.tags).toContainEqual(["h", "chan"]);
    expect(published.sig).toMatch(/^[0-9a-f]{128}$/);
  });

  it("react publishes a signed kind:7 with e and h tags", async () => {
    const client = new BuzzClient("https://relay.test", SK);
    const pSpy = vi.spyOn(client, "publish").mockResolvedValue({ accepted: true, message: "" });
    await client.react("m1", "chan", "+");
    const published = pSpy.mock.calls[0][0];
    expect(published.kind).toBe(7);
    expect(published.content).toBe("+");
    expect(published.tags).toContainEqual(["e", "m1"]);
    expect(published.tags).toContainEqual(["h", "chan"]);
  });

  it("puts the emoji in an emoji tag rather than concatenating it into the content", async () => {
    const { client, pSpy } = writeClient();
    await client.setStatus("in a meeting", "\u{1F4C5}");
    const published = pSpy.mock.calls[0][0];
    expect(published.kind).toBe(30315);
    expect(published.content).toBe("in a meeting");
    expect(published.tags).toContainEqual(["d", "general"]);
    expect(published.tags).toContainEqual(["emoji", "\u{1F4C5}"]);
  });

  it("omits the emoji tag entirely when no emoji is given", async () => {
    const { client, pSpy } = writeClient();
    await client.setStatus("heads down");
    const published = pSpy.mock.calls[0][0];
    expect(published.content).toBe("heads down");
    expect(published.tags.some((t) => t[0] === "emoji")).toBe(false);
  });

  it("treats a blank emoji as no emoji", async () => {
    const { client, pSpy } = writeClient();
    await client.setStatus("heads down", "   ");
    expect(pSpy.mock.calls[0][0].tags.some((t) => t[0] === "emoji")).toBe(false);
  });

  it("trims the status text and the emoji", async () => {
    const { client, pSpy } = writeClient();
    await client.setStatus("  heads down  ", "  \u{1F9E0}  ");
    const published = pSpy.mock.calls[0][0];
    expect(published.content).toBe("heads down");
    expect(published.tags).toContainEqual(["emoji", "\u{1F9E0}"]);
  });

  it("clearStatus publishes empty content with no emoji tag", async () => {
    const { client, pSpy } = writeClient();
    await client.clearStatus();
    const published = pSpy.mock.calls[0][0];
    expect(published.kind).toBe(30315);
    expect(published.content).toBe("");
    expect(published.tags).toEqual([["d", "general"]]);
  });

  it("setPresence publishes ephemeral kind:20001 with the state as content", async () => {
    const client = new BuzzClient("https://relay.test", SK);
    const pSpy = vi.spyOn(client, "publish").mockResolvedValue({ accepted: true, message: "" });
    await client.setPresence("away");
    const published = pSpy.mock.calls[0][0];
    expect(published.kind).toBe(20001);
    expect(published.content).toBe("away");
  });

  it("throws RelayError when a publish is not accepted", async () => {
    const client = new BuzzClient("https://relay.test", SK);
    vi.spyOn(client, "publish").mockResolvedValue({ accepted: false, message: "restricted" });
    await expect(client.sendMessage("chan", "x")).rejects.toBeInstanceOf(RelayError);
  });

  it("surfaces the relay's reason when it rejects a publish", async () => {
    const client = new BuzzClient("https://relay.test", SK);
    vi.spyOn(client, "publish").mockResolvedValue({
      accepted: false,
      message: "invalid: kind 20001 is only accepted via WebSocket",
    });
    await expect(client.setPresence("online")).rejects.toThrow(/only accepted via WebSocket/);
  });

  it("falls back to a generic reason when the relay gives no message", async () => {
    const client = new BuzzClient("https://relay.test", SK);
    vi.spyOn(client, "publish").mockResolvedValue({ accepted: false, message: "" });
    await expect(client.sendMessage("chan", "x")).rejects.toThrow(/auth or permission/);
  });

  it("bounds a long rejection reason to 200 characters", async () => {
    const client = new BuzzClient("https://relay.test", SK);
    vi.spyOn(client, "publish").mockResolvedValue({ accepted: false, message: "z".repeat(500) });
    const err = await rejection(client.sendMessage("chan", "x"));
    expect(err.message).toBe(`Relay rejected the request: ${"z".repeat(200)}`);
  });
});

describe("BuzzClient.getStatus", () => {
  it("queries kind 30315 for our own pubkey on the general coordinate", async () => {
    const client = new BuzzClient("https://relay.test", SK);
    const qSpy = vi.spyOn(client, "query").mockResolvedValue([]);
    await client.getStatus();
    const filter = qSpy.mock.calls[0][0][0] as Record<string, unknown>;
    expect(filter.kinds).toEqual([30315]);
    expect(filter["#d"]).toEqual(["general"]);
    expect((filter.authors as string[])[0]).toMatch(/^[0-9a-f]{64}$/);
  });

  it("returns the text and the emoji tag", async () => {
    const client = new BuzzClient("https://relay.test", SK);
    vi.spyOn(client, "query").mockResolvedValue([
      ev({
        kind: 30315,
        created_at: 10,
        content: "in a meeting",
        tags: [
          ["d", "general"],
          ["emoji", "\u{1F4C5}"],
        ],
      }),
    ]);
    expect(await client.getStatus()).toEqual({ text: "in a meeting", emoji: "\u{1F4C5}" });
  });

  it("returns an empty emoji when the event carries no emoji tag", async () => {
    const client = new BuzzClient("https://relay.test", SK);
    vi.spyOn(client, "query").mockResolvedValue([
      ev({ kind: 30315, created_at: 10, content: "heads down", tags: [["d", "general"]] }),
    ]);
    expect(await client.getStatus()).toEqual({ text: "heads down", emoji: "" });
  });

  it("returns null when there is no status event at all", async () => {
    const client = new BuzzClient("https://relay.test", SK);
    vi.spyOn(client, "query").mockResolvedValue([]);
    expect(await client.getStatus()).toBeNull();
  });

  it("reads a cleared status as null", async () => {
    const client = new BuzzClient("https://relay.test", SK);
    vi.spyOn(client, "query").mockResolvedValue([
      ev({ kind: 30315, created_at: 10, content: "", tags: [["d", "general"]] }),
    ]);
    expect(await client.getStatus()).toBeNull();
  });

  it("keeps a status that has an emoji but no text", async () => {
    const client = new BuzzClient("https://relay.test", SK);
    vi.spyOn(client, "query").mockResolvedValue([
      ev({
        kind: 30315,
        created_at: 10,
        content: "",
        tags: [
          ["d", "general"],
          ["emoji", "\u{1F334}"],
        ],
      }),
    ]);
    expect(await client.getStatus()).toEqual({ text: "", emoji: "\u{1F334}" });
  });

  it("uses the newest event when the relay returns several", async () => {
    const client = new BuzzClient("https://relay.test", SK);
    vi.spyOn(client, "query").mockResolvedValue([
      ev({ kind: 30315, created_at: 10, content: "old", tags: [["d", "general"]] }),
      ev({ kind: 30315, created_at: 99, content: "new", tags: [["d", "general"]] }),
    ]);
    expect(await client.getStatus()).toEqual({ text: "new", emoji: "" });
  });

  it("still uses the newest event when it is the first in the list", async () => {
    const client = new BuzzClient("https://relay.test", SK);
    vi.spyOn(client, "query").mockResolvedValue([
      ev({ kind: 30315, created_at: 99, content: "new", tags: [["d", "general"]] }),
      ev({ kind: 30315, created_at: 10, content: "old", tags: [["d", "general"]] }),
    ]);
    expect(await client.getStatus()).toEqual({ text: "new", emoji: "" });
  });

  it("reads the real emoji tag past a valueless one", async () => {
    const client = new BuzzClient("https://relay.test", SK);
    // A valueless `emoji` tag shadowing the real one would report no emoji.
    vi.spyOn(client, "query").mockResolvedValue([
      ev({ kind: 30315, created_at: 10, content: "in a meeting", tags: [["d", "general"], ["emoji"], ["emoji", "X"]] }),
    ]);
    expect(await client.getStatus()).toEqual({ text: "in a meeting", emoji: "X" });
  });

  it("prefers a valid event over one whose created_at is missing", async () => {
    const client = new BuzzClient("https://relay.test", SK);
    // `undefined > number` and `number > undefined` are both false, so a junk
    // timestamp arriving first would win the comparison by default.
    const junk = { ...ev({ kind: 30315, content: "junk", tags: [["d", "general"]] }), created_at: undefined };
    vi.spyOn(client, "query").mockResolvedValue([
      junk as unknown as NostrEvent,
      ev({ kind: 30315, created_at: 10, content: "real", tags: [["d", "general"]] }),
    ]);
    expect(await client.getStatus()).toEqual({ text: "real", emoji: "" });
  });

  it("prefers a valid event over one whose created_at is missing, in either order", async () => {
    const client = new BuzzClient("https://relay.test", SK);
    const junk = { ...ev({ kind: 30315, content: "junk", tags: [["d", "general"]] }), created_at: undefined };
    vi.spyOn(client, "query").mockResolvedValue([
      ev({ kind: 30315, created_at: 10, content: "real", tags: [["d", "general"]] }),
      junk as unknown as NostrEvent,
    ]);
    expect(await client.getStatus()).toEqual({ text: "real", emoji: "" });
  });
});

// Regression coverage for a bug the live smoke test caught: the relay
// (crates/buzz-db/src/event.rs in block/buzz) breaks a created_at tie on a
// replaceable coordinate by keeping the event with the LOWEST id, so a
// set-then-clear within the same wall-clock second was effectively a coin
// flip on whose sha256 sorted lower. Publishing a replaceable kind must stamp
// a created_at that is strictly greater than both the last one this process
// used for that coordinate and the one the relay already stores there: the
// in-process value alone dies with the Raycast command process.
describe("BuzzClient replaceable created_at monotonicity", () => {
  const NOW_MS = 1_700_000_000_000;
  const NOW_S = 1_700_000_000;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW_MS);
    __resetReplaceableClock();
  });

  afterEach(() => {
    __resetReplaceableClock();
    vi.useRealTimers();
  });

  function storedStatus(created_at: number): NostrEvent {
    return ev({ kind: 30315, created_at, content: "stored", tags: [["d", "general"]] });
  }

  it("gives two setStatus calls in the same second strictly increasing created_at", async () => {
    const { client, pSpy } = writeClient();
    await client.setStatus("first");
    await client.setStatus("second");
    const [firstAt, secondAt] = pSpy.mock.calls.map((c) => c[0].created_at);
    expect(secondAt).toBeGreaterThan(firstAt);
  });

  it("gives a clearStatus that follows setStatus in the same second a strictly increasing created_at", async () => {
    const { client, pSpy } = writeClient();
    await client.setStatus("in a meeting");
    await client.clearStatus();
    const [setAt, clearAt] = pSpy.mock.calls.map((c) => c[0].created_at);
    expect(clearAt).toBeGreaterThan(setAt);
  });

  it("uses the real current time once it has caught up, instead of drifting ahead forever", async () => {
    const { client, pSpy } = writeClient();
    await client.setStatus("first");
    vi.setSystemTime(1_700_000_010_000); // 10 real seconds later
    await client.setStatus("second");
    const [firstAt, secondAt] = pSpy.mock.calls.map((c) => c[0].created_at);
    expect(secondAt).toBe(firstAt + 10);
  });

  it("reads the stored event for the coordinate before publishing a replaceable kind", async () => {
    const { client, qSpy } = writeClient();
    await client.setStatus("first");
    expect(qSpy).toHaveBeenCalledWith([{ kinds: [30315], authors: [ownPubkey()], "#d": ["general"], limit: 1 }]);
  });

  it("does not read anything before publishing a non-replaceable kind", async () => {
    const { client, qSpy } = writeClient();
    await client.sendMessage("chan", "hello");
    expect(qSpy).not.toHaveBeenCalled();
  });

  it("outruns an event the relay stores in the future after the process restarted", async () => {
    const { client, qSpy, pSpy } = writeClient();
    // Five rapid status changes in one wall-clock second, which the Set Status
    // command really can produce; the last is stamped four seconds ahead.
    for (const text of ["one", "two", "three", "four", "five"]) {
      await client.setStatus(text);
    }
    const lastAt = pSpy.mock.calls[4][0].created_at;
    expect(lastAt).toBe(NOW_S + 4);

    // The Raycast command process ends, taking the in-process clock with it,
    // and one real second passes. The relay still holds that future event, so
    // stamping plain "now" here would publish something OLDER than what the
    // relay stores: it would keep the stale status and still answer "accepted".
    __resetReplaceableClock();
    vi.setSystemTime(NOW_MS + 1_000);
    qSpy.mockResolvedValue([storedStatus(lastAt)]);
    await client.setStatus("after the restart");

    expect(pSpy.mock.calls[5][0].created_at).toBeGreaterThan(lastAt);
  });

  it("publishes anyway when the stored-event read fails", async () => {
    const { client, qSpy, pSpy } = writeClient();
    qSpy.mockRejectedValue(new RelayError("Cannot reach relay at https://relay.test"));
    await client.setStatus("first");
    // The publish itself reports any real relay trouble; a failed pre-read
    // must not block a status change.
    expect(pSpy.mock.calls[0][0].created_at).toBe(NOW_S);
  });

  it("ignores a stored event whose created_at is unusable", async () => {
    const junk = { ...storedStatus(0), created_at: undefined } as unknown as NostrEvent;
    const { client, pSpy } = writeClient([junk]);
    await client.setStatus("first");
    expect(pSpy.mock.calls[0][0].created_at).toBe(NOW_S);
  });

  it("stamps above the newest stored event when the relay returns several", async () => {
    const { client, pSpy } = writeClient([storedStatus(NOW_S + 30), storedStatus(NOW_S + 90)]);
    await client.setStatus("first");
    expect(pSpy.mock.calls[0][0].created_at).toBe(NOW_S + 91);
  });

  it("tracks separate d tags on the same kind independently", () => {
    const nowSeconds = Math.floor(Date.now() / 1000);
    const first = __nextReplaceableCreatedAt(30315, [["d", "general"]]);
    const second = __nextReplaceableCreatedAt(30315, [["d", "general"]]);
    const other = __nextReplaceableCreatedAt(30315, [["d", "other"]]);
    expect(second).toBeGreaterThan(first);
    // A different coordinate is untouched by the bump on "general".
    expect(other).toBe(nowSeconds);
  });

  it("falls back to an empty d tag for a replaceable kind that carries none", () => {
    // Kind 15000 sits in the 10000-19999 (non-parameterized) replaceable
    // range, which never carries a d tag; the coordinate key still has to
    // resolve without one. Two calls, because a single one answers "now"
    // whether or not the kind is treated as replaceable at all.
    const nowSeconds = Math.floor(Date.now() / 1000);
    const first = __nextReplaceableCreatedAt(15000, []);
    const second = __nextReplaceableCreatedAt(15000, []);
    expect(first).toBe(nowSeconds);
    expect(second).toBeGreaterThan(first);
  });

  it("stamps above an explicitly supplied stored created_at", () => {
    const nowSeconds = Math.floor(Date.now() / 1000);
    expect(__nextReplaceableCreatedAt(30315, [["d", "general"]], nowSeconds + 60)).toBe(nowSeconds + 61);
  });

  it("does not bump a non-replaceable kind: two kind:9 messages in the same second share created_at", async () => {
    const { client, pSpy } = writeClient();
    await client.sendMessage("chan", "one");
    await client.sendMessage("chan", "two");
    const [firstAt, secondAt] = pSpy.mock.calls.map((c) => c[0].created_at);
    expect(secondAt).toBe(firstAt);
  });

  it("resets cleanly between tests via __resetReplaceableClock", async () => {
    const { client, pSpy } = writeClient();
    await client.setStatus("first");
    __resetReplaceableClock();
    await client.setStatus("second");
    const [firstAt, secondAt] = pSpy.mock.calls.map((c) => c[0].created_at);
    // Without the reset, the second call would be bumped ahead of the first;
    // a clean reset makes it start over at the current simulated time.
    expect(secondAt).toBe(firstAt);
  });
});

describe("lookupProfiles", () => {
  it("queries kind:0 for the given authors and maps names", async () => {
    const { client, calls } = clientWithResponses([
      [profileEvent("aa".repeat(32), '{"display_name":"Ada"}'), profileEvent("bb".repeat(32), '{"name":"bot"}')],
    ]);
    const names = await client.lookupProfiles(["aa".repeat(32), "bb".repeat(32)]);

    expect(calls[0].body).toEqual([{ kinds: [0], authors: ["aa".repeat(32), "bb".repeat(32)] }]);
    expect(names.get("aa".repeat(32))).toBe("Ada");
    expect(names.get("bb".repeat(32))).toBe("bot");
  });

  it("omits authors whose profile carries no usable name", async () => {
    const { client } = clientWithResponses([[profileEvent("cc".repeat(32), "{}")]]);
    const names = await client.lookupProfiles(["cc".repeat(32)]);
    expect(names.has("cc".repeat(32))).toBe(false);
  });

  it("keeps the newest profile when an author has several", async () => {
    // Newest first, so plain last-write-wins would answer "old": the fixture
    // has to be out of order for this test to say anything.
    const { client } = clientWithResponses([
      [profileEvent("dd".repeat(32), '{"name":"new"}', 20), profileEvent("dd".repeat(32), '{"name":"old"}', 10)],
    ]);
    const names = await client.lookupProfiles(["dd".repeat(32)]);
    expect(names.get("dd".repeat(32))).toBe("new");
  });

  it("does not touch the relay for an empty author list", async () => {
    const { client, calls } = clientWithResponses([]);
    expect(await client.lookupProfiles([])).toEqual(new Map());
    expect(calls).toHaveLength(0);
  });
});

describe("listDirectMessages", () => {
  it("lists conversations, naming them by the other participants", async () => {
    const me = ownPubkey();
    const { client, calls } = clientWithResponses([
      [dmEvent("chan-1", [me, "aa".repeat(32)])],
      [profileEvent("aa".repeat(32), '{"display_name":"Ada"}')],
    ]);
    const dms = await client.listDirectMessages();

    expect(calls[0].body).toEqual([{ kinds: [39000], limit: 500 }]);
    expect(dms).toEqual([{ channelId: "chan-1", participants: ["aa".repeat(32)], name: "Ada" }]);
  });

  it("falls back to a shortened pubkey when a participant has no profile", async () => {
    const me = ownPubkey();
    const { client } = clientWithResponses([[dmEvent("chan-2", [me, "ab".repeat(32)])], []]);
    const dms = await client.listDirectMessages();
    expect(dms[0].name).toBe("abababab");
  });

  it("joins several other participants into one name", async () => {
    const me = ownPubkey();
    const { client } = clientWithResponses([
      [dmEvent("chan-3", [me, "aa".repeat(32), "bb".repeat(32)])],
      [profileEvent("aa".repeat(32), '{"name":"Ada"}'), profileEvent("bb".repeat(32), '{"name":"Bo"}')],
    ]);
    const dms = await client.listDirectMessages();
    expect(dms[0].name).toBe("Ada, Bo");
    expect(dms[0].participants).toEqual(["aa".repeat(32), "bb".repeat(32)]);
  });

  it("names a conversation with nobody else 'Direct message'", async () => {
    const me = ownPubkey();
    const { client } = clientWithResponses([[dmEvent("chan-4", [me])]]);
    const dms = await client.listDirectMessages();
    expect(dms[0]).toEqual({ channelId: "chan-4", participants: [], name: "Direct message" });
  });

  it("drops a conversation with no d tag, which has no usable channel id", async () => {
    const me = ownPubkey();
    const { client } = clientWithResponses([
      [
        {
          ...dmEvent("chan-5", [me]),
          tags: [
            ["t", "dm"],
            ["p", me],
          ],
        },
        dmEvent("chan-6", [me]),
      ],
    ]);
    const dms = await client.listDirectMessages();
    expect(dms.map((d) => d.channelId)).toEqual(["chan-6"]);
  });

  it("asks for each other participant's profile exactly once", async () => {
    const me = ownPubkey();
    const { client, calls } = clientWithResponses([
      [dmEvent("chan-7", [me, "aa".repeat(32)]), dmEvent("chan-8", [me, "aa".repeat(32)])],
      [profileEvent("aa".repeat(32), '{"name":"Ada"}')],
    ]);
    await client.listDirectMessages();
    expect(calls[1].body).toEqual([{ kinds: [0], authors: ["aa".repeat(32)] }]);
  });

  it("does not look up profiles when there is nobody to name", async () => {
    const { client, calls } = clientWithResponses([[]]);
    expect(await client.listDirectMessages()).toEqual([]);
    expect(calls).toHaveLength(1);
  });

  it("omits a p tag with no value rather than crashing on it", async () => {
    const me = ownPubkey();
    const malformed: NostrEvent = {
      ...dmEvent("chan-9", [me, "aa".repeat(32)]),
      tags: [["d", "chan-9"], ["t", "dm"], ["p", me], ["p"], ["p", "aa".repeat(32)]],
    };
    const { client } = clientWithResponses([[malformed], [profileEvent("aa".repeat(32), '{"name":"Ada"}')]]);
    const dms = await client.listDirectMessages();
    expect(dms).toEqual([{ channelId: "chan-9", participants: ["aa".repeat(32)], name: "Ada" }]);
  });

  it("dedupes conversations that share a d tag, keeping the first one seen", async () => {
    const me = ownPubkey();
    const { client } = clientWithResponses([
      [dmEvent("chan-10", [me, "aa".repeat(32)]), dmEvent("chan-10", [me, "bb".repeat(32)])],
      [profileEvent("aa".repeat(32), '{"name":"Ada"}')],
    ]);
    const dms = await client.listDirectMessages();
    expect(dms.map((d) => d.channelId)).toEqual(["chan-10"]);
    expect(dms[0].participants).toEqual(["aa".repeat(32)]);
  });

  it("ignores a DM channel whose p tags do not include us", async () => {
    const me = ownPubkey();
    // Both conversations are returned by the relay; only the one we are a
    // participant in may be listed. Two events rather than one so that
    // dropping the participant check produces a wrong LIST rather than merely
    // exhausting the queued fixtures, which would fail for the wrong reason.
    const ours = dmEvent("chan-ours", [me, "aa".repeat(32)]);
    const notOurs = dmEvent("chan-11", ["aa".repeat(32), "bb".repeat(32)]);
    const { client } = clientWithResponses([[ours, notOurs], []]);
    const dms = await client.listDirectMessages();
    expect(dms.map((dm) => dm.channelId)).toEqual(["chan-ours"]);
  });

  it("ignores a normal (non-DM) 39000 channel", async () => {
    const me = ownPubkey();
    const normalChannel: NostrEvent = {
      id: "chan-12",
      pubkey: me,
      created_at: 1000,
      kind: 39000,
      tags: [
        ["d", "chan-12"],
        ["name", "general"],
        ["p", me],
      ],
      content: "",
      sig: "s",
    };
    const { client } = clientWithResponses([[normalChannel]]);
    const dms = await client.listDirectMessages();
    expect(dms).toEqual([]);
  });

  it("ignores a 39000 channel whose t tag is an ordinary topic", async () => {
    const me = ownPubkey();
    // The mirror of the channel-list case: a topic tag is not a DM tag, so this
    // channel must not turn up as a phantom conversation. A real DM alongside
    // it, so dropping the value check produces a wrong LIST rather than merely
    // exhausting the queued fixtures.
    const topical: NostrEvent = {
      ...dmEvent("chan-topic", [me]),
      tags: [
        ["d", "chan-topic"],
        ["name", "announcements"],
        ["t", "announcements"],
        ["p", me],
      ],
    };
    const { client } = clientWithResponses([[topical, dmEvent("chan-real", [me])]]);
    const dms = await client.listDirectMessages();
    expect(dms.map((d) => d.channelId)).toEqual(["chan-real"]);
  });

  it("reads the real d tag past a valueless one", async () => {
    const me = ownPubkey();
    const shadowed: NostrEvent = {
      ...dmEvent("chan-14", [me, "aa".repeat(32)]),
      tags: [["d"], ["d", "chan-14"], ["t", "dm"], ["p", me], ["p", "aa".repeat(32)]],
    };
    const { client } = clientWithResponses([[shadowed], [profileEvent("aa".repeat(32), '{"name":"Ada"}')]]);
    const dms = await client.listDirectMessages();
    // A valueless `d` shadowing the real one empties the channel id, which
    // drops the whole conversation from the list.
    expect(dms).toEqual([{ channelId: "chan-14", participants: ["aa".repeat(32)], name: "Ada" }]);
  });

  it("ignores a tag the relay sent as a bare string", async () => {
    const me = ownPubkey();
    // "private"[0] === "p" and "private"[1] === "r", so an unguarded read adds a
    // phantom participant "r" and titles the row "r".
    const withStringTag: NostrEvent = {
      ...dmEvent("chan-15", [me, "aa".repeat(32)]),
      tags: [stringTag("private"), ["d", "chan-15"], ["t", "dm"], ["p", me], ["p", "aa".repeat(32)]],
    };
    const { client } = clientWithResponses([[withStringTag], [profileEvent("aa".repeat(32), '{"name":"Ada"}')]]);
    const dms = await client.listDirectMessages();
    expect(dms).toEqual([{ channelId: "chan-15", participants: ["aa".repeat(32)], name: "Ada" }]);
  });

  it("handles a DM channel carrying valueless tags without throwing", async () => {
    const me = ownPubkey();
    const withValuelessTags: NostrEvent = {
      id: "chan-13",
      pubkey: me,
      created_at: 1000,
      kind: 39000,
      tags: [
        ["d", "chan-13"],
        ["name", "DM"],
        ["private"],
        ["hidden"],
        ["p", me],
        ["p", "aa".repeat(32)],
        ["closed"],
        ["t", "dm"],
      ],
      content: "",
      sig: "s",
    };
    const { client } = clientWithResponses([[withValuelessTags], [profileEvent("aa".repeat(32), '{"name":"Ada"}')]]);
    const dms = await client.listDirectMessages();
    expect(dms).toEqual([{ channelId: "chan-13", participants: ["aa".repeat(32)], name: "Ada" }]);
  });
});

describe("openDirectMessage", () => {
  it("publishes kind 41010 with a p tag and a generated d tag", async () => {
    const { client, calls } = clientWithResponses([
      { accepted: true, message: 'response:{"channel_id":"relay-id","created":true}' },
    ]);
    const channelId = await client.openDirectMessage("ee".repeat(32));

    const event = calls[0].body as NostrEvent;
    expect(event.kind).toBe(41010);
    expect(event.content).toBe("");
    expect(event.tags[0]).toEqual(["p", "ee".repeat(32)]);
    expect(event.tags[1][0]).toBe("d");
    expect(event.tags[1][1]).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    expect(channelId).toBe("relay-id");
  });

  it("returns the id we generated when the relay does not echo one", async () => {
    const { client, calls } = clientWithResponses([{ accepted: true, message: "ok" }]);
    const channelId = await client.openDirectMessage("ff".repeat(32));
    const event = calls[0].body as NostrEvent;
    expect(channelId).toBe(event.tags[1][1]);
    expect(channelId).not.toBe("");
  });

  it("generates a different id on each call", async () => {
    const { client, calls } = clientWithResponses([
      { accepted: true, message: "" },
      { accepted: true, message: "" },
    ]);
    await client.openDirectMessage("ee".repeat(32));
    await client.openDirectMessage("ee".repeat(32));
    const first = (calls[0].body as NostrEvent).tags[1][1];
    const second = (calls[1].body as NostrEvent).tags[1][1];
    expect(first).not.toBe(second);
  });

  it("throws with the relay's reason when the open is rejected", async () => {
    const { client } = clientWithResponses([{ accepted: false, message: "not allowed" }]);
    await expect(client.openDirectMessage("ee".repeat(32))).rejects.toThrow("Relay rejected the request: not allowed");
  });
});
