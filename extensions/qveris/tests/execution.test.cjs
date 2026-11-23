const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const path = require("node:path");
const { test, mock } = require("node:test");
const { compileFunction } = require("node:vm");
const ts = require("typescript");

// Raycast supplies its own native modules at runtime. Load the real entry points
// with explicit substitutes for the host and network so no test can run a capability.
function loadSource(file, imports = {}) {
  const filename = path.join(__dirname, "../src", file);
  const { outputText } = ts.transpileModule(readFileSync(filename, "utf8"), {
    fileName: filename,
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  });
  const exports = {};
  compileFunction(outputText, ["require", "exports"], { filename })((name) => {
    if (Object.hasOwn(imports, name)) return imports[name];
    if (["node:crypto", "react/jsx-runtime"].includes(name)) return require(name);
    throw new Error(`Unexpected test import: ${name}`);
  }, exports);
  return exports;
}

const json = loadSource("lib/json.ts");
const format = loadSource("lib/format.ts", { "./json": json });
const valid = { schema: { valid: true }, quote: { estimate_credits: 1 } };
const values = { parameters: "{}" };
const input = { toolId: "example.weather", searchId: "example-search", parametersJson: "{}" };

function fixture(probe = async () => valid, confirm = async () => true) {
  const api = {
    probeCapability: mock.fn(probe),
    callCapability: mock.fn(async () => ({ success: true, execution_id: "example" })),
  };
  const imports = { "../lib/api": api, "../lib/format": format, "../lib/json": json };
  const ai = loadSource("tools/call-capability.ts", imports);
  const host = {
    Action: { SubmitForm: "SubmitForm" },
    ActionPanel: "ActionPanel",
    Icon: {},
    Form: {},
    Toast: { Style: {} },
    Alert: { ActionStyle: {} },
    useNavigation: () => ({ push() {} }),
    confirmAlert: mock.fn(confirm),
    showToast: mock.fn(),
  };
  const { ExecuteCapabilityForm } = loadSource("components/execute-capability-form.tsx", {
    ...imports,
    "@raycast/api": host,
    react: { useRef: (current) => ({ current }), useState: (value) => [value, () => {}] },
    "./execution-result": { ExecutionResult: "ExecutionResult" },
  });
  const form = ExecuteCapabilityForm({ tool: { tool_id: input.toolId }, searchId: input.searchId });
  return { api, ai, host, submit: form.props.actions.props.children.props.onSubmit };
}

test("simultaneous submissions start one confirmation and one call", async () => {
  const pending = Promise.withResolvers();
  const { api, host, submit } = fixture(() => pending.promise);
  const first = submit(values);
  const second = submit(values);
  assert.equal(api.probeCapability.mock.callCount(), 1);
  pending.resolve(valid);
  await Promise.all([first, second]);
  assert.equal(api.probeCapability.mock.callCount(), 2);
  assert.equal(host.confirmAlert.mock.callCount(), 1);
  assert.equal(api.callCapability.mock.callCount(), 1);
});

test("a new submit succeeds after cancellation, a rejected probe, or invalid JSON", async () => {
  const { api, host, submit } = fixture();
  host.confirmAlert.mock.mockImplementationOnce(() => false);
  await submit(values);
  api.probeCapability.mock.mockImplementationOnce(() => {
    throw new Error("offline");
  });
  await submit(values);
  await submit({ parameters: "[" });
  assert.equal(api.callCapability.mock.callCount(), 0);
  await submit(values);
  assert.equal(api.callCapability.mock.callCount(), 1);
});

test("declining a changed estimate releases the form", async () => {
  const { api, host, submit } = fixture();
  api.probeCapability.mock.mockImplementationOnce(() => ({ ...valid, quote: { estimate_credits: 2 } }), 1);
  host.confirmAlert.mock.mockImplementationOnce(() => false, 1);
  await submit(values);
  assert.equal(host.confirmAlert.mock.callCount(), 2);
  assert.equal(api.callCapability.mock.callCount(), 0);
  await submit(values);
  assert.equal(api.callCapability.mock.callCount(), 1);
});

test("only explicit success passes validation", () => {
  for (const probe of [null, undefined, {}, { schema: null }, { schema: {} }, { schema: { valid: "true" } }]) {
    assert.match(format.probeError(probe), /did not return a completed parameter check/);
  }
  assert.ok(format.probeError({ schema: { valid: false, note: "" } }));
  assert.equal(
    format.probeError({ schema: { valid: false, violations: [{ param: "city", message: "required" }] } }),
    "city: required",
  );
  assert.equal(format.probeError(valid), undefined);
});

for (const stage of ["initial", "final"]) {
  test(`empty Probe blocks the form and AI Call at the ${stage} check`, async () => {
    const { api, host, submit, ai } = fixture();
    const index = stage === "initial" ? 0 : 1;
    api.probeCapability.mock.mockImplementationOnce(() => ({}), index);
    await submit(values);
    assert.match(host.showToast.mock.calls.at(-1).arguments[0].message, /No call was made/);
    api.probeCapability.mock.mockImplementationOnce(() => ({}), api.probeCapability.mock.callCount() + index);
    if (stage === "initial") {
      await assert.rejects(ai.confirmation(input), /No call was made/);
    } else {
      await ai.confirmation(input);
      await assert.rejects(ai.default(input), /No call was made/);
    }
    assert.equal(api.callCapability.mock.callCount(), 0);
  });
}

test("only an execute timeout warns of an unknown outcome, even when reading the body", async (t) => {
  const api = loadSource("lib/api.ts", { "@raycast/api": { getPreferenceValues: () => ({ apiRegion: "global" }) } });
  const timeout = () => {
    throw new DOMException("timed out", "TimeoutError");
  };
  const fetch = t.mock.method(globalThis, "fetch", timeout);
  await assert.rejects(api.callCapability(input), /outcome is unknown.*Check your QVeris usage/);
  await assert.rejects(api.probeCapability(input), /did not respond before the request timed out/);
  fetch.mock.mockImplementation(() => ({ text: timeout }));
  await assert.rejects(api.callCapability(input), /outcome is unknown/);
});
