import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  ALREADY_SENDING,
  MIN_LEAD_MS,
  PENDING_POST_PREFIX,
  PENDING_POST_TTL_MS,
  SENDING_STALE_MS,
  connectedChannels,
  needsSignInForPublishing,
  parseScheduledAt,
  pickChannel,
  splitThread,
  publish,
  scheduleProblem,
  targetFor,
  type PublishDependencies,
} from "../src/lib/publishing.ts";
import { McpNetworkError, McpToolError } from "../src/lib/mcp.ts";
import type { Channel, Post } from "../src/lib/types.ts";

const NOW = Date.parse("2026-09-28T10:00:00Z");

const channel = (overrides: Partial<Channel> = {}): Channel => ({
  id: "sacc_x",
  provider: "x",
  handle: "@acme",
  status: "connected",
  caption_limit: 280,
  media_required: false,
  max_media: 4,
  ...overrides,
});

const post = (overrides: Partial<Post> = {}): Post => ({
  id: "post_1",
  status: "draft",
  caption: "Hello",
  scheduled_at: null,
  failure_code: null,
  channel_id: "sacc_x",
  provider: "x",
  ...overrides,
});

type Call = { name: string; args: Record<string, unknown> };

function fakes(answers: Record<string, (args: Record<string, unknown>) => unknown>, now = NOW) {
  const calls: Call[] = [];
  const items = new Map<string, string>();
  const locks = new Map<string, Promise<void>>();
  const dependencies: PublishDependencies = {
    now: () => now,
    call: async <T>(name: string, args: Record<string, unknown>) => {
      calls.push({ name, args });
      return answers[name](args) as T;
    },
    account: async () => "account_1",
    lock: async <T>(name: string, work: () => Promise<T>) => {
      const previous = locks.get(name) ?? Promise.resolve();
      let release = () => {};
      const held = new Promise<void>((resolve) => {
        release = resolve;
      });
      locks.set(name, previous.then(() => held));
      await previous;
      try {
        return await work();
      } finally {
        release();
      }
    },
    storage: {
      allItems: async () => Object.fromEntries(items),
      getItem: async (key) => items.get(key),
      setItem: async (key, value) => {
        items.set(key, value);
      },
      removeItem: async (key) => {
        items.delete(key);
      },
    },
  };
  return { calls, items, dependencies };
}

const publication = { brandId: "brand_1", channel: channel(), parts: ["Hello"] };

describe("connectedChannels", () => {
  it("keeps only connected channels of the platform", () => {
    const channels = [
      channel(),
      channel({ id: "sacc_li", provider: "linkedin" }),
      channel({ id: "sacc_old", status: "expired" }),
    ];

    assert.deepEqual(
      connectedChannels(channels, "x").map((candidate) => candidate.id),
      ["sacc_x"],
    );
  });

  it("returns nothing when the platform has no connected channel", () => {
    assert.deepEqual(connectedChannels([channel({ provider: "linkedin" })], "x"), []);
  });
});

describe("targetFor", () => {
  it("sends a single post as its caption", () => {
    assert.deepEqual(targetFor(channel(), ["Hello"]), { channel_id: "sacc_x", caption: "Hello" });
  });

  it("sends an X thread as its parts", () => {
    assert.deepEqual(targetFor(channel(), ["One", "Two"]), { channel_id: "sacc_x", parts: ["One", "Two"] });
  });

  it("drops empty parts before deciding", () => {
    assert.deepEqual(targetFor(channel(), ["One", "  "]), { channel_id: "sacc_x", caption: "One" });
  });

  it("sends a LinkedIn post in several parts as one caption", () => {
    const linkedin = channel({ id: "sacc_li", provider: "linkedin" });

    assert.deepEqual(targetFor(linkedin, ["One", " Two "]), { channel_id: "sacc_li", caption: "One\n\nTwo" });
  });
});

describe("scheduleProblem", () => {
  it("refuses a time in the past", () => {
    assert.equal(typeof scheduleProblem(new Date(NOW - 60_000), NOW), "string");
  });

  it("refuses a time closer than the minimum lead", () => {
    assert.equal(typeof scheduleProblem(new Date(NOW + MIN_LEAD_MS - 1), NOW), "string");
  });

  it("accepts a future time", () => {
    assert.equal(scheduleProblem(new Date(NOW + MIN_LEAD_MS + 1_000), NOW), undefined);
  });
});

