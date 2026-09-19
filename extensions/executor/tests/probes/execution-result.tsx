import { mock } from "bun:test";
import assert from "node:assert/strict";
import type { ExecutionResult } from "../../src/lib/types";

// Keep native component mocks isolated from the shared API tests.
type Node = { type: unknown; props: Record<string, unknown> };
const node = (type: unknown, props: Record<string, unknown>): Node => ({ type, props });
let hooks: unknown[] = [];
let cursor = 0;
let reads: string[] = [];
let writes: unknown[][] = [];
let notices: unknown[] = [];
let pops = 0;
let failure: Error | undefined;
let deferRead: Promise<void> | undefined;
let latest: { text: string; structured: unknown };
const done: ExecutionResult = { status: "completed", text: "Done", structured: { result: true } };
class ExecutorError extends Error {
  constructor(readonly status: number) {
    super(`HTTP ${status}`);
  }
}
mock.module("react/jsx-runtime", () => ({ jsx: node, jsxs: node, Fragment: "Fragment" }));
mock.module("react", () => ({
  useState(initial: unknown) {
    const index = cursor++;
    if (!(index in hooks)) hooks[index] = initial;
    return [hooks[index], (next: unknown) => (hooks[index] = next)];
  },
  useRef(initial: unknown) {
    const index = cursor++;
    return hooks[index] ?? (hooks[index] = { current: initial });
  },
}));
mock.module("@raycast/api", () => ({
  Action: Object.assign("Action", {
    Push: "Push",
    SubmitForm: "Submit",
    CopyToClipboard: "Copy",
    OpenInBrowser: "Browser",
  }),
  ActionPanel: "Panel",
  Detail: "Detail",
  Form: Object.assign("Form", { Description: "Description", TextArea: "TextArea" }),
  Keyboard: { Shortcut: { Common: {} } },
  Icon: {},
  Color: {},
  Toast: { Style: { Failure: "failure", Success: "success" } },
  showToast: async (value: unknown) => notices.push(value),
  useNavigation: () => ({ pop: () => pops++ }),
}));
mock.module("@raycast/utils", () => ({ showFailureToast: async (error: unknown) => notices.push(error) }));
mock.module(new URL("../../src/lib/client.ts", import.meta.url).pathname, () => ({
  ExecutorError,
  request: async (path: string) => {
    reads.push(path);
    await deferRead;
    if (failure) throw failure;
    return latest;
  },
  resumeExecution: async (...args: unknown[]) => {
    writes.push(args);
    return done;
  },
}));
mock.module(new URL("../../src/lib/workspaces.ts", import.meta.url).pathname, () => ({
  workspaceTitle: (s: string) => s,
}));
mock.module(new URL("../../src/components/workspace-command.tsx", import.meta.url).pathname, () => ({
  WorkspaceAction: "WorkspaceAction",
  WorkspaceMetadata: "WorkspaceMetadata",
}));
mock.module(new URL("../../src/lib/output-actions.ts", import.meta.url).pathname, () => ({ exportResultJson() {} }));
const { ExecutionResultView } = await import("../../src/components/execution-result");
function walk(value: unknown): Node[] {
  if (Array.isArray(value)) return value.flatMap(walk);
  if (!value || typeof value !== "object" || !("props" in value)) return [];
  const n = value as Node;
  return [n, ...walk(n.props.children)];
}
function action(view: Node, title: string) {
  const found = walk(view.props.actions).find((n) => n.props.title === title);
  assert.ok(found, `Missing ${title}`);
  return found;
}
const base = { kind: "form", message: "Approve", address: "tools.demo.user.personal.update", args: { id: 1 } };
function reset(interaction: Record<string, unknown> = base) {
  hooks = [];
  reads = [];
  writes = [];
  notices = [];
  pops = 0;
  failure = undefined;
  deferRead = undefined;
  latest = { text: "Review", structured: { executionId: "run/1", interaction } };
  const initial: ExecutionResult = { status: "paused", ...structuredClone(latest) };
  return () => {
    cursor = 0;
    return ExecutionResultView({
      initial,
      code: "",
      onResult: async () => {
        throw new Error("Inbox unavailable");
      },
    }) as unknown as Node;
  };
}
const invoke = (n: Node) => (n.props.onAction as () => Promise<unknown>)();

