import { mock } from "bun:test";
import assert from "node:assert/strict";

const node = (type: unknown, props: Record<string, unknown>) => ({ type, props });
const stub = (path: string, exports: object) =>
  mock.module(new URL(`../../src/${path}`, import.meta.url).pathname, () => exports);
let responses: unknown[] = [];
let queryIndex = 0;
let cacheIndex = 0;
const namespaces: string[] = [];
const queries: { callback: (...args: unknown[]) => Promise<unknown>; args: unknown[] }[] = [];
let scope = "synthetic-account";
let releaseConfig: () => void;
const configGate = new Promise<void>((resolve) => {
  releaseConfig = resolve;
});
const rows = [
  { slug: "custom", name: "Example Service", kind: "openapi", displayUrl: "https://specs.example.net/api.json" },
];
mock.module("react/jsx-runtime", () => ({ jsx: node, jsxs: node }));
mock.module("react", () => ({
  useRef: () => ({}),
  useState: () => [],
  useMemo: (callback: () => unknown) => callback(),
}));
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
  useCachedState(_key: string, _initial: unknown, options: { cacheNamespace: string }) {
    const index = cacheIndex++;
    namespaces[index] = options.cacheNamespace;
    return [
      responses[index],
      (data: unknown) => {
        responses[index] = data;
      },
    ];
  },
  usePromise(callback: (...args: unknown[]) => Promise<unknown>, args: unknown[]) {
    const index = queryIndex++;
    queries[index] = { callback, args };
    return { data: responses[index], isLoading: responses[index] === undefined, revalidate: () => callback(...args) };
  },
  showFailureToast() {},
}));
stub("lib/client.ts", {
  accountCacheKey: () => scope,
  listIntegrations: async () => rows,
  request: async () => {
    await configGate;
    return { baseUrl: "https://api.example.org", specUrl: rows[0].displayUrl };
  },
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
stub("lib/format.ts", { summarize: (value: unknown) => value, integrationName: (value: string) => value });
stub("search-tools.tsx", { ToolBrowser: "Tools" });
stub("add-integration.tsx", { AddIntegration: "Add" });
const { integrationIcon } = await import("../../src/lib/integration-icons");
const { default: Integrations } = await import("../../src/integrations");
const { listDisplayIntegrations } = await import("../../src/lib/integration-display");
const render = () => {
  queryIndex = 0;
  cacheIndex = 0;
  return Integrations({} as never) as unknown as ReturnType<typeof node>;
};
const items = (list: ReturnType<typeof node>) => (list.props.children as unknown[])[1] as ReturnType<typeof node>[];
render();
responses[0] = await queries[0].callback(...queries[0].args);
render();
const brandingPending = queries[1].callback(...queries[1].args);
const beforeBranding = render();
assert.equal(beforeBranding.props.isLoading, false, "optional branding must not hold the list spinner");
assert.equal(
  items(beforeBranding)[0].props.title,
  "Example Service",
  "rows render while config requests are unresolved",
);
assert.equal(beforeBranding.props.navigationTitle, undefined);
assert.equal((items(beforeBranding)[0].props.icon as { source: string }).source, "plug");
releaseConfig!();
responses[1] = await brandingPending;
const list = render();
const directory = new Map((await listDisplayIntegrations()).map((item) => [item.slug, item]));
assert.deepEqual(items(list)[0].props.icon, integrationIcon("custom", directory));
assert.match(String((items(list)[0].props.icon as { source: string }).source), /logo\/example.org/);
assert.equal(items(list)[0].props.title, "Example Service");
assert.deepEqual(Object.keys((queries[1].args[1] as object[])[0]).sort(), ["displayUrl", "kind", "slug"]);
responses[0] = [{ ...rows[0], name: "Renamed Service" }];
assert.equal(items(render())[0].props.title, "Renamed Service", "branding must not restore an old name");
responses[0] = [{ ...rows[0], displayUrl: "https://different.example.net/spec" }];
assert.equal(
  (items(render())[0].props.icon as { source: string }).source,
  "plug",
  "changed providers reject old branding",
);
responses[0] = rows;
scope = "another-account";
assert.equal(
  (items(render())[0].props.icon as { source: string }).source,
  "plug",
  "cached branding cannot cross accounts",
);

assert.deepEqual(namespaces, ["executor-integration-directory", "executor-integration-branding"]);
