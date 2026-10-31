import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { buildURL, ContractError, parseApps, parsePCs, parseStatus, parseStop } from "../src/lib/contract.ts";

const fixture = JSON.parse(readFileSync(new URL("./fixtures/glimmer/contract-v1.json", import.meta.url), "utf8"));
const json = JSON.stringify;
const withoutVersion = ({ version, ...fields }) => {
  assert.equal(version, 1);
  return fields;
};
const documents = [
  ["pcs", parsePCs, fixture.pcs.pcs],
  ["pcsEmpty", parsePCs, []],
  ["apps", parseApps, fixture.apps.apps],
  ["appsEmpty", parseApps, []],
  ["stopStopped", (text) => parseStop(text, 0), withoutVersion(fixture.stopStopped)],
  ["stopIdle", (text) => parseStop(text, 5), withoutVersion(fixture.stopIdle)],
  ...["statusIdle", "statusLive", "statusUnknown", "statusReconnecting"].map((name) => [
    name,
    parseStatus,
    withoutVersion(fixture[name]),
  ]),
];

function withExtraFields(value) {
  if (Array.isArray(value)) return value.map(withExtraFields);
  if (value !== null && typeof value === "object") {
    return {
      ...Object.fromEntries(Object.entries(value).map(([key, value]) => [key, withExtraFields(value)])),
      future: {},
    };
  }
  return value;
}

for (const [name, parse, expected] of documents) {
  test(`reads every consumed field in Glimmer's ${name} output`, () => {
    assert.deepEqual(parse(json(fixture[name])), expected);
    assert.deepEqual(parse(json(withExtraFields(fixture[name]))), expected);
  });

  test(`${name} rejects missing, mistyped and unsupported schema versions loudly`, () => {
    for (const version of [undefined, null, 0, 2, -1, "1", true, {}]) {
      assert.throws(() => parse(json({ ...fixture[name], version })), {
        name: "ContractError",
        message: /schema version; expected version 1/,
      });
    }
  });
}

const records = [
  ["stop result", withoutVersion(fixture.stopStopped), (row) => parseStop(json({ version: 1, ...row }), 0), []],
  ["idle stop result", withoutVersion(fixture.stopIdle), (row) => parseStop(json({ version: 1, ...row }), 5), []],
  ["PC", fixture.pcs.pcs[4], (row) => parsePCs(json({ version: 1, pcs: [row] }))[0], ["address", "runningApp"]],
  ["app", fixture.apps.apps[0], (row) => parseApps(json({ version: 1, apps: [row] }))[0], []],
  [
    "status",
    withoutVersion(fixture.statusLive),
    (row) => parseStatus(json({ version: 1, ...row })),
    ["pc", "app", "resolution", "fps", "hdr", "codec", "bitrateMbps"],
  ],
  ["status PC", fixture.statusLive.pc, (row) => parseStatus(json({ ...fixture.statusLive, pc: row })).pc, []],
  [
    "resolution",
    fixture.statusLive.resolution,
    (row) => parseStatus(json({ ...fixture.statusLive, resolution: row })).resolution,
    [],
  ],
  [
    "running app",
    fixture.pcs.pcs[4].runningApp,
    (row) => parsePCs(json({ version: 1, pcs: [{ ...fixture.pcs.pcs[4], runningApp: row }] }))[0].runningApp,
    ["id", "name"],
  ],
  [
    "status app",
    fixture.statusLive.app,
    (row) => parseStatus(json({ ...fixture.statusLive, app: row })).app,
    ["id", "name"],
  ],
];

for (const [name, record, parse, nullable] of records) {
  test(`${name} tolerates absent nullable fields but validates every present field`, () => {
    for (const key of Object.keys(record)) {
      for (const missing of [undefined, null]) {
        const changed = { ...record, [key]: missing };
        if (nullable.includes(key)) {
          assert.deepEqual(parse(changed), { ...record, [key]: null }, key);
        } else {
          assert.throws(() => parse(changed), ContractError, key);
        }
      }
      assert.throws(() => parse({ ...record, [key]: [] }), ContractError, key);
    }
  });
}

test("collections are required even when empty", () => {
  for (const parse of [parsePCs, parseApps]) assert.throws(() => parse('{"version":1}'), ContractError);
});

test("builds exactly the links accepted and decoded by Glimmer's Swift parser", () => {
  for (const { action, pc, app, url } of fixture.urls) assert.equal(buildURL(action, pc, app), url);
});

test("rejects unsupported actions and parameters at runtime", () => {
  for (const action of ["pair", "status", "list", "help", "unknown", "STREAM", "", null, undefined]) {
    assert.throws(() => buildURL(action, "Den PC"), /action isn’t supported/);
  }
  for (const action of ["stop", "wake", "quit"]) {
    assert.throws(() => buildURL(action, "Den PC", "Hades II"), /action isn’t supported/);
  }
  for (const url of fixture.rejectedURLs) {
    const parsed = new URL(url);
    const pc = parsed.searchParams.get("pc");
    const app = parsed.searchParams.get("app") ?? undefined;
    if (parsed.searchParams.has("force") || parsed.searchParams.getAll("pc").length > 1) continue;
    assert.throws(() => buildURL(parsed.hostname, pc, app), Error, url);
  }
});

test("JSON preserves an escaped app name even when Glimmer refuses that name in URLs", () => {
  const app = parseApps(json(fixture.apps))[0];
  assert.equal(app.name, 'Game, "two"\n雪');
  assert.throws(() => buildURL("stream", "pc-id", app.name), /valid PC or app name/);
});
