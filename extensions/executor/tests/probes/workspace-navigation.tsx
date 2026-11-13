import { mock } from "bun:test";
import assert from "node:assert/strict";

const node = (type: unknown, props: Record<string, unknown>) => ({ type, props });
const profiles = [
  { id: "first", name: "First", baseUrl: "https://first.example.org" },
  { id: "second", name: "Second", baseUrl: "https://second.example.org" },
];
let pinnedWorkspace: (typeof profiles)[number] | undefined = profiles[0];
const activations: string[] = [];
const launches: unknown[] = [];
let pops = 0;
let reloads = 0;
mock.module("react/jsx-runtime", () => ({ jsx: node, jsxs: node }));
mock.module("react", () => ({ useRef: (value: unknown) => ({ current: value }), useState: () => [] }));
mock.module("@raycast/api", () => ({
  Action: Object.assign("Action", { Push: "Push", CopyToClipboard: "Copy", Style: {} }),
  ActionPanel: Object.assign("Panel", { Section: "Section" }),
  List: Object.assign("List", { Item: "Item", EmptyView: "Empty" }),
  Form: "Form",
  Icon: {},
  Color: {},
  Alert: {},
  Keyboard: { Shortcut: { Common: {} } },
  Toast: { Style: {} },
  LaunchType: { UserInitiated: "user" },
  openExtensionPreferences() {},
  confirmAlert() {},
  showToast: async () => ({ hide() {} }),
  useNavigation: () => ({
    pop() {
      pops++;
    },
  }),
  launchCommand: async (input: unknown) => {
    launches.push(input);
  },
}));
mock.module("@raycast/utils", () => ({
  usePromise: () => ({
    data: { workspaces: profiles, activeId: "second" },
    isLoading: false,
    revalidate: async () => {
      reloads++;
    },
  }),
  showFailureToast(error: unknown) {
    throw error;
  },
}));
mock.module(new URL("../../src/lib/workspaces.ts", import.meta.url).pathname, () => ({
  currentWorkspace: () => pinnedWorkspace,
  activateWorkspace: async (id: string) => {
    activations.push(id);
  },
  activeWorkspaceId() {},
  listWorkspaces() {},
  normalizeServerUrl() {},
  removeWorkspace() {},
  saveWorkspace() {},
  workspaceIdFor() {},
}));
mock.module(new URL("../../src/lib/workspace-setup.ts", import.meta.url).pathname, () => ({ verifyWorkspace() {} }));
const { default: Workspaces } = await import("../../src/workspaces");
type Element = ReturnType<typeof node>;
function elements(value: unknown): Element[] {
  if (!value) return [];
  if (Array.isArray(value)) return value.flatMap(elements);
  const el = value as Element;
  return el.props ? [el, ...elements(el.props.children), ...elements(el.props.actions)] : [];
}
function row(tree: Element, id: string) {
  return elements(tree).find((el) => el.type === "Item" && el.props.id === id)!;
}
function primary(item: Element) {
  return elements(item.props.actions).find((el) => String(el.type) === "Action")!.props.onAction as () => Promise<void>;
}
const nested = Workspaces({ isRootView: false, launchContext: { returnCommand: "connections" } }) as unknown as Element;
assert.equal(nested.props.navigationTitle, "Switch Workspace");
assert.equal(
  (row(nested, "first").props.accessories as unknown[]).length,
  1,
  "picker marks the command's pinned workspace",
);
await primary(row(nested, "first"))();
assert.equal(pops, 1);
assert.deepEqual(activations, []);
assert.deepEqual(launches, [], "choosing the current workspace must not relaunch the command");
const change = primary(row(nested, "second"));
await Promise.all([change(), change()]);
assert.deepEqual(activations, ["second"]);
assert.deepEqual(launches, [{ name: "connections", type: "user", context: { workspaceId: "second" } }]);
assert.equal(reloads, 0, "embedded selection opens the chosen workspace in one step");
const root = Workspaces() as unknown as Element;
assert.equal(root.props.navigationTitle, undefined);
await primary(row(root, "first"))();
assert.equal(reloads, 1, "standalone management keeps its existing activation behavior");
assert.equal(launches.length, 1);

pinnedWorkspace = undefined;
const recovery = Workspaces({
  isRootView: false,
  launchContext: { returnCommand: "connections" },
}) as unknown as Element;
await primary(row(recovery, "second"))();
assert.equal(pops, 1, "an unbound error screen must not be restored by selecting the saved active profile");
assert.deepEqual(launches[1], { name: "connections", type: "user", context: { workspaceId: "second" } });
