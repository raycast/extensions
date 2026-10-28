require("./register.cjs");
const assert = require("node:assert/strict");
const { test } = require("node:test");
const { emptyStore, emptyPermissions, ExtensionSchema, StoreSchema } = require("../src/lib/model.ts");
const { reconcile } = require("../src/lib/monitoring/reconcile.ts");

const id = "a".repeat(32);
const profileKey = "chrome:Default";
const key = `${profileKey}:${id}`;
const initialCode = {
  complete: true,
  files: 1,
  bytes: 10,
  hash: "original",
  fileHashes: { "script.js": "original" },
  hosts: [],
  signals: [],
  limits: [],
  skipped: [],
};
const changedCode = {
  ...initialCode,
  hash: "changed",
  fileHashes: { "script.js": "changed" },
  hosts: ["remote.test"],
  signals: [{ id: "remote-code", count: 1, files: ["script.js"] }],
};
function extension(code, at, overrides) {
  return ExtensionSchema.parse({
    key,
    browser: "chrome",
    profile: "Default",
    profileName: "Default",
    id,
    name: "Example",
    description: "",
    version: "1.0",
    manifestVersion: 3,
    enabled: "Enabled",
    disableReasons: [],
    blocklisted: false,
    location: 1,
    provenance: "Web Store",
    fromWebstore: true,
    updateUrl: "",
    rawHash: "manifest",
    normalizedHash: "manifest",
    contentScriptsHash: "scripts",
    externalMatches: [],
    contentScriptRestrictions: false,
    access: {
      requested: emptyPermissions(),
      optional: emptyPermissions(),
      granted: null,
      active: null,
      runtime: null,
      effective: emptyPermissions(),
      withholding: null,
      withheld: [],
      conditional: [],
      unknown: [],
      complete: true,
    },
    findings: [],
    observedAt: at,
    sources: [],
    diagnostics: [],
    code,
    ...overrides,
  });
}
function scan(state, code, day, overrides = {}) {
  const at = new Date(Date.UTC(2026, 0, day)).toISOString();
  const extensions = code === null ? [] : [extension(code, at, overrides)];
  // Every step exercises persistence and validation, as the repository does between scans.
  return StoreSchema.parse(
    JSON.parse(
      JSON.stringify(
        reconcile(state, {
          at,
          profiles: [
            {
              key: profileKey,
              browser: "chrome",
              id: "Default",
              name: "Default",
              observedAt: at,
              extensions,
              inventoryIds: extensions.map((e) => e.id),
              complete: true,
              diagnostics: [],
            },
          ],
          diagnostics: [],
          discoveryComplete: true,
        }),
      ),
    ),
  );
}
const codeEvents = (state) => state.events.filter((e) => ["CHG-019", "CHG-020", "CHG-021"].includes(e.type));

for (const [name, failed] of [
  ["missing", undefined],
  ["partial", { ...changedCode, complete: false, limits: ["Size limit reached"] }],
]) {
  test(`code changes survive repeated ${name} analyses and are reported once`, () => {
    let state = scan(emptyStore(), initialCode, 1);
    state = scan(state, failed, 2);
    state = scan(state, failed, 3);
    assert.equal(codeEvents(state).length, 0);
    assert.equal(state.latest[profileKey].extensions[0].code?.complete, failed?.complete);
    state = scan(state, changedCode, 4);
    assert.deepEqual(
      codeEvents(state).map((e) => e.type),
      ["CHG-019", "CHG-020", "CHG-021"],
    );
    assert.ok(codeEvents(state)[0].after.includes("Changed: script.js"));
    assert.equal(codeEvents(scan(state, changedCode, 5)).length, 3);
  });
}

test("first successful analysis establishes a baseline without code-change alerts", () => {
  let state = scan(emptyStore(), undefined, 1);
  state = scan(state, { ...initialCode, complete: false }, 2);
  state = scan(state, changedCode, 3);
  assert.deepEqual(codeEvents(state), []);
});

test("unchanged code after a failed analysis does not alert", () => {
  let state = scan(emptyStore(), initialCode, 1);
  state = scan(state, undefined, 2);
  assert.deepEqual(codeEvents(scan(state, initialCode, 3)), []);
});

test("code hash comparison uses the version of the last successful analysis", () => {
  let state = scan(emptyStore(), initialCode, 1);
  state = scan(state, undefined, 2, { version: "2.0" });
  state = scan(state, changedCode, 3, { version: "2.0" });
  assert.deepEqual(
    codeEvents(state).map((e) => e.type),
    ["CHG-020", "CHG-021"],
  );
});

test("the most recent successful analysis survives history expiry", () => {
  let state = scan(emptyStore(), undefined, 1);
  state = scan(state, initialCode, 2);
  state = scan(state, changedCode, 3);
  state = scan(state, undefined, 4);
  state = scan(state, undefined, 100);
  assert.equal(state.snapshots.length, 0);
  state = scan(state, { ...changedCode, hash: "changed-again" }, 101);
  const events = codeEvents(state);
  assert.equal(events.length, 4);
  assert.deepEqual(events.at(-1).before, ["Code hash: changed"]);
});

test("legacy stores recover code independently of the latest complete access snapshot", () => {
  let state = scan(emptyStore(), undefined, 1);
  const access = { ...extension(undefined, "unused").access, complete: false };
  state = scan(state, initialCode, 2, { access });
  state = scan(state, undefined, 3);
  state = scan(state, undefined, 4);
  delete state.codeReferences;
  state = scan(state, changedCode, 5);
  assert.deepEqual(
    codeEvents(state).map((e) => e.type),
    ["CHG-019", "CHG-020", "CHG-021"],
  );
});

test("removal clears code references and reinstalling starts a new code baseline", () => {
  let state = scan(emptyStore(), initialCode, 1);
  state = scan(state, null, 2);
  assert.equal(state.codeReferences[key], undefined);
  state = scan(state, undefined, 3);
  state = scan(state, undefined, 100);
  state = scan(state, changedCode, 101);
  assert.deepEqual(codeEvents(state), []);
});