for (const title of ["Approve Tool Call", "Decline", "Cancel Execution"]) {
  const render = reset();
  await invoke(action(render(), title));
  assert.deepEqual(reads, ["/api/executions/run%2F1"]);
  assert.deepEqual(writes, [
    ["run/1", title === "Decline" ? "decline" : title === "Cancel Execution" ? "cancel" : "accept", undefined],
  ]);
  assert.match(String(render().props.markdown), /Result/);
}
for (const change of [
  { args: { id: 2 } },
  { meta: { risk: "new" } },
  { message: "Different" },
  { kind: "url", url: "https://example.com" },
  { requestedSchema: { type: "object" } },
]) {
  const render = reset();
  const reviewed = render();
  latest = { text: "Updated review", structured: { executionId: "run/1", interaction: { ...base, ...change } } };
  await invoke(action(reviewed, "Approve Tool Call"));
  assert.equal(writes.length, 0);
  assert.match(JSON.stringify(notices), /Approval Terms Changed/);
  assert.notDeepEqual(render().props.markdown, reviewed.props.markdown);
}
for (const status of [404, 410, 503]) {
  const render = reset();
  const approve = action(render(), "Approve Tool Call");
  failure = new ExecutorError(status);
  await invoke(approve);
  assert.equal(writes.length, 0);
  const actions = walk(render().props.actions);
  assert.equal(
    actions.some((n) => n.props.title === "Approve Tool Call"),
    status === 503,
  );
}
for (const structured of [{ executionId: "other", interaction: base }, { executionId: "run/1" }]) {
  const render = reset();
  const approve = action(render(), "Approve Tool Call");
  latest = { text: "Invalid", structured };
  await invoke(approve);
  assert.equal(writes.length, 0);
}
{
  const render = reset({ kind: "url", url: "https://example.com/old" });
  const proceed = action(render(), "Continue After Browser Step");
  latest.structured = { executionId: "run/1", interaction: { kind: "url", url: "https://example.com/new" } };
  await invoke(proceed);
  assert.equal(writes.length, 0);
  assert.equal(action(render(), "Continue in Browser").props.url, "https://example.com/new");
  await invoke(action(render(), "Continue After Browser Step"));
  assert.equal(writes.length, 1);
}
{
  const render = reset();
  const approve = action(render(), "Approve Tool Call");
  let release!: () => void;
  deferRead = new Promise<void>((resolve) => {
    release = resolve;
  });
  const first = invoke(approve);
  await invoke(approve);
  assert.equal(reads.length, 1);
  release();
  await first;
  assert.equal(writes.length, 1);
}
for (const changed of [true, false]) {
  const render = reset({ ...base, requestedSchema: { type: "object", properties: { answer: { type: "string" } } } });
  const pushed = action(render(), "Provide Requested Input").props.target as Node;
  // Separate form hook state, as React would use for a pushed component.
  const parentHooks = hooks;
  hooks = [];
  cursor = 0;
  const form = (pushed.type as (props: unknown) => Node)(pushed.props);
  const formSubmit = action(form, "Submit Response").props.onSubmit as () => Promise<void>;
  hooks = parentHooks;
  if (changed)
    latest.structured = {
      executionId: "run/1",
      interaction: { ...base, requestedSchema: { type: "object", required: ["newField"] } },
    };
  await formSubmit();
  assert.equal(pops, 1);
  assert.equal(writes.length, changed ? 0 : 1);
  if (!changed) assert.deepEqual(writes[0], ["run/1", "accept", {}]);
}