describe("publish now", () => {
  it("creates a draft, then sends it now", async () => {
    const { calls, dependencies } = fakes({
      create_posts: () => ({ posts: [post()] }),
      send_post: () => post({ status: "queued" }),
    });

    const result = await publish(dependencies, publication);

    assert.deepEqual(
      calls.map((call) => call.name),
      ["create_posts", "send_post"],
    );
    assert.equal(calls[0].args.status, undefined);
    assert.deepEqual(calls[0].args.targets, [{ channel_id: "sacc_x", caption: "Hello" }]);
    assert.equal(calls[0].args.brand_id, "brand_1");
    assert.deepEqual(
      { post_id: calls[1].args.post_id, mode: calls[1].args.mode, brand_id: calls[1].args.brand_id },
      { post_id: "post_1", mode: "now", brand_id: "brand_1" },
    );
    assert.equal(result.status, "queued");
  });

  it("sends the draft it already made when a retry follows a failed send", async () => {
    let sends = 0;
    const { calls, dependencies } = fakes({
      create_posts: () => ({ posts: [post()] }),
      send_post: () => {
        sends += 1;
        if (sends === 1) throw new McpNetworkError("SocialFaktory took too long to answer.", true);
        return post({ status: "queued" });
      },
    });

    await assert.rejects(publish(dependencies, publication));
    await publish(dependencies, publication);

    assert.deepEqual(
      calls.map((call) => call.name),
      ["create_posts", "send_post", "send_post"],
    );
    assert.equal(calls[2].args.post_id, "post_1");
    assert.equal(calls[2].args.idempotency_key, calls[1].args.idempotency_key);
  });

  it("repeats the same keys when the same post is pressed twice", async () => {
    const { calls, dependencies } = fakes({
      create_posts: () => ({ posts: [post()] }),
      send_post: () => post({ status: "queued" }),
    });

    await publish(dependencies, publication);
    await publish(dependencies, publication);

    const creates = calls.filter((call) => call.name === "create_posts");
    assert.equal(creates.length, 1);
    const sends = calls.filter((call) => call.name === "send_post");
    assert.equal(sends[0].args.idempotency_key, sends[1].args.idempotency_key);
  });

  it("uses fresh keys once the earlier attempt is older than the replay window", async () => {
    const first = fakes({
      create_posts: () => ({ posts: [post()] }),
      send_post: () => post({ status: "queued" }),
    });
    await publish(first.dependencies, publication);

    const later = fakes(
      { create_posts: () => ({ posts: [post({ id: "post_2" })] }), send_post: () => post({ status: "queued" }) },
      NOW + PENDING_POST_TTL_MS + 1,
    );
    for (const [key, value] of first.items) await later.dependencies.storage.setItem(key, value);
    await publish(later.dependencies, publication);

    assert.equal(later.calls[0].name, "create_posts");
    assert.notEqual(later.calls[0].args.idempotency_key, first.calls[0].args.idempotency_key);
  });

  it("keeps separate attempts for separate channels", async () => {
    const { calls, dependencies } = fakes({
      create_posts: () => ({ posts: [post()] }),
      send_post: () => post({ status: "queued" }),
    });

    await publish(dependencies, publication);
    await publish(dependencies, { ...publication, channel: channel({ id: "sacc_x2" }) });

    const keys = calls.filter((call) => call.name === "create_posts").map((call) => call.args.idempotency_key);
    assert.equal(keys.length, 2);
    assert.notEqual(keys[0], keys[1]);
  });

  it("stores its attempt under the pending post prefix", async () => {
    const { items, dependencies } = fakes({
      create_posts: () => ({ posts: [post()] }),
      send_post: () => post({ status: "queued" }),
    });

    await publish(dependencies, publication);

    assert.ok([...items.keys()].every((key) => key.startsWith(PENDING_POST_PREFIX)));
  });
});

