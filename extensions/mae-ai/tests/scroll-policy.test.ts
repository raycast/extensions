import assert from "node:assert/strict";
import test from "node:test";
import {
  FollowLatestPolicy,
  latestResponseItemId,
  conversationPresentation,
} from "../src/lib/scroll-policy";
import { Turn } from "../src/lib/session";

test("the scroll target follows the latest turn and its newest wrapped response row", () => {
  const first: Turn = {
    id: 1,
    query: "First question",
    answer: "Older answer",
    model: "test",
    status: "complete",
  };
  const next: Turn = {
    ...first,
    id: 2,
    query: "Follow-up",
    answer: "",
    status: "streaming",
  };
  assert.equal(latestResponseItemId([]), undefined);
  assert.equal(latestResponseItemId([first, next]), "turn-2-query-0");
  assert.equal(
    latestResponseItemId([
      first,
      { ...next, answer: "Latest line\n".repeat(40).trim() },
    ]),
    "turn-2-answer-39",
  );
  assert.equal(
    latestResponseItemId([{ ...next, status: "error", error: "Offline" }]),
    "turn-2-error",
  );
  assert.equal(
    latestResponseItemId([{ ...next, status: "stopped" }]),
    "turn-2-stopped",
  );
});

test("programmatic selection acknowledgements do not pause follow-latest, even when delayed", () => {
  const policy = new FollowLatestPolicy();
  const visible = new Set(["turn-2-answer-0", "turn-2-answer-5"]);
  policy.expectSelection("turn-2-answer-0", 0);
  policy.expectSelection("turn-2-answer-5", 120);
  assert.equal(
    policy.select("turn-2-answer-5", "turn-2-answer-5", visible, 125),
    true,
  );
  for (const now of [130, 180, 260]) {
    assert.equal(
      policy.select("turn-2-answer-0", "turn-2-answer-5", visible, now),
      true,
    );
    assert.equal(policy.selectedId, "turn-2-answer-5");
  }
  assert.equal(policy.select(null, "turn-2-answer-5", visible, 270), true);
  assert.equal(
    policy.select("turn-2-answer-0", "turn-2-answer-5", visible, 1000),
    true,
  );
  assert.equal(policy.selectedId, "turn-2-answer-5");
});

test("explicitly pausing permits history browsing until resume or a new request", () => {
  const policy = new FollowLatestPolicy();
  const visible = new Set([
    "turn-1-query-0",
    "turn-2-answer-12",
    "turn-3-status",
    "turn-3-answer-3",
  ]);
  policy.expectSelection("turn-2-answer-12", 0);
  policy.select("turn-2-answer-12", "turn-2-answer-12", visible, 10);
  policy.pause();
  assert.equal(
    policy.select("turn-1-query-0", "turn-2-answer-12", visible, 1000),
    false,
  );
  assert.equal(
    policy.select("turn-2-answer-12", "turn-2-answer-12", visible, 1100),
    false,
  );
  policy.resume();
  policy.expectSelection("turn-3-status", 1200);
  assert.equal(
    policy.select("turn-3-status", "turn-3-status", visible, 1210),
    true,
  );
  policy.pause();
  assert.equal(
    policy.select("turn-3-answer-3", "turn-3-answer-3", visible, 2000),
    false,
  );
  policy.resume();
  assert.equal(policy.following, true);
});

test("continuous tokens keep a fixed scroll deadline instead of debouncing forever", () => {
  const policy = new FollowLatestPolicy();
  policy.expectSelection("answer-0", 0);
  for (const now of [40, 80, 110, 119]) {
    const plan = policy.nextScroll(`answer-${now}`, true, now)!;
    assert.equal(now + plan.delay, 120);
  }
  assert.equal(policy.nextScroll("answer-120", true, 120)?.delay, 0);
  policy.expectSelection("answer-120", 120);
  assert.equal(policy.nextScroll("answer-160", true, 160)?.delay, 80);
  assert.equal(policy.nextScroll("answer-final", false, 170)?.delay, 0);
  policy.pause();
  assert.equal(policy.nextScroll("answer-final", true, 180), undefined);
});

test("initial native selection and removed-row fallbacks cannot pause or rewind following", () => {
  const policy = new FollowLatestPolicy();
  const initial = new Set(["question", "waiting"]);
  assert.equal(policy.select("question", "waiting", initial, 0), true);
  policy.expectSelection("waiting", 10);
  policy.select("waiting", "waiting", initial, 20);
  const streamed = new Set(["question", "answer"]);
  assert.equal(policy.selection("answer", streamed), "answer");
  assert.equal(policy.select("question", "answer", streamed, 1000), true);
  assert.equal(policy.select("waiting", "answer", streamed, 1001), true);
  policy.expectSelection("answer", 1010);
  policy.select("answer", "answer", streamed, 1020);
  assert.equal(policy.select("question", "answer", streamed, 1100), true);
  assert.equal(policy.selectedId, "answer");
  policy.pause();
  assert.equal(policy.select("question", "answer", streamed, 1600), false);
});

test("rich replies preserve Markdown and image URLs with stable per-message selection", () => {
  const turn: Turn = {
    id: 1,
    query: "Define hello",
    answer:
      "# Hello\n\n**Greeting**\n\n![Example](https://example.com/image.png)",
    model: "test",
    status: "streaming",
  };
  const first = conversationPresentation([turn], true);
  const extended = conversationPresentation(
    [{ ...turn, answer: `${turn.answer}\n\nMore text\n`.repeat(50) }],
    true,
  );
  assert.equal(first.entries[0].answerRows[0].text, turn.answer);
  assert.equal(first.latestId, extended.latestId);
  assert.equal(extended.itemIds.length, 2);
  const plain = conversationPresentation([turn], false);
  assert.ok(plain.itemIds.includes(plain.latestId!));
  assert.ok(plain.entries[0].answerRows.length > 1);
});

test("resuming the current message keeps follow lock until explicitly paused again", () => {
  const policy = new FollowLatestPolicy();
  const visible = new Set(["older", "latest"]);
  policy.expectSelection("latest", 0);
  policy.pause();
  policy.resume();
  assert.equal(policy.nextScroll("latest", false, 1000), undefined);
  assert.equal(policy.select("older", "latest", visible, 1100), true);
  assert.equal(policy.selectedId, "latest");
  policy.pause();
  assert.equal(policy.select("older", "latest", visible, 1100), false);
  assert.equal(policy.selectedId, "older");
});
