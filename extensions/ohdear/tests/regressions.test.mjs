import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import ts from "typescript";

const root = fileURLToPath(new URL("../", import.meta.url));

// Run the real TypeScript modules with Raycast's native UI and network boundary stubbed.
function loadSource(name, mocks) {
  const filename = resolve(root, name);
  const { outputText } = ts.transpileModule(readFileSync(filename, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
    fileName: filename,
  });
  const module = { exports: {} };
  const nativeRequire = createRequire(filename);
  const require = (request) => {
    if (Object.hasOwn(mocks, request)) return mocks[request];
    if (request.startsWith(".")) {
      const target = resolve(dirname(filename), request);
      const source = [target, `${target}.ts`, `${target}.tsx`].find((path) => existsSync(path));
      return loadSource(source, mocks);
    }
    return nativeRequire(request);
  };
  new Function("require", "module", "exports", outputText)(require, module, module.exports);
  return module.exports;
}

const nativeApi = {
  getPreferenceValues: () => ({ apiKey: "test-key" }),
  Color: {},
  Icon: {},
};

function loadApi(t, fetch) {
  t.mock.method(globalThis, "fetch", fetch);
  return loadSource("src/api.tsx", {
    "@raycast/api": nativeApi,
    "@raycast/utils": { useFetch() {} },
  });
}

for (const method of ["createSite", "deleteSite"]) {
  for (const status of [401, 403, 422, 429, 500]) {
    test(`${method} rejects HTTP ${status} with the API message`, async (t) => {
      const api = loadApi(t, async () => new Response(JSON.stringify({ message: "Request denied" }), { status }));
      await assert.rejects(api[method]({ id: 1, url: "https://example.com", checks: ["uptime"] }), /Request denied/);
    });
  }
  test(`${method} reports non-JSON HTTP failures`, async (t) => {
    const api = loadApi(
      t,
      async () => new Response("<html>Bad gateway</html>", { status: 502, statusText: "Bad Gateway" }),
    );
    await assert.rejects(api[method]({ id: 1 }), /502/);
  });
}

test("successful create and delete do not require a JSON response body", async (t) => {
  const api = loadApi(t, async () => new Response(null, { status: 204 }));
  await api.createSite({ url: "https://example.com", checks: ["uptime"] });
  await api.deleteSite({ id: 1 });
});

const jsx = (type, props) => ({ type, props });
const jsxRuntime = { jsx, jsxs: jsx };
function nodes(node) {
  if (!node || typeof node !== "object") return [];
  return [
    node,
    ...Object.values(node.props ?? {})
      .flat(Infinity)
      .flatMap(nodes),
  ];
}

test("a rejected deletion restores the site in the list and shows a failure toast", async (t) => {
  let completeRequest;
  const request = new Promise((resolve) => {
    completeRequest = resolve;
  });
  const api = loadApi(t, () => request);
  const removedSite = { id: 1, label: "Example" };
  const otherSite = { id: 2, label: "Other" };
  let data = { Ungrouped: [removedSite, otherSite] };
  const failures = [];
  const { default: ShowSitesCommand } = loadSource("src/index.tsx", {
    "@raycast/api": { ...nativeApi, List: { Section: "Section" } },
    "@raycast/utils": {
      showFailureToast: async (error, options) => failures.push({ error, ...options }),
    },
    "react/jsx-runtime": jsxRuntime,
    react: { useState: (initial) => [initial, () => {}] },
    "./components/empty-view": { EmptyView: "EmptyView" },
    "./components/site-item": { SiteItem: "SiteItem" },
    "./api": {
      ...api,
      getSites: () => ({
        data,
        isLoading: false,
        // Model Raycast mutate's documented optimistic update and default rollback contract.
        async mutate(promise, options) {
          const previousData = data;
          data = options.optimisticUpdate(data);
          try {
            return await promise;
          } catch (error) {
            if (options.rollbackOnError !== false) data = previousData;
            throw error;
          }
        },
      }),
    },
  });
  const renderedSites = () => nodes(ShowSitesCommand()).filter((node) => node.type === "SiteItem");
  const siteItem = renderedSites().find((node) => node.props.entry.id === removedSite.id);
  const removal = siteItem.props.onRemoveItem(removedSite);
  assert.deepEqual(
    renderedSites().map((node) => node.props.entry),
    [otherSite],
  );

  completeRequest(new Response(JSON.stringify({ message: "Request denied" }), { status: 403 }));
  await removal;

  assert.deepEqual(
    renderedSites().map((node) => node.props.entry),
    [removedSite, otherSite],
  );
  assert.equal(failures.length, 1);
  assert.equal(failures[0].title, "Could Not Remove Site");
  assert.match(failures[0].error.message, /Request denied/);
});