describe("publish on a schedule", () => {
  const at = new Date(NOW + 2 * 60 * 60 * 1000);

  it("schedules in one call with the time as an ISO string", async () => {
    const { calls, dependencies } = fakes({
      create_posts: () => ({ posts: [post({ status: "queued", scheduled_at: at.toISOString() })] }),
    });

    const result = await publish(dependencies, { ...publication, scheduledAt: at });

    assert.deepEqual(
      calls.map((call) => call.name),
      ["create_posts"],
    );
    assert.equal(calls[0].args.status, "scheduled");
    assert.equal(calls[0].args.scheduled_at, at.toISOString());
    assert.equal(result.scheduled_at, at.toISOString());
  });

  it("refuses a past time before calling SocialFaktory", async () => {
    const { calls, dependencies } = fakes({ create_posts: () => ({ posts: [post()] }) });

    await assert.rejects(publish(dependencies, { ...publication, scheduledAt: new Date(NOW - 1) }));

    assert.equal(calls.length, 0);
  });

  it("keeps a post now and a scheduled post of the same text apart", async () => {
    const { calls, dependencies } = fakes({
      create_posts: () => ({ posts: [post()] }),
      send_post: () => post({ status: "queued" }),
    });

    await publish(dependencies, publication);
    await publish(dependencies, { ...publication, scheduledAt: at });

    const keys = calls.filter((call) => call.name === "create_posts").map((call) => call.args.idempotency_key);
    assert.notEqual(keys[0], keys[1]);
  });
});

describe("pickChannel", () => {
  const second = channel({ id: "sacc_x2", handle: "@acme_eu" });

  it("uses the only connected account", () => {
    assert.deepEqual(pickChannel([channel()]), { channel: channel() });
  });

  it("uses the account asked for", () => {
    assert.deepEqual(pickChannel([channel(), second], "sacc_x2"), { channel: second });
  });

  it("asks which account when several are connected", () => {
    assert.deepEqual(pickChannel([channel(), second]), { problem: "choose", choices: [channel(), second] });
  });

  it("says when no account is connected", () => {
    assert.deepEqual(pickChannel([]), { problem: "none", choices: [] });
  });

  it("asks again when the account asked for is not connected", () => {
    assert.deepEqual(pickChannel([channel()], "sacc_gone"), { problem: "choose", choices: [channel()] });
  });
});

describe("parseScheduledAt", () => {
  it("leaves an empty time as post now", () => {
    assert.equal(parseScheduledAt(undefined), undefined);
    assert.equal(parseScheduledAt(" "), undefined);
  });

  it("reads an ISO 8601 time with its offset", () => {
    assert.equal(parseScheduledAt("2026-10-02T15:00:00Z")?.toISOString(), "2026-10-02T15:00:00.000Z");
    assert.equal(parseScheduledAt("2026-10-02T09:00-04:00")?.toISOString(), "2026-10-02T13:00:00.000Z");
  });

  it("refuses a time without an offset, which would be read in the wrong zone", () => {
    assert.throws(() => parseScheduledAt("2026-10-02T09:00:00"));
    assert.throws(() => parseScheduledAt("2026-10-02"));
  });

  it("refuses a time it cannot read", () => {
    assert.throws(() => parseScheduledAt("next friday"));
  });
});

describe("splitThread", () => {
  it("keeps a single post whole", () => {
    assert.deepEqual(splitThread("Hello\n\nWorld", "x"), ["Hello\n\nWorld"]);
  });

  it("splits an X thread on lines holding only three dashes", () => {
    assert.deepEqual(splitThread("One\n---\nTwo\n  ---  \nThree", "x"), ["One", "Two", "Three"]);
  });

  it("drops empty posts around the dashes", () => {
    assert.deepEqual(splitThread("---\nOne\n---\n\n---", "x"), ["One"]);
  });

  it("never splits a LinkedIn post, which may use --- as a rule", () => {
    assert.deepEqual(splitThread("Intro\n---\nMore", "linkedin"), ["Intro\n---\nMore"]);
  });
});

