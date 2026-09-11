import { mock } from "bun:test";
import assert from "node:assert/strict";

class WorkspaceNotConfiguredError extends Error {}

const source = new URL("../../src/lib/workspaces.ts", import.meta.url).pathname;
let profile: object | undefined = undefined;
let failure: Error | undefined = undefined;
let state: { data?: unknown; error?: Error; isLoading: boolean } = { isLoading: true };
let load: (id?: string) => Promise<unknown>;
let bound: unknown;
let launched: unknown;
const node = (type: unknown, props: Record<string, unknown>) => ({ type, props });
mock.module("react/jsx-runtime", () => ({ jsx: node, jsxs: node }));
mock.module("@raycast/api", () => ({
  Action: Object.assign("Action", { OpenInBrowser: "Browser" }),
  ActionPanel: "Actions",
  List: Object.assign("List", { EmptyView: "Empty" }),
  Detail: "Detail",
  Icon: {},
  Keyboard: { Shortcut: { Common: {} } },
  LaunchType: { UserInitiated: "user" },
  environment: { commandName: "search-tools" },
  launchCommand: (value: unknown) => {
    launched = value;
  },
  openExtensionPreferences() {},
}));
mock.module("@raycast/utils", () => ({
  usePromise: (callback: typeof load) => {
    load = callback;
    return state;
  },
}));
mock.module(source, () => ({
  WorkspaceNotConfiguredError,
  resolveWorkspace: async () => {
    if (failure) throw failure;
    if (!profile) throw new WorkspaceNotConfiguredError("Add a workspace to connect Executor.");
    return profile;
  },
  bindCommandWorkspace: (value: unknown) => {
    bound = value;
  },
  currentWorkspace: () => profile,
}));
const { withWorkspace } = await import("../../src/components/workspace-command");
const Child = () => null;
const Command = withWorkspace(Child);
const render = () => Command({} as never) as unknown as ReturnType<typeof node>;
assert.equal(render().props.isLoading, true);
assert.equal(render().props.children, undefined);
const firstRun = await load!();
assert.equal(firstRun, null);
state = { data: firstRun, isLoading: false };
const welcome = render().props.children as ReturnType<typeof node>;
assert.equal(welcome.props.title, "Welcome to Executor");
const panel = welcome.props.actions as ReturnType<typeof node>;
const action = (panel.props.children as ReturnType<typeof node>[])[0];
assert.equal(action.props.title, "Add Workspace");
await (action.props.onAction as () => Promise<void>)();
assert.deepEqual(launched, {
  name: "workspaces",
  type: "user",
  context: { intent: "add", returnCommand: "search-tools" },
});
await assert.rejects(() => load!("removed-workspace"));
failure = new Error("Synthetic LocalStorage read failure");
await assert.rejects(() => load!(), /LocalStorage read failure/);
state = { error: failure, isLoading: false };
assert.equal(render().type, "Detail");
failure = undefined;
profile = { id: "configured" };
state = { data: await load!(), isLoading: false };
assert.equal(bound, profile);
assert.equal(render().type, Child);
failure = new Error("Stored workspace could not be read.");
await assert.rejects(() => load!(), /could not be read/);
state = { error: failure, isLoading: false };
assert.equal(render().type, "Detail");
