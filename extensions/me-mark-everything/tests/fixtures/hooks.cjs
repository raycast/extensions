const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");
const { isDeepStrictEqual } = require("node:util");

// Run the installed SDK's usePromise source from its distribution sourcemap.
// Only React scheduling and Raycast native UI are simulated; request races and
// cancellation use the real SDK implementation, not a copy of our hooks.
function fixture() {
  const slots = [];
  let cursor = 0,
    effects = [],
    renderFn,
    view;
  const same = (a, b) => a && b && a.length === b.length && a.every((v, i) => Object.is(v, b[i]));
  const react = {
    useState(initial) {
      const i = cursor++;
      if (!(i in slots)) {
        const slot = { value: typeof initial === "function" ? initial() : initial };
        slot.set = (next) => {
          slot.value = typeof next === "function" ? next(slot.value) : next;
        };
        slots[i] = slot;
      }
      return [slots[i].value, slots[i].set];
    },
    useRef(initial) {
      const i = cursor++;
      return (slots[i] ??= { current: initial });
    },
    useMemo(fn, deps) {
      const i = cursor++;
      if (!slots[i] || !same(slots[i].deps, deps)) slots[i] = { deps, value: fn() };
      return slots[i].value;
    },
    useCallback(fn, deps) {
      return react.useMemo(() => fn, deps);
    },
    useEffect(fn, deps) {
      const i = cursor++;
      if (!slots[i] || !same(slots[i].deps, deps)) {
        const old = slots[i];
        slots[i] = { deps };
        effects.push(() => {
          old?.cleanup?.();
          slots[i].cleanup = fn();
        });
      }
    },
  };
  const toast = [];
  function compile(source, mocks) {
    const code = ts.transpileModule(source, {
      compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
    }).outputText;
    const module = { exports: {} };
    vm.runInNewContext(code, {
      module,
      exports: module.exports,
      require: (name) => {
        if (!(name in mocks)) throw Error("Unmocked import: " + name);
        return mocks[name];
      },
      AbortController,
      Error,
      console,
      structuredClone,
      Promise,
    });
    return module.exports;
  }
  const map = JSON.parse(
    fs.readFileSync(path.join(path.dirname(require.resolve("@raycast/utils")), "main.js.map"), "utf8"),
  );
  const source = (name) => map.sourcesContent[map.sources.findIndex((p) => p.endsWith("/" + name + ".ts"))];
  const sdkMocks = {
    react,
    "@raycast/api": { environment: {}, LaunchType: { Background: "background" } },
    "./showFailureToast": { showFailureToast: async (...v) => toast.push(v) },
  };
  sdkMocks["./useLatest"] = compile(source("useLatest"), sdkMocks);
  sdkMocks["./useDeepMemo"] = compile(source("useDeepMemo"), { react, "dequal/lite": { dequal: isDeepStrictEqual } });
  const utils = compile(source("usePromise"), sdkMocks);
  return {
    react,
    utils,
    toast,
    load(file, mocks = {}) {
      return compile(fs.readFileSync(file, "utf8"), { react, "@raycast/utils": utils, ...mocks });
    },
    render(fn = renderFn) {
      renderFn = fn;
      cursor = 0;
      view = fn();
      const pending = effects;
      effects = [];
      pending.forEach((fn) => fn());
      return view;
    },
    async flush() {
      for (let i = 0; i < 12; i++) {
        await new Promise((resolve) => setImmediate(resolve));
        this.render();
      }
      return view;
    },
    unmount() {
      slots.forEach((slot) => slot?.cleanup?.());
    },
  };
}
module.exports = { fixture };
