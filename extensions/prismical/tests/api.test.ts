import { strict as assert } from "node:assert";
import { test } from "node:test";
import { Api, ApiError, origin } from "../src/lib/api";
const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });
test("search uses server offset and maps identifiers", async () => {
  const calls: string[] = [];
  const api = new Api("https://example.com", "test", async (url) => {
    calls.push(String(url));
    return reply({
      results: [{ note_id: "n1", title: "Test", content_text: "Body", updated_at: "2026-09-22" }],
      total: 2,
    });
  });
  const first = await api.notes("a & b");
  assert.equal(first.notes[0].id, "n1");
  assert.equal(first.next, "1");
  await api.notes("a & b", first.next);
  assert.match(calls[0], /query=a\+%26\+b/);
  assert.match(calls[1], /offset=1/);
});
test("recent notes preserve opaque cursors and omit trash", async () => {
  const api = new Api("https://example.com", "test", async () =>
    reply({ results: [{ id: "live" }, { id: "trash", trashed_at: "date" }], has_more: true, next_cursor: "opaque+/=" }),
  );
  assert.deepEqual(await api.notes(""), { notes: [{ id: "live" }], next: "opaque+/=" });
});
test("append is one server-side append and never an automatic retry", async () => {
  let count = 0;
  const api = new Api("https://example.com", "test", async (_url, options) => {
    count++;
    assert.equal(options?.method, "PUT");
    assert.deepEqual(JSON.parse(String(options?.body)), { markdown: "hello", mode: "append" });
    throw new Error("connection lost");
  });
  await assert.rejects(api.write("n", "hello", "append"), (e) => e instanceof ApiError && e.uncertain);
  assert.equal(count, 1);
});
test("auth and rate limits are actionable and do not retry", async () => {
  for (const status of [401, 403, 429]) {
    let count = 0;
    const api = new Api("https://example.com", "test", async () => {
      count++;
      return reply({}, status);
    });
    await assert.rejects(api.me(), (e) => e instanceof ApiError && e.status === status && !e.uncertain);
    assert.equal(count, 1);
  }
});
test("never follow redirects with credentials or send keys over remote HTTP", async () => {
  assert.throws(() => origin("http://example.com"));
  assert.throws(() => origin("https://key@example.com"));
  const api = new Api("https://example.com", "test", async (_url, options) => {
    assert.equal(options?.redirect, "error");
    return reply({});
  });
  await api.me();
});
test("cancelled searches stay cancelled", async () => {
  const controller = new AbortController();
  controller.abort();
  const api = new Api("https://example.com", "test", async (_url, options) => {
    options?.signal?.throwIfAborted();
    return reply({});
  });
  await assert.rejects(api.notes("test", "", controller.signal), (e) => e instanceof Error && e.name === "AbortError");
});
import { saveCapture, CaptureDraft } from "../src/lib/capture";
test("partial capture retries body on the existing note after restoration", async () => {
  const calls: string[] = [];
  let rejectBody = true;
  const api = new Api("https://example.com", "test", async (url) => {
    calls.push(String(url));
    return String(url).endsWith("/content") ? reply({}, rejectBody ? 403 : 200) : reply({ id: "created-once" });
  });
  let saved: CaptureDraft = { title: "Test", body: "hello", folder: "", uncertain: false };
  const persist = async (d: CaptureDraft) => {
    saved = JSON.parse(JSON.stringify(d));
  };
  await assert.rejects(saveCapture(api, saved, persist));
  assert.equal(saved.id, "created-once");
  assert.equal(saved.uncertain, false);
  rejectBody = false;
  await saveCapture(api, saved, persist);
  assert.equal(calls.filter((c) => c.endsWith("/notes")).length, 1);
  assert.equal(saved.body, "");
});
test("uncertain create persists blocked recovery and cannot create again silently", async () => {
  let calls = 0;
  const api = new Api("https://example.com", "test", async () => {
    calls++;
    throw new Error("lost");
  });
  let saved: CaptureDraft = { title: "", body: "hello", folder: "", uncertain: false };
  const persist = async (d: CaptureDraft) => {
    saved = d;
  };
  await assert.rejects(saveCapture(api, saved, persist));
  assert.equal(saved.uncertain, true);
  await assert.rejects(saveCapture(api, saved, persist));
  assert.equal(calls, 1);
});

import { noteEmoji } from "../src/lib/note-icon";
test("note icons accept emoji sequences without fetching URLs or local files", () => {
  for (const emoji of ["💬", "👩🏽‍💻", "🇨🇦", "1️⃣"]) assert.equal(noteEmoji(emoji), emoji);
  for (const value of [null, "", "https://example.com/icon.png", "/tmp/icon.png", "icon.png", "two words", "💬📚"])
    assert.equal(noteEmoji(value), undefined);
});

test("leaving a transcript cancels its request", async () => {
  const controller = new AbortController();
  const api = new Api("https://example.com", "test", async (_url, options) => {
    controller.abort();
    options?.signal?.throwIfAborted();
    return reply({ results: [], truncated: false });
  });
  await assert.rejects(api.transcript("n", controller.signal), (e) => e instanceof Error && e.name === "AbortError");
});

test("recent notes skip fully trashed pages and preserve the next cursor", async () => {
  let calls = 0;
  const api = new Api("https://example.com", "test", async () => {
    calls++;
    return reply(
      calls === 1
        ? { results: [{ id: "trash", trashed_at: "date" }], has_more: true, next_cursor: "next" }
        : { results: [{ id: "live" }], has_more: true, next_cursor: "last" },
    );
  });
  assert.deepEqual(await api.notes(""), { notes: [{ id: "live" }], next: "last" });
  assert.equal(calls, 2);
});
test("repeated empty-page cursors stop instead of looping", async () => {
  const api = new Api("https://example.com", "test", async () =>
    reply({ results: [], has_more: true, next_cursor: "same" }),
  );
  await assert.rejects(api.notes(""), /repeated a page/);
});
test("input limits fail before sending requests", async () => {
  let calls = 0;
  const api = new Api("https://example.com", "test", async () => {
    calls++;
    return reply({});
  });
  await assert.rejects(api.notes("x".repeat(501)), /500 characters/);
  assert.throws(() => api.create("x".repeat(1001), ""), /1,000 characters/);
  assert.equal(calls, 0);
});
test("read errors do not claim draft preservation and create errors identify folders", async () => {
  const read = new Api("https://example.com", "test", async () => reply({}, 503));
  await assert.rejects(read.notes(""), (e: Error) => !e.message.includes("draft"));
  const create = new Api("https://example.com", "test", async () => reply({}, 404));
  await assert.rejects(create.create("note", "missing"), /folder/);
});
