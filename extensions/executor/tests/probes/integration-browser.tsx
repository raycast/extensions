import { mock } from "bun:test";
import assert from "node:assert/strict";

const node = (type: unknown, props: Record<string, unknown>) => ({ type, props });
const stub = (path: string, exports: object) =>
  mock.module(new URL(`../../src/${path}`, import.meta.url).pathname, () => exports);
let data: unknown[] = [];
let load: () => Promise<unknown[]>;
const rows = [
  { slug: "custom", name: "Example Service", kind: "openapi", displayUrl: "https://specs.example.net/api.json" },
];
mock.module("react/jsx-runtime", () => ({ jsx: node, jsxs: node }));
mock.module("react", () => ({ useRef: () => ({}), useState: () => [] }));
mock.module("@raycast/api", () => ({
  Action: Object.assign("Action", { Push: "Push", CopyToClipboard: "Copy" }),
  ActionPanel: Object.assign("Panel", { Section: "Section" }),
  List: Object.assign("List", { Item: "Item", EmptyView: "Empty" }),
  Form: "Form",
  Icon: { Plug: "plug" },
  Color: {},
  Image: { Mask: {} },
  Keyboard: { Shortcut: { Common: {} } },
  Toast: {},
  openExtensionPreferences() {},
  showToast() {},
  useNavigation() {},
}));
mock.module("@raycast/utils", () => ({
  useCachedPromise(callback: typeof load) {
    load = callback;
    return { data, isLoading: false, revalidate() {} };
  },
  showFailureToast() {},
}));
stub("lib/client.ts", {
  accountCacheKey: () => "synthetic-account",
  listIntegrations: async () => rows,
  request: async () => ({ baseUrl: "https://api.example.org", specUrl: rows[0].displayUrl }),
});
stub("lib/workspaces.ts", { workspaceTitle: (title: string) => `${title} · Example` });
stub("components/workspace-command.tsx", {
  withWorkspace: (component: unknown) => component,
  WorkspaceAction: "Workspace",
});
stub("components/delete-executor-item-action.tsx", { DeleteExecutorItemAction: "Delete" });
stub("components/console-action.tsx", { ConsoleAction: "Console" });
stub("components/connection-setup-form.tsx", { ConnectionSetupForm: "Connection" });
stub("lib/integration-metadata.ts", { saveIntegrationMetadata() {} });
stub("lib/format.ts", { summarize: (value: unknown) => value });
stub("search-tools.tsx", { ToolBrowser: "Tools" });
stub("add-integration.tsx", { AddIntegration: "Add" });
const { integrationIcon } = await import("../../src/lib/integration-icons");
stub("lib/integrations.ts", { integrationIcon });
const { default: Integrations } = await import("../../src/integrations");
const { listDisplayIntegrations } = await import("../../src/lib/integration-display");
const render = () => Integrations({} as never) as unknown as ReturnType<typeof node>;
render();
data = await load!();
const list = render();
assert.equal(list.props.navigationTitle, undefined);
const items = (list.props.children as unknown[])[1] as ReturnType<typeof node>[];
const directory = new Map((await listDisplayIntegrations()).map((item) => [item.slug, item]));
assert.deepEqual(items[0].props.icon, integrationIcon("custom", directory));
assert.match(String((items[0].props.icon as { source: string }).source), /logo\/example.org/);
assert.equal(items[0].props.title, "Example Service");
