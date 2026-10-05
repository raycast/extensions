import { afterEach, describe, expect, it } from "vitest";
import {
  doneMessage,
  InteractiveSession,
  PromptEvent,
  SessionEvent,
  startSession,
  withoutPrompt,
} from "../src/session";
import { fakeCli, sq } from "./helpers/fakeCli";
import { FakeQuickAdd, startFakeQuickAdd } from "./helpers/fakeQuickAdd";

let fake: FakeQuickAdd | undefined;
afterEach(async () => {
  await fake?.close();
  fake = undefined;
});

const info = (f: FakeQuickAdd) => ({ port: f.port, sessionId: f.session, token: f.token });
const prompt = { kind: "prompt", requestId: "r1", prompt: { type: "form", fields: [{ id: "value", type: "text" }] } };
const done = { kind: "done", result: { ok: true, verified: true, effect: "changed", file: "Inbox.md" } };

describe("InteractiveSession", () => {
  it("delivers a prompt, sends the reply, then delivers done and stops", async () => {
    fake = await startFakeQuickAdd();
    fake.push(prompt);
    fake.onReply = () => fake!.push(done);
    const session = new InteractiveSession(info(fake));
    const events: SessionEvent[] = [];
    await session.pollLoop((event) => {
      events.push(event);
      if (event.kind === "prompt") void session.reply(event.requestId, { value: "hi" });
    });
    expect(events.map((e) => e.kind)).toEqual(["prompt", "done"]);
    expect(fake.replies).toEqual([{ requestId: "r1", value: { value: "hi" } }]);
    expect(session.finished).toBe(true);
  });

  it("keeps polling through idle events and still accepts a late reply", async () => {
    fake = await startFakeQuickAdd();
    fake.push(prompt);
    fake.onReply = () => fake!.push(done);
    const session = new InteractiveSession(info(fake));
    const events: SessionEvent[] = [];
    await session.pollLoop((event) => {
      events.push(event);
      // Answer only after the loop has seen several idle polls.
      if (event.kind === "prompt") setTimeout(() => void session.reply(event.requestId, "late"), 150);
    });
    expect(events.map((e) => e.kind)).toEqual(["prompt", "done"]);
    expect(fake.replies).toEqual([{ requestId: "r1", value: "late" }]);
  });

  it("aborts: tells QuickAdd and stops without reporting the cancellation", async () => {
    fake = await startFakeQuickAdd();
    fake.push(prompt);
    const session = new InteractiveSession(info(fake));
    const events: SessionEvent[] = [];
    let aborting: Promise<void> | undefined;
    await session.pollLoop((event) => {
      events.push(event);
      if (event.kind === "prompt") aborting = session.abort();
    });
    await aborting;
    expect(events.map((e) => e.kind)).toEqual(["prompt"]);
    expect(fake.aborts).toBe(1);
    expect(session.finished).toBe(true);
  });

  it("does not abort a finished session", async () => {
    fake = await startFakeQuickAdd();
    fake.push(done);
    const session = new InteractiveSession(info(fake));
    await session.pollLoop(() => undefined);
    await session.abort();
    expect(fake.aborts).toBe(0);
  });

  it("reports server errors and QuickAdd errors as error events", async () => {
    fake = await startFakeQuickAdd();
    fake.failNextPoll = { status: 404, body: { ok: false, error: "Unknown session or token" } };
    const events: SessionEvent[] = [];
    await new InteractiveSession(info(fake)).pollLoop((event) => events.push(event));
    expect(events).toEqual([{ kind: "error", error: "Unknown session or token" }]);

    fake.push({ kind: "error", error: "Template not found" });
    const more: SessionEvent[] = [];
    await new InteractiveSession(info(fake)).pollLoop((event) => more.push(event));
    expect(more).toEqual([{ kind: "error", error: "Template not found" }]);
  });

  it("reports a lost connection", async () => {
    fake = await startFakeQuickAdd();
    const session = new InteractiveSession(info(fake));
    await fake.close();
    fake = undefined;
    const events: SessionEvent[] = [];
    await session.pollLoop((event) => events.push(event));
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ kind: "error" });
    expect((events[0] as { error: string }).error).toMatch(/Lost connection to QuickAdd/);
  });

  it("ignores event kinds it does not know", async () => {
    fake = await startFakeQuickAdd();
    fake.push({ kind: "progress", step: 1 });
    fake.push(done);
    const events: SessionEvent[] = [];
    await new InteractiveSession(info(fake)).pollLoop((event) => events.push(event));
    expect(events.map((e) => e.kind)).toEqual(["done"]);
  });

  it("still aborts the server session after a client-side failure", async () => {
    fake = await startFakeQuickAdd();
    fake.rawNextPoll = "not json";
    const session = new InteractiveSession(info(fake));
    const events: SessionEvent[] = [];
    await session.pollLoop((event) => events.push(event));
    expect(events.map((e) => e.kind)).toEqual(["error"]);
    await session.abort();
    await session.abort();
    expect(fake.aborts).toBe(1);
  });

  it("throws when QuickAdd rejects a reply", async () => {
    fake = await startFakeQuickAdd();
    fake.replyFailure = { status: 409, body: { ok: false, error: "No pending prompt for that requestId" } };
    await expect(new InteractiveSession(info(fake)).reply("nope", 1)).rejects.toThrow("No pending prompt");
  });
});

describe("startSession", () => {
  it("starts from the CLI's JSON", async () => {
    fake = await startFakeQuickAdd();
    const json = JSON.stringify({
      command: "quickadd:interactive",
      ok: true,
      port: fake.port,
      sessionId: "s1",
      token: "t1",
    });
    const result = await startSession(fakeCli(`printf '%s' ${sq(json)}`), "v", "id1");
    expect(result.ok).toBe(true);
    fake.push(done);
    const events: SessionEvent[] = [];
    if (result.ok) await result.session.pollLoop((event) => events.push(event));
    expect(events.map((e) => e.kind)).toEqual(["done"]);
  });

  it("passes the choice id", async () => {
    const result = await startSession(fakeCli(`printf '{"ok":false,"error":"%s"}' "$*"`), "v", "id1");
    expect(result).toEqual({ ok: false, reason: "quickadd-error", message: "vault=v quickadd:interactive id=id1" });
  });

  it("maps CLI failures", async () => {
    const result = await startSession(
      fakeCli(`printf '%s' ${sq("Command line interface is not enabled.")}`),
      "v",
      "id",
    );
    expect(result).toMatchObject({ ok: false, reason: "cli-disabled" });
  });
});

describe("doneMessage", () => {
  it("describes the outcome", () => {
    expect(doneMessage("Thought", { effect: "changed", file: "Inbox.md" })).toBe("Added to Inbox.md");
    expect(doneMessage("Person", { effect: "created", file: "People/A.md" })).toBe("Created People/A.md");
    expect(doneMessage("Macro", { effect: "unknown" })).toBe("Ran Macro");
  });
});

describe("withoutPrompt", () => {
  it("removes the answered prompt by request id, and nothing else", () => {
    const p = (requestId: string): PromptEvent => ({ kind: "prompt", requestId, prompt: { type: "input" } });
    expect(withoutPrompt([p("a"), p("b")], "b").map((e) => e.requestId)).toEqual(["a"]);
    expect(withoutPrompt([p("a")], "zzz").map((e) => e.requestId)).toEqual(["a"]);
  });
});
