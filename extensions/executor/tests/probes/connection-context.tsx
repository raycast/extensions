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
let data: unknown[] | undefined;
let loadError: Error | undefined;
const submissions: unknown[] = [];
const toasts: { title: string; message: string }[] = [];
let loadingApps = false;
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
  ActionPanel: Object.assign("Actions", { Section: "Section" }),
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
  showToast(toast: { title: string; message: string }) {
    toasts.push(toast);
  },
}));
mock.module("@raycast/utils", () => ({
  usePromise: () => ({ data: undefined, isLoading: loadingApps }),
  showFailureToast(error: unknown) {
    throw error;
  },
}));
stub("lib/client", {
  defaultOwner: () => "user",
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
stub("lib/integrations", {
  integrationIcon: () => "provider-icon",
  useDisplayIntegrations: () => ({ data, isLoading: !data && !loadError, error: loadError, revalidate() {} }),
});
stub("lib/connection-actions", {
  oauthClientDisplayName: (slug: string) => slug,
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
stub("components/console-action", { ConsoleAction: "ConsoleAction" });

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
  toasts.length = 0;
  loadingApps = false;
}
const integration = (slug: string, name: string) => ({
  slug,
  name,
  authMethods: [{ kind: "key", template: "key", label: "API Key" }],
});
const rows = [integration("alpha", "Alpha"), integration("quality_lab", "QA Lab")];

for (const props of [
  { initialIntegration: "quality_lab" },
  { defaults: { integration: "quality_lab", template: "key" } },
]) {
  reset();
  // The old form mounted an empty picker here and its empty change erased the requested slug.
  const early = field(render(props), "integration");
  early?.props.onChange("");
  data = rows;
  let tree = render(props);
  assert.equal(field(tree, "integration")?.props.value, "quality_lab", "origin must survive asynchronous loading");
  field(tree, "credential:token")?.props.onChange("synthetic-token");
  tree = render(props);
  field(tree, "integration")?.props.onChange("quality_lab");
  field(tree, "integration")?.props.onChange("");
  tree = render(props);
  assert.equal(
    field(tree, "credential:token")?.props.value,
    "synthetic-token",
    "same/empty events must not clear input",
  );
  await tree.find((el) => el.type === "Submit")!.props.onSubmit();
  assert.deepEqual(submissions[0], {
    target: { integration: "quality_lab", owner: "user", template: "key", label: "" },
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
field(tree, "integration")?.props.onChange("quality_lab");
assert.equal(field(render({ initialIntegration: "deleted" }), "integration")?.props.value, "quality_lab");
reset();
data = rows;
tree = render();
assert.equal(field(tree, "integration")?.props.value, "", "standalone creation requires an explicit choice");
const primary = tree.find((el) => el.type === "Submit")!;
assert.equal(primary.props.title, "Add Connection", "workspace switching must not become the form primary");
let focused = false;
(field(tree, "integration")!.props.ref as { current: unknown }).current = {
  focus() {
    focused = true;
  },
};
await primary.props.onSubmit();
tree = render();
assert.equal(field(tree, "integration")?.props.error, "Choose an integration.");
assert.equal(focused, true);
assert.equal(submissions.length, 0, "empty selection must never create a connection");
field(tree, "integration")?.props.onChange("quality_lab");
tree = render();
assert.equal(field(tree, "integration")?.props.error, undefined);
field(tree, "credential:token")?.props.onChange("synthetic-token");
tree = render();
field(tree, "integration")?.props.onChange("alpha");
assert.equal(field(render(), "credential:token")?.props.value, "", "changing provider clears credentials");
assert.equal(render({ isRootView: true })[0].props.navigationTitle, undefined);
assert.equal(render()[0].props.navigationTitle, "Add Connection");

// Waiting must be visible and explain why submitting cannot continue yet.
for (const oauth of [false, true]) {
  reset();
  if (oauth) {
    data = [{ ...integration("alpha", "Alpha"), authMethods: [{ kind: "oauth", template: "oauth" }] }];
    loadingApps = true;
  }
  tree = render({ initialIntegration: "alpha" });
  const action = tree.find((el) => el.type === "Submit")!;
  assert.equal(action.props.title, "Loading Setup");
  await action.props.onSubmit();
  assert.equal(toasts[0]?.title, "Loading Setup");
  assert.ok(toasts[0]?.message.includes("try again"));
  assert.equal(submissions.length, 0);
}

reset();
data = [{ ...integration("alpha", "Alpha"), authMethods: [] }];
tree = render({ initialIntegration: "alpha" });
assert.equal(
  tree.some((el) => el.type === "Submit"),
  false,
  "missing authentication must not expose inert submission",
);
assert.equal(tree.find((el) => el.type === "ConsoleAction")?.props.path, "/integrations/alpha");
assert.equal(tree.find((el) => el.type === "ConsoleAction")?.props.title, "Configure in Executor");
assert.ok(tree.some((el) => el.props.title === "Reload Setup"));
console.log("Connection context regression checks passed");
