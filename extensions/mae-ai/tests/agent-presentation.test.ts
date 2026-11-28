import assert from "node:assert/strict";
import test from "node:test";
import { agentPresentation } from "../src/lib/agent-presentation";
import { AgentApproval, AgentMessage } from "../src/lib/agents/types";
import { FollowLatestPolicy } from "../src/lib/scroll-policy";

test("rich remote runs select a stable response before the first token, including follow-ups and activity", () => {
  const firstQuestion = agentPresentation(
    [{ role: "user", text: "First question" }],
    ["Starting tool"],
    [],
    "running",
    "",
    true,
  );
  assert.equal(firstQuestion.latestId, "message-1");
  const messages: AgentMessage[] = [
    { role: "user", text: "First question" },
    { role: "assistant", text: "Previous answer" },
    { role: "user", text: "Follow-up question" },
  ];
  const waiting = agentPresentation(
    messages,
    ["Searching the web"],
    [],
    "running",
    "",
    true,
  );
  assert.equal(waiting.latestId, "message-3");
  assert.equal(waiting.rows.at(-1)?.role, "assistant");
  assert.equal(waiting.rows.at(-1)?.text, "");
  const follow = new FollowLatestPolicy();
  follow.expectSelection("message-1", 0);
  assert.equal(follow.nextScroll(waiting.latestId, true, 120)?.id, "message-3");
  follow.expectSelection(waiting.latestId!, 120);
  for (const [state, text] of [
    ["running", "# New answer"],
    ["completed", "# New answer\n\nCompleted response"],
  ] as const) {
    const view = agentPresentation(
      [...messages, { role: "assistant", text }],
      ["Searching the web", "Tool finished"],
      [],
      state,
      "",
      true,
    );
    assert.equal(view.latestId, waiting.latestId);
    assert.equal(
      follow.selection(view.latestId, new Set(view.itemIds)),
      "message-3",
    );
    assert.equal(view.rows.at(-1)?.text, text);
  }
  assert.equal(messages.length, 3);
  assert.equal(
    agentPresentation(messages, [], [], "running", "", false).latestId,
    "message-2-0",
  );
});

test("connecting, idle, running and successful completion need no synthetic status row or scroll target", () => {
  assert.deepEqual(
    agentPresentation([], [], [], "idle", "", false).itemIds,
    [],
  );
  const messages: AgentMessage[] = [
    { role: "user", text: "Question" },
    { role: "assistant", text: "Line\n".repeat(50) },
  ];
  for (const state of ["running", "completed"] as const) {
    const view = agentPresentation(messages, [], [], state, "", false);
    assert.equal(view.status, undefined);
    assert.equal(view.latestId, "message-1-49");
    assert.ok(view.itemIds.includes(view.latestId!));
    assert.ok(!view.itemIds.includes("agent-state"));
  }
});

test("rich agent replies retain Markdown and media while approvals and execution failures remain visible", () => {
  const markdown =
    "# Result\n\n![Diagram](https://example.com/diagram.png)\n\n```js\nhello();\n```";
  const messages: AgentMessage[] = [{ role: "assistant", text: markdown }];
  const rich = agentPresentation(
    messages,
    ["Searched the web"],
    [],
    "completed",
    "",
    true,
  );
  assert.equal(rich.rows[0].text, markdown);
  assert.equal(rich.latestId, "message-0");
  const approval: AgentApproval = {
    id: "approval-1",
    kind: "exec",
    title: "Run command?",
    detail: "Review this tool",
    allow: true,
  };
  const review = agentPresentation(
    messages,
    [],
    [approval],
    "running",
    "",
    true,
  );
  assert.equal(review.latestId, "approval-approval-1");
  assert.ok(review.itemIds.includes(review.latestId));
  const completed = agentPresentation(
    messages,
    ["Tool finished"],
    [approval],
    "completed",
    "",
    true,
  );
  assert.equal(completed.latestId, "message-0");
  assert.deepEqual(completed.approvals, []);
  assert.ok(!completed.itemIds.includes("approval-approval-1"));
  for (const state of ["unknown", "stopping", "cancelled", "failed"] as const) {
    const view = agentPresentation(messages, [], [], state, "", true);
    assert.ok(view.status);
    assert.equal(view.latestId, "agent-state");
  }
  const failure = agentPresentation(
    messages,
    [],
    [],
    "failed",
    "Authentication failed",
    true,
  );
  assert.equal(failure.latestId, "agent-error");
});
