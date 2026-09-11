import { mock } from "bun:test";
import assert from "node:assert/strict";
import { resolve } from "node:path";
import { existsSync } from "node:fs";

// Isolate app-only module stubs from the API test suite in a separate process.
const source = resolve(import.meta.dir, "../../src");
const stub = (path: string, exports: object) => {
  const file = `${source}/${path}`;
  mock.module(existsSync(`${file}.tsx`) ? `${file}.tsx` : `${file}.ts`, () => exports);
};
const node = (type: unknown, props: Record<string, unknown>) => ({ type, props });
let hooks: unknown[] = [];
let cursor = 0;
let promiseIndex = 0;
let data: unknown[] | undefined;
let loadError: Error | undefined;
const submissions: unknown[] = [];
const workspace = { id: "test-workspace", name: "Test" };
mock.module("react/jsx-runtime", () => ({ jsx: node, jsxs: node, Fragment: "Fragment" }));
mock.module("react", () => ({
  useState(initial: unknown) {
    const index = cursor++;
    if (!(index in hooks)) hooks[index] = typeof initial === "function" ? initial() : initial;
    return [
      hooks[index],
      (next: unknown) => {
        hooks[index] = typeof next === "function" ? next(hooks[index]) : next;
      },
    ];
  },
  useRef(initial: unknown) {
    const index = cursor++;
    return hooks[index] ?? (hooks[index] = { current: initial });
  },
}));
mock.module("@raycast/api", () => ({
  Action: Object.assign("Action", { SubmitForm: "Submit", OpenInBrowser: "Browser" }),
  ActionPanel: "Actions",
  Form: Object.assign("Form", {
    Dropdown: Object.assign("Dropdown", { Item: "Option" }),
    TextField: "Text",
    PasswordField: "Password",
    Description: "Description",
  }),
  Icon: {},
  Keyboard: { Shortcut: { Common: {} } },
  Toast: { Style: {} },
  useNavigation: () => ({ pop() {} }),
  open() {},
  showToast() {},
}));
mock.module("@raycast/utils", () => ({
  usePromise: () =>
    promiseIndex++ === 0
      ? { data, isLoading: !data && !loadError, error: loadError, revalidate() {} }
      : { data: undefined, isLoading: false },
  showFailureToast(error: unknown) {
    throw error;
  },
}));
stub("lib/client", {
  defaultOwner: () => "user",
  listIntegrations() {},
  listConnections() {},
  request() {},
  webUrl() {},
  execute() {},
});
stub("lib/workspaces", {
  currentWorkspace: () => workspace,
  workspaceTitle: (title: string) => title,
  runInWorkspace: async (target: unknown, fn: () => unknown) => {
    assert.equal(target, workspace);
    return fn();
  },
});
stub("lib/format", { connectionLabel: () => "Test Connection", titleCase: (s: string) => s });
stub("lib/integrations", { integrationIcon: () => "provider-icon" });
stub("lib/connection-actions", {
  connectionHandoffCode() {},
  handoffFromExecution() {},
  newlyCreatedConnection() {},
  validatedIntegrationUrl() {},
});
stub("lib/connection-setup", {
  credentialFields: () => ["token"],
  setupMethod() {},
  setupOAuthClients() {},
  startNativeOAuth() {},
  createNativeConnection: async (target: unknown, values: unknown) => {
    submissions.push({ target, values });
    return {};
  },
});
stub("components/execution-result", { ExecutionResultView: "Result" });
stub("components/setup-status", { SetupStatus: "Status" });
stub("components/workspace-command", { WorkspaceAction: "WorkspaceAction" });

const { ConnectionSetupForm } = await import(`${source}/components/connection-setup-form`);
type Element = {
  type: string;
  props: {
    [key: string]: unknown;
    onChange: (value: string) => void;
    onSubmit: () => Promise<void>;
  };
};
function elements(tree: unknown): Element[] {
  if (!tree) return [];
  if (Array.isArray(tree)) return tree.flatMap(elements);
  const element = tree as Element;
  return element.props ? [element, ...elements(element.props.children), ...elements(element.props.actions)] : [];
}
function render(props: object = {}) {
  cursor = 0;
  promiseIndex = 0;
  return elements(ConnectionSetupForm(props));
}
function field(tree: Element[], id: string) {
  return tree.find((el) => el.props.id === id);
}
function reset() {
  hooks = [];
  data = undefined;
  loadError = undefined;
  submissions.length = 0;
}
const integration = (slug: string, name: string) => ({
  slug,
  name,
  authMethods: [{ kind: "key", template: "key", label: "API Key" }],
});
const rows = [integration("alpha", "Alpha"), integration("mta", "MTA")];

for (const props of [{ initialIntegration: "mta" }, { defaults: { integration: "mta", template: "key" } }]) {
  reset();
  // The old form mounted an empty picker here and its empty change erased the requested slug.
  const early = field(render(props), "integration");
  early?.props.onChange("");
  data = rows;
  let tree = render(props);
  assert.equal(field(tree, "integration")?.props.value, "mta", "origin must survive asynchronous loading");
  field(tree, "credential:token")?.props.onChange("synthetic-token");
  tree = render(props);
  field(tree, "integration")?.props.onChange("mta");
  field(tree, "integration")?.props.onChange("");
  tree = render(props);
  assert.equal(
    field(tree, "credential:token")?.props.value,
    "synthetic-token",
    "same/empty events must not clear input",
  );
  await tree.find((el) => el.type === "Submit")!.props.onSubmit();
  assert.deepEqual(submissions[0], {
    target: { integration: "mta", owner: "user", template: "key", label: "" },
    values: { token: "synthetic-token" },
  });
}
reset();
data = rows;
let tree = render({ initialIntegration: "deleted" });
assert.ok(field(tree, "integration")?.props.error);
assert.equal(
  tree.some((el) => el.type === "Submit"),
  false,
  "missing target must not submit another integration",
);
assert.equal(field(tree, "template"), undefined);
field(tree, "integration")?.props.onChange("mta");
assert.equal(field(render({ initialIntegration: "deleted" }), "integration")?.props.value, "mta");
reset();
data = rows;
tree = render();
assert.equal(field(tree, "integration")?.props.value, "", "standalone creation requires an explicit choice");
field(tree, "integration")?.props.onChange("mta");
tree = render();
field(tree, "credential:token")?.props.onChange("synthetic-token");
tree = render();
field(tree, "integration")?.props.onChange("alpha");
assert.equal(field(render(), "credential:token")?.props.value, "", "changing provider clears credentials");
console.log("Connection context regression checks passed");
