import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { runInNewContext } from "node:vm";
import ts from "typescript";

const services = ["giphy", "giphy-clips", "klipy", "finergifs"];
const filename = fileURLToPath(new URL("../src/hooks/useLocalGifs.ts", import.meta.url));
const { outputText } = ts.transpileModule(readFileSync(filename, "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2023 },
});

// Run the hook's actual query callbacks without the Raycast runtime. Rejecting the aggregate
// query matters: useCachedPromise commits resolved results, including empty ones, to its cache.
function createQuery({ view, saved = {}, failing = [], responses = {} }) {
  const hooks = [];
  const providerCalls = [];
  const storageCalls = [];
  const toasts = [];
  const failures = new Map(failing.map((service) => [service, new Error(`${service} unavailable`)]));
  const modules = {
    "@raycast/utils": {
      useCachedPromise(query, args, options) {
        hooks.push({ query, args, options });
        return { data: undefined, isLoading: false, mutate: async () => {} };
      },
    },
    "../lib/localGifs": {
      async getAll(type) {
        storageCalls.push(type);
        return services.map((service) => [service, saved[service] ?? []]);
      },
    },
    "@raycast/api": {
      showToast: async (toast) => toasts.push(toast),
      Toast: { Style: { Failure: "failure" } },
    },
    "../preferences": {
      GRID_COLUMNS: { medium: 5 },
      getServiceTitle: (service) => service,
    },
    "./useSearchAPI": {
      async getAPIByServiceName(service) {
        providerCalls.push(service);
        return {
          async gifs(ids) {
            // All real providers short-circuit gifs([]), even during an outage.
            if (ids.length === 0) return [];
            if (failures.has(service)) throw failures.get(service);
            return responses[service] ?? ids.map((id) => ({ id }));
          },
        };
      },
    },
    "../lib/dedupe": { default: (gifs) => gifs },
  };
  const context = {
    Error,
    exports: {},
    require(name) {
      assert.ok(Object.hasOwn(modules, name), `Unexpected import: ${name}`);
      return modules[name];
    },
    console: { error() {} },
  };
  runInNewContext(outputText, context, { filename });
  context.exports.default(view);
  assert.equal(hooks[1].options.execute, true);

  return {
    run: () => hooks[1].query(...hooks[1].args),
    providerCalls,
    storageCalls,
    toasts,
    failures,
  };
}

for (const view of ["favorites", "recents"]) {
  test(`${view}: only populated provider fails despite three empty providers`, async () => {
    const query = createQuery({ view, saved: { giphy: ["saved"] }, failing: ["giphy"] });
    await assert.rejects(query.run(), (error) => error === query.failures.get("giphy"));
    assert.deepEqual(query.providerCalls, ["giphy"]);
    assert.deepEqual(query.storageCalls, [view === "favorites" ? "favs" : "recent"]);
  });

  test(`${view}: all populated providers fail despite empty providers`, async () => {
    const query = createQuery({
      view,
      saved: { giphy: ["a"], klipy: ["b"] },
      failing: ["giphy", "klipy"],
    });
    await assert.rejects(query.run(), (error) => error === query.failures.get("giphy"));
  });

  test(`${view}: genuinely empty saved state succeeds without provider calls`, async () => {
    const query = createQuery({ view, failing: services });
    assert.equal((await query.run()).length, 0);
    assert.deepEqual(query.providerCalls, []);
    assert.deepEqual(query.toasts, []);
  });

  test(`${view}: a successful populated provider still appears during a partial outage`, async () => {
    const query = createQuery({ view, saved: { giphy: ["a"], klipy: ["b"] }, failing: ["giphy"] });
    const result = JSON.parse(JSON.stringify(await query.run())).filter(([, gifs]) => gifs.length > 0);
    assert.deepEqual(result, [["klipy", [{ id: "b" }]]]);
    assert.equal(query.toasts.length, 1);
    assert.match(query.toasts[0].title, /giphy/);
  });

  test(`${view}: successful lookups may legitimately return no matching GIFs`, async () => {
    const query = createQuery({ view, saved: { giphy: ["deleted-id"] }, responses: { giphy: [] } });
    const result = JSON.parse(JSON.stringify(await query.run()));
    assert.deepEqual(
      result.find(([service]) => service === "giphy"),
      ["giphy", []],
    );
    assert.deepEqual(query.toasts, []);
  });

  test(`${view}: healthy providers return all saved GIFs`, async () => {
    const query = createQuery({ view, saved: { giphy: ["a"], klipy: ["b"] } });
    const result = JSON.parse(JSON.stringify(await query.run())).filter(([, gifs]) => gifs.length > 0);
    assert.deepEqual(result, [
      ["giphy", [{ id: "a" }]],
      ["klipy", [{ id: "b" }]],
    ]);
    assert.deepEqual(query.toasts, []);
  });
}
