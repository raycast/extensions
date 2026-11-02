import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { afterEach, mock, test } from "node:test";
import React from "react";
import { create, act } from "react-test-renderer";
import ts from "typescript";

const extensionRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const nativeRequire = createRequire(import.meta.url);
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const product = (id, title = `Product ${id}`) => ({ id, title, handle: `product-${id}` });
const productsResponse = (products) => Response.json({ products });
const tick = () => new Promise((resolve) => setImmediate(resolve));
function deferred() {
  let resolve;
  const promise = new Promise((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

let active;
afterEach(async () => {
  if (active?.renderer) await act(async () => active.renderer.unmount());
  active = undefined;
  mock.restoreAll();
});

// Run the command and the installed Raycast hooks with React. Only native Raycast UI/storage are stubbed.
function harness(handler) {
  const requests = [];
  const writes = [];
  const toasts = [];
  const preferences = { storeUrl: "https://store.example" };
  const storage = new Map();
  const cacheStores = new Map();
  const h = { requests, writes, toasts, preferences, handler, renderer: undefined };
  active = h;
  const component =
    (name, extras = () => []) =>
    (props) =>
      React.createElement(name, props, props.children, ...extras(props));
  const Grid = component("Grid", (props) => [props.searchBarAccessory]);
  Grid.Inset = { Large: "large" };
  Grid.Item = component("Grid.Item", (props) => [props.actions]);
  Grid.EmptyView = component("Grid.EmptyView");
  Grid.Dropdown = component("Grid.Dropdown");
  Grid.Dropdown.Section = component("Grid.Dropdown.Section");
  Grid.Dropdown.Item = component("Grid.Dropdown.Item");
  const Action = component("Action");
  Action.Push = component("Action.Push");
  Action.CopyToClipboard = component("Action.CopyToClipboard");
  class Cache {
    constructor({ namespace } = {}) {
      if (!cacheStores.has(namespace)) cacheStores.set(namespace, new Map());
      this.values = cacheStores.get(namespace);
      this.listeners = new Set();
    }
    get = (key) => this.values.get(key);
    set = (key, value) => {
      this.values.set(key, value);
      writes.push(value);
      for (const listener of this.listeners) listener();
    };
    subscribe = (listener) => {
      this.listeners.add(listener);
      return () => this.listeners.delete(listener);
    };
  }
  const api = {
    Grid,
    Action,
    ActionPanel: component("ActionPanel"),
    Cache,
    Icon: new Proxy({}, { get: (_object, key) => String(key) }),
    Color: { PrimaryText: "primary" },
    Toast: { Style: { Success: "success", Failure: "failure", Animated: "animated" } },
    LaunchType: { Background: "background" },
    environment: {
      launchType: "user",
      commandMode: "view",
      isDevelopment: true,
      assetsPath: path.join(extensionRoot, "assets"),
    },
    getPreferenceValues: () => preferences,
    showToast: async (...args) => {
      toasts.push(typeof args[0] === "object" ? args[0] : { style: args[0], title: args[1], message: args[2] });
      return { hide() {} };
    },
    LocalStorage: {
      getItem: async (key) => storage.get(key),
      setItem: async (key, value) => storage.set(key, value),
      removeItem: async (key) => storage.delete(key),
    },
  };
  const modules = new Map();
  function load(filename) {
    if (filename.endsWith("product-detail.tsx")) return { __esModule: true, default: () => null };
    if (modules.has(filename)) return modules.get(filename).exports;
    const module = { exports: {} };
    modules.set(filename, module);
    const source = readFileSync(filename, "utf8");
    const code = /\.tsx?$/.test(filename)
      ? ts.transpileModule(source, {
          compilerOptions: {
            target: ts.ScriptTarget.ES2023,
            module: ts.ModuleKind.CommonJS,
            jsx: ts.JsxEmit.ReactJSX,
            esModuleInterop: true,
          },
        }).outputText
      : source;
    const require = (id) => {
      if (id === "@raycast/api") return api;
      if (id === "@raycast/utils") return load(nativeRequire.resolve(id));
      if (id.startsWith(".")) {
        const base = path.resolve(path.dirname(filename), id);
        const target = [base, `${base}.ts`, `${base}.tsx`, `${base}.js`].find((candidate) => existsSync(candidate));
        return load(target);
      }
      return createRequire(filename)(id);
    };
    vm.runInThisContext(`(function(exports, require, module, __filename, __dirname) {\n${code}\n})`, { filename })(
      module.exports,
      require,
      module,
      filename,
      path.dirname(filename),
    );
    return module.exports;
  }
  const Command = load(path.join(extensionRoot, "src/browse-shop.tsx")).default;
  mock.method(globalThis, "fetch", async (input, init) => {
    const url = new URL(input);
    requests.push({ url, signal: init?.signal });
    if (url.pathname === "/meta.json")
      return h.metaFailure ? new Response("Unavailable", { status: 503 }) : Response.json({ currency: "USD" });
    if (url.pathname === "/collections.json")
      return Response.json({ collections: [{ id: 1, title: "Sale", handle: "sale" }] });
    if (url.pathname === "/search/suggest.json") {
      if (h.searchFailure) return new Response("Unavailable", { status: 503 });
      return Response.json({
        resources: {
          results: {
            products: [
              { id: 8, title: "Leather Shoes", handle: "boots", type: "shoe", price: "10.00", available: true },
            ],
          },
        },
      });
    }
    return h.handler(url, init);
  });
  h.mount = async () =>
    act(async () => {
      h.renderer = create(React.createElement(Command));
      await tick();
    });
  h.grid = () => h.renderer.root.findByType("Grid");
  h.items = () => h.renderer.root.findAllByType("Grid.Item").map((node) => node.props.title);
  h.productRequests = () => requests.filter(({ url }) => url.pathname.endsWith("/products.json"));
  h.loadMore = async () =>
    act(async () => {
      h.grid().props.pagination?.onLoadMore();
      await tick();
    });
  h.search = async (text) =>
    act(async () => {
      h.grid().props.onSearchTextChange(text);
      await tick();
    });
  h.collection = async (value) =>
    act(async () => {
      h.grid().props.searchBarAccessory.props.onChange(value);
      await tick();
    });
  h.changeStore = async (url) =>
    act(async () => {
      preferences.storeUrl = url;
      h.renderer.update(React.createElement(Command));
      await tick();
    });
  h.resolve = async (pending, response) =>
    act(async () => {
      pending.resolve(response);
      await tick();
    });
  return h;
}

test("the first page renders immediately; later pages load on demand and only the first page is cached", async () => {
  const pending = deferred();
  const h = harness((url) => {
    const page = url.searchParams.get("page");
    return page === "1"
      ? productsResponse([product(1), product(2)])
      : page === "2"
        ? pending.promise
        : productsResponse([]);
  });
  await h.mount();
  assert.deepEqual(h.items(), ["Product 1", "Product 2"]);
  assert.equal(h.productRequests().length, 1);
  assert.equal(h.grid().props.pagination.hasMore, true);
  await act(async () => {
    const loadMore = h.grid().props.pagination.onLoadMore;
    loadMore();
    loadMore();
    await tick();
  });
  assert.equal(h.productRequests().length, 2);
  assert.equal(h.productRequests()[1].signal.aborted, false);
  assert.equal(h.grid().props.isLoading, true);
  assert.deepEqual(h.items(), ["Product 1", "Product 2"]);
  await h.resolve(pending, productsResponse([product(2), product(3)]));
  assert.deepEqual(h.items(), ["Product 1", "Product 2", "Product 3"]);
  const cachedProducts = h.writes.map((value) => JSON.parse(value)).filter((value) => Array.isArray(value));
  assert.ok(cachedProducts.some((value) => value.map((p) => p.id).join() === "1,2"));
  assert.ok(!cachedProducts.some((value) => value.map((p) => p.id).join() === "1,2,3"));
  await h.loadMore();
  assert.equal(h.grid().props.pagination.hasMore, false);
  assert.deepEqual(h.items(), ["Product 1", "Product 2", "Product 3"]);
});

test("a later-page failure keeps all loaded pages, reports partial results, and reload starts at page one", async () => {
  let fail = true;
  const h = harness((url) => {
    const page = Number(url.searchParams.get("page"));
    return page === 3 && fail
      ? new Response("Unavailable", { status: 503 })
      : productsResponse(page <= 2 ? [product(page)] : []);
  });
  await h.mount();
  await h.loadMore();
  await h.loadMore();
  assert.deepEqual(h.items(), ["Product 1", "Product 2"]);
  assert.equal(h.grid().props.pagination.hasMore, false);
  assert.match(h.grid().props.navigationTitle, /Partial Results/);
  assert.ok(h.toasts.some((toast) => toast.title === "Could Not Load More Products" && /503/.test(toast.message)));
  fail = false;
  await act(async () => {
    h.renderer.root
      .findAllByType("Action")
      .find((node) => node.props.title === "Reload Products")
      .props.onAction();
    await tick();
  });
  assert.equal(h.productRequests().at(-1).url.searchParams.get("page"), "1");
  assert.deepEqual(h.items(), ["Product 1"]);
  assert.equal(h.grid().props.navigationTitle, undefined);
  await h.loadMore();
  assert.deepEqual(h.items(), ["Product 1", "Product 2"]);
});

for (const mode of ["malformed", "repeated"]) {
  test(`${mode} subsequent pages stop pagination and keep the first page visible`, async () => {
    const h = harness((url) =>
      url.searchParams.get("page") === "1"
        ? productsResponse([product(1)])
        : mode === "malformed"
          ? new Response("not json")
          : productsResponse([product(1)]),
    );
    await h.mount();
    await h.loadMore();
    assert.deepEqual(h.items(), ["Product 1"]);
    assert.equal(h.grid().props.pagination.hasMore, false);
    assert.match(h.grid().props.navigationTitle, /Partial Results/);
    assert.equal(h.toasts.at(-1).title, "Could Not Load More Products");
  });
}

test("switching store aborts a pending first page and never renders or caches its late result", async () => {
  const pending = deferred();
  const h = harness((url) =>
    url.origin === "https://store.example" ? pending.promise : productsResponse([product(1, "Other Store")]),
  );
  await h.mount();
  const oldRequest = h.productRequests()[0];
  await h.changeStore("https://other.example");
  assert.equal(oldRequest.signal.aborted, true);
  assert.deepEqual(h.items(), ["Other Store"]);
  assert.ok(h.productRequests().every(({ url }) => url.searchParams.get("page") === "1"));
  await h.resolve(pending, productsResponse([product(99)]));
  assert.deepEqual(h.items(), ["Other Store"]);
  assert.ok(!h.writes.some((value) => value.includes("product-99")));
});

test("switching collection cancels the pending next page and resets deduplication and pagination", async () => {
  const pending = deferred();
  const h = harness((url) =>
    url.pathname.includes("/collections/")
      ? productsResponse([product(1, "Sale Product")])
      : url.searchParams.get("page") === "1"
        ? productsResponse([product(1)])
        : pending.promise,
  );
  await h.mount();
  await h.loadMore();
  const oldRequest = h.productRequests()[1];
  await h.collection("by:sale");
  assert.equal(oldRequest.signal.aborted, true);
  assert.deepEqual(h.items(), ["Sale Product"]);
  assert.equal(h.productRequests().at(-1).url.pathname, "/collections/sale/products.json");
  assert.equal(h.productRequests().at(-1).url.searchParams.get("page"), "1");
  await h.resolve(pending, productsResponse([product(2)]));
  assert.deepEqual(h.items(), ["Sale Product"]);
});

test("search disables browse pagination, aborts its next page, and clearing search starts with the cached first page", async () => {
  const pending = deferred();
  const refresh = deferred();
  let firstPages = 0;
  const h = harness((url) =>
    url.searchParams.get("page") === "1"
      ? ++firstPages === 1
        ? productsResponse([product(1)])
        : refresh.promise
      : pending.promise,
  );
  await h.mount();
  await h.loadMore();
  const oldRequest = h.productRequests()[1];
  await h.search("boots");
  assert.equal(oldRequest.signal.aborted, true);
  assert.equal(h.grid().props.pagination, undefined);
  assert.equal(h.grid().props.filtering, false);
  assert.deepEqual(h.items(), ["Leather Shoes"]);
  await h.search("");
  assert.equal(h.grid().props.filtering, true);
  assert.deepEqual(h.items(), ["Product 1"]);
  assert.deepEqual(
    h.productRequests().map(({ url }) => url.searchParams.get("page")),
    ["1", "2", "1"],
  );
  await h.resolve(refresh, productsResponse([product(1)]));
  await h.resolve(pending, productsResponse([product(2)]));
  assert.deepEqual(h.items(), ["Product 1"]);
});

test("a failed predictive search does not poison browsing when the query is cleared", async () => {
  const h = harness(() => productsResponse([product(1)]));
  await h.mount();
  h.searchFailure = true;
  await h.search("boots");
  assert.equal(h.items().length, 0);
  await h.search("");
  assert.deepEqual(h.items(), ["Product 1"]);
  assert.equal(h.renderer.root.findAllByType("Grid.EmptyView").length, 0);
});

test("an empty catalog remains complete after a local-filter rerender and does not fetch another page", async () => {
  const h = harness(() => productsResponse([]));
  await h.mount();
  assert.equal(h.items().length, 0);
  assert.equal(h.grid().props.isLoading, false);
  assert.equal(h.grid().props.pagination.hasMore, false);
  await h.search("x");
  assert.equal(h.grid().props.pagination.hasMore, false);
  await h.loadMore();
  assert.equal(h.productRequests().length, 1);
});

test("a failed first page shows an error and cannot request later pages", async () => {
  const h = harness(() => new Response("Unavailable", { status: 503 }));
  await h.mount();
  assert.equal(h.grid().props.isLoading, false);
  assert.deepEqual(h.items(), []);
  assert.equal(h.grid().props.pagination.hasMore, false);
  assert.match(h.renderer.root.findByType("Grid.EmptyView").props.description, /503/);
  await h.loadMore();
  assert.equal(h.productRequests().length, 1);
});

test("a metadata error does not start hidden browse-page requests", async () => {
  const h = harness(() => productsResponse([product(1)]));
  h.metaFailure = true;
  await h.mount();
  assert.deepEqual(h.items(), []);
  assert.equal(h.grid().props.isLoading, false);
  assert.match(h.renderer.root.findByType("Grid.EmptyView").props.description, /503/);
  assert.equal(h.grid().props.pagination, undefined);
  assert.equal(h.productRequests().length, 0);
});
