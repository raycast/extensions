import assert from "node:assert/strict";
import test from "node:test";
import type { CodexThread } from "./app-server";

const threadsModulePath = "./threads.ts";
const threadsModule = import(threadsModulePath) as Promise<
  typeof import("./threads")
>;

function buildThread(overrides: Partial<CodexThread>): CodexThread {
  return {
    id: "thread",
    sessionId: "",
    forkedFromId: null,
    parentThreadId: null,
    canAcceptDirectInput: null,
    preview: "",
    ephemeral: false,
    modelProvider: "openai",
    model: null,
    reasoningEffort: null,
    createdAt: 0,
    updatedAt: 0,
    status: { type: "idle" },
    path: null,
    cwd: "/tmp",
    cliVersion: "0.149.0",
    source: "cli",
    agentNickname: null,
    agentRole: null,
    gitInfo: null,
    name: null,
    turns: [],
    ...overrides,
  };
}

test("sorts child threads into subagents, automations, and maintenance", async () => {
  const { getChildThreadKind } = await threadsModule;

  assert.equal(getChildThreadKind({ subAgent: "compact" }), "maintenance");
  assert.equal(
    getChildThreadKind({ subAgent: { other: "guardian" } }),
    "maintenance",
  );
  assert.equal(
    getChildThreadKind({ subAgent: { other: "agent_job:0101-ae61" } }),
    "automation",
  );
  assert.equal(
    getChildThreadKind({ subAgent: { other: "custom" } }),
    "subagent",
  );
  assert.equal(
    getChildThreadKind({
      subAgent: {
        thread_spawn: {
          parent_thread_id: "root",
          depth: 1,
          agent_path: null,
          agent_nickname: null,
          agent_role: null,
        },
      },
    }),
    "subagent",
  );
});

test("splits direct children from deeper descendants, newest id wins", async () => {
  const { partitionThreadDescendants } = await threadsModule;

  const { direct, nested } = partitionThreadDescendants("root", [
    buildThread({ id: "child", parentThreadId: "root", updatedAt: 5 }),
    buildThread({ id: "grandchild", parentThreadId: "child", updatedAt: 20 }),
    buildThread({
      id: "child",
      parentThreadId: "root",
      updatedAt: 30,
      name: "newest",
    }),
  ]);

  assert.deepEqual(
    direct.map((thread) => thread.name),
    ["newest"],
  );
  assert.deepEqual(
    nested.map((thread) => thread.id),
    ["grandchild"],
  );
});