function addForm(createSite) {
  const failures = [];
  const successes = [];
  let refreshes = 0;
  let navigations = 0;
  const api = {
    ...nativeApi,
    Form: { TextField: "TextField", Dropdown: { Item: "DropdownItem" }, TagPicker: { Item: "TagPickerItem" } },
    ActionPanel: "ActionPanel",
    Action: { SubmitForm: "SubmitForm" },
    Toast: { Style: { Success: "success", Failure: "failure" } },
    showToast: async (toast) => successes.push(toast),
    popToRoot: () => navigations++,
  };
  const { default: AddSite } = loadSource("src/add.tsx", {
    "@raycast/api": api,
    "@raycast/utils": { showFailureToast: async (error) => failures.push(error) },
    "react/jsx-runtime": jsxRuntime,
    react: { useRef: (current) => ({ current }), useState: (initial) => [initial, () => {}] },
    "./api": {
      createSite,
      getSites: () => ({ revalidate: () => refreshes++ }),
      getUserInfo: () => ({ data: { teams: [] }, isLoading: false }),
    },
  });
  const form = AddSite();
  const submit = nodes(form.props.actions).find((node) => node.type === "SubmitForm").props.onSubmit;
  return { submit, failures, successes, refreshes: () => refreshes, navigations: () => navigations };
}

const item = { url: "https://example.com", checks: ["uptime"] };

test("add-site network failures stay in the form and show a failure toast", async () => {
  const form = addForm(async () => {
    throw new Error("Network unavailable");
  });
  assert.equal(await form.submit(item), false);
  assert.match(form.failures[0]?.message ?? "", /Network unavailable/);
  assert.equal(form.navigations(), 0);
  assert.equal(form.refreshes(), 0);
});

test("repeated submission sends only one create request while pending", async () => {
  let requests = 0;
  let complete;
  const pending = new Promise((resolve) => {
    complete = resolve;
  });
  const form = addForm(() => {
    requests++;
    return pending;
  });
  const first = form.submit(item);
  const second = form.submit(item);
  const observedRequests = requests;
  complete(new Response("{}", { status: 201 }));
  const results = await Promise.allSettled([first, second]);
  assert.equal(observedRequests, 1);
  assert.deepEqual(results, [
    { status: "fulfilled", value: true },
    { status: "fulfilled", value: false },
  ]);
  assert.equal(form.refreshes(), 1);
  assert.equal(form.navigations(), 1);
  assert.equal(form.successes.length, 1);
});

test("a failed submission releases the lock for a retry", async () => {
  let requests = 0;
  const form = addForm(async () => {
    if (++requests === 1) throw new Error("Network unavailable");
  });
  assert.equal(await form.submit(item), false);
  assert.equal(await form.submit(item), true);
  assert.equal(requests, 2);
});

test("certificate checks render their pass/fail results", () => {
  const { default: CertificateHealth } = loadSource("src/views/certificate-health.tsx", {
    "@raycast/api": { List: { Item: { Detail: { Metadata: { Label: "MetadataLabel" } } } } },
    "react/jsx-runtime": jsxRuntime,
    "../components/empty-view": { EmptyView: "EmptyView" },
    "../api": {
      getCertificateHealth: () => ({
        data: {
          certificate_details: {},
          certificate_chain_issuers: [],
          certificate_checks: [
            { type: "valid", passed: true },
            { type: "notExpired", passed: false },
          ],
        },
        isLoading: false,
      }),
    },
  });
  const tree = CertificateHealth({ item: { label: "Example" } });
  const results = nodes(tree)
    .filter((node) => node.type === "MetadataLabel")
    .map((node) => node.props.text);
  assert.ok(results.includes("Passed"));
  assert.ok(results.includes("Failed"));
});