describe("publish attempts", () => {
  const answers = () => ({
    create_posts: () => ({ posts: [post()] }),
    send_post: () => post({ status: "queued" }),
  });

  it("treats the same post with stray spaces as the same attempt", async () => {
    const { calls, dependencies } = fakes(answers());

    await publish(dependencies, publication);
    await publish(dependencies, { ...publication, parts: [" Hello ", ""] });

    assert.equal(calls.filter((call) => call.name === "create_posts").length, 1);
  });

  it("posts only once when the same post is pressed twice at the same time", async () => {
    const { calls, dependencies } = fakes(answers());

    const results = await Promise.allSettled([publish(dependencies, publication), publish(dependencies, publication)]);

    assert.equal(calls.filter((call) => call.name === "create_posts").length, 1);
    assert.deepEqual(
      results.map((result) => result.status),
      ["fulfilled", "rejected"],
    );
    assert.equal((results[1] as PromiseRejectedResult).reason.message, ALREADY_SENDING);
  });

  it("releases the lock while it waits on SocialFaktory", async () => {
    const held: string[] = [];
    const { dependencies } = fakes({
      create_posts: () => {
        assert.deepEqual(held, []);
        return { posts: [post()] };
      },
      send_post: () => {
        assert.deepEqual(held, []);
        return post({ status: "queued" });
      },
    });
    const lock = dependencies.lock;
    dependencies.lock = async (name, work) =>
      lock(name, async () => {
        held.push(name);
        try {
          return await work();
        } finally {
          held.pop();
        }
      });

    await publish(dependencies, publication);
  });

  it("lets a new press through once an unfinished send is too old to still be running", async () => {
    const first = fakes({
      create_posts: () => ({ posts: [post()] }),
      send_post: () => new Promise(() => {}),
    });
    void publish(first.dependencies, publication);
    await new Promise((resolve) => setImmediate(resolve));

    const later = fakes(answers(), NOW + SENDING_STALE_MS + 1);
    for (const [key, value] of first.items) await later.dependencies.storage.setItem(key, value);
    const result = await publish(later.dependencies, publication);

    assert.equal(result.status, "queued");
  });

  it("starts over with a fresh key after a refusal, so a reconnected account can post", async () => {
    let sends = 0;
    const { calls, dependencies } = fakes({
      create_posts: () => ({ posts: [post({ id: `post_${calls.length}` })] }),
      send_post: () => {
        sends += 1;
        if (sends === 1) throw new McpToolError("reconnect_required", {});
        return post({ status: "queued" });
      },
    });

    await assert.rejects(publish(dependencies, publication));
    await publish(dependencies, publication);

    const creates = calls.filter((call) => call.name === "create_posts");
    assert.equal(creates.length, 2);
    assert.notEqual(creates[0].args.idempotency_key, creates[1].args.idempotency_key);
  });

  it("starts over after a refused schedule", async () => {
    let creates = 0;
    const { calls, dependencies } = fakes({
      create_posts: () => {
        creates += 1;
        if (creates === 1) throw new McpToolError("validation_failed", { message: "Caption too long" });
        return { posts: [post()] };
      },
    });
    const later = { ...publication, scheduledAt: new Date(NOW + 60 * 60 * 1000) };

    await assert.rejects(publish(dependencies, later));
    await publish(dependencies, later);

    assert.notEqual(calls[0].args.idempotency_key, calls[1].args.idempotency_key);
  });

  it("ignores a corrupt saved attempt instead of failing forever", async () => {
    const { calls, items, dependencies } = fakes(answers());
    await publish(dependencies, publication);
    for (const key of items.keys()) items.set(key, "{not json");

    await publish(dependencies, publication);

    assert.equal(calls.filter((call) => call.name === "create_posts").length, 2);
  });

  it("clears attempts older than the replay window", async () => {
    const { items, dependencies } = fakes(answers());
    items.set(`${PENDING_POST_PREFIX}old`, JSON.stringify({ key: "k", at: NOW - PENDING_POST_TTL_MS - 1 }));
    items.set("pending-write-other", "{}");

    await publish(dependencies, publication);

    assert.equal(items.has(`${PENDING_POST_PREFIX}old`), false);
    assert.equal(items.has("pending-write-other"), true);
  });
});

describe("needsSignInForPublishing", () => {
  it("spots a connection that was not granted publishing", () => {
    assert.equal(needsSignInForPublishing(new McpToolError("scope_required", { scope: "publish" })), true);
  });

  it("leaves other refusals alone", () => {
    assert.equal(needsSignInForPublishing(new McpToolError("reconnect_required", {})), false);
    assert.equal(needsSignInForPublishing(new Error("scope_required")), false);
  });
});
