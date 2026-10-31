import assert from "node:assert/strict";
import { test } from "node:test";
import {
  buildURL,
  ContractError,
  exitCodeMessage,
  parseApps,
  parsePCs,
  parseStatus,
  parseStop,
  pcState,
  streamDetails,
} from "../src/lib/contract.ts";

const pc = {
  id: "pc-uuid",
  name: "Living Room",
  address: null,
  paired: true,
  state: "reachable",
  runningApp: { id: 7, name: "Steam" },
  default: true,
};
const app = { id: 7, name: "Steam", hdr: true, hidden: false, running: true };
const idle = {
  version: 1,
  live: false,
  pc: null,
  app: null,
  resolution: null,
  fps: null,
  hdr: null,
  codec: null,
  bitrateMbps: null,
};
const json = JSON.stringify;

test("reads paired PCs, nullable running app details, and additional version 1 keys", () => {
  assert.deepEqual(parsePCs(json({ version: 1, pcs: [{ ...pc, extra: true }], future: [] })), [pc]);
  for (const runningApp of [null, { id: null, name: "Steam" }, { id: 7, name: null }]) {
    assert.deepEqual(parsePCs(json({ version: 1, pcs: [{ ...pc, runningApp }] }))[0].runningApp, runningApp);
  }
  assert.deepEqual(parsePCs(json({ version: 1, pcs: [] })), []);
});

test("reads all apps, including hidden and running apps", () => {
  const desktop = { ...app, id: 9, name: "Desktop", running: false, hidden: true };
  assert.deepEqual(parseApps(json({ version: 1, apps: [app, desktop] })), [app, desktop]);
  assert.deepEqual(parseApps(json({ version: 1, apps: [] })), []);
});

test("rejects invalid JSON, missing versions, and unsupported versions", () => {
  for (const parse of [parsePCs, parseApps, parseStatus, (text) => parseStop(text, 0)]) {
    for (const text of ["", "[]", "null", "{", "{}", '{"version":2}', '{"version":"1"}']) {
      assert.throws(() => parse(text), ContractError);
    }
  }
});

test("rejects malformed records instead of silently treating them as empty or idle", () => {
  for (const changes of [
    { paired: "true" },
    { state: "other" },
    { id: "" },
    { runningApp: { id: "seven" } },
    { name: "\ud800" },
  ]) {
    assert.throws(() => parsePCs(json({ version: 1, pcs: [{ ...pc, ...changes }] })), ContractError);
  }
  for (const changes of [{ id: 1.5 }, { id: -1 }, { running: "true" }, { name: null }]) {
    assert.throws(() => parseApps(json({ version: 1, apps: [{ ...app, ...changes }] })), ContractError);
  }
  assert.throws(() => parsePCs('{"version":1,"pcs":null}'), ContractError);
  assert.throws(() => parseApps('{"version":1,"apps":{}}'), ContractError);
  assert.throws(() => parseStatus(json({ ...idle, live: undefined })), ContractError);
  assert.equal(parseStatus(json({ ...idle, fps: undefined })).fps, null);
});

test("reads idle and live stream details with explicit unknown values", () => {
  const expectedIdle = { ...idle };
  delete expectedIdle.version;
  assert.deepEqual(parseStatus(json(idle)), expectedIdle);
  const live = {
    ...idle,
    live: true,
    pc: { id: pc.id, name: pc.name },
    app: { id: app.id, name: app.name },
    resolution: { width: 2560, height: 1440 },
    fps: 120,
    hdr: true,
    codec: "HEVC",
    bitrateMbps: 82.5,
  };
  assert.equal(streamDetails(parseStatus(json(live))), "2560 × 1440 · 120 fps · HDR · HEVC");
  assert.equal(
    streamDetails(parseStatus(json(idle))),
    "Resolution unknown · Frame rate unknown · HDR unknown · Codec unknown",
  );
  assert.match(streamDetails(parseStatus(json({ ...live, hdr: false }))), /SDR/);
});

test("rejects nonfinite numbers, invalid resolution, and invalid nullable details", () => {
  assert.throws(() => parseStatus(json(idle).replace('"fps":null', '"fps":1e400')), ContractError);
  for (const changes of [
    { fps: -1 },
    { hdr: "yes" },
    { bitrateMbps: -2 },
    { resolution: { width: 0, height: 1440 } },
    { resolution: { width: 2560, height: 1.5 } },
    { pc: { id: "pc-uuid" } },
  ]) {
    assert.throws(() => parseStatus(json({ ...idle, ...changes })), ContractError);
  }
});

test("builds URLs with percent-encoded spaces, literal pluses, Unicode, and query delimiters", () => {
  assert.equal(buildURL("stream", "Living Room", "Steam"), "glimmer://stream?pc=Living%20Room&app=Steam");
  const name = "PC + café & #?/%";
  const title = "Game + DLC & Friends";
  const url = buildURL("stream", name, title);
  assert.ok(url.includes("%2B"));
  assert.ok(!url.includes("+"));
  assert.equal(new URL(url).searchParams.get("pc"), name);
  assert.equal(new URL(url).searchParams.get("app"), title);
});

test("builds resume, wake, and confirmed quit URLs with no extra parameters", () => {
  for (const action of ["stream", "stop", "wake", "quit"]) {
    assert.equal(buildURL(action, pc.id), `glimmer://${action}?pc=pc-uuid`);
  }
  assert.throws(() => buildURL("quit", pc.id, "Steam"));
  assert.throws(() => buildURL("pair", pc.id));
  assert.equal(buildURL("stop"), "glimmer://stop");
  for (const action of ["stream", "wake", "quit"]) assert.throws(() => buildURL(action));
  for (const name of ["", "  ", "a\nb", "a\u007fb", "a\u200bb", "a\u202eb", "\ud800"]) {
    assert.throws(() => buildURL("stream", name));
    assert.throws(() => buildURL("stream", pc.id, name));
    assert.throws(() => buildURL("stop", name));
  }
});

test("maps all documented exit codes and unexpected termination to plain copy", () => {
  assert.equal(exitCodeMessage(0), "Done.");
  assert.match(exitCodeMessage(1), /couldn’t complete/);
  assert.match(exitCodeMessage(2), /Update Glimmer/);
  assert.match(exitCodeMessage(3, "Living Room"), /^Living Room didn’t answer/);
  assert.match(exitCodeMessage(4), /^The PC isn’t paired/);
  assert.match(exitCodeMessage(null), /stopped before completing/);
  assert.equal(exitCodeMessage(99), exitCodeMessage(null));
});

test("presents the four PC states without mistaking an unknown PC for ready", () => {
  assert.equal(pcState(pc), "Streaming");
  assert.equal(pcState({ ...pc, state: "ready", runningApp: null }), "Ready");
  assert.equal(pcState({ ...pc, state: "asleep" }), "Asleep");
  assert.equal(pcState({ ...pc, state: "unknown" }), "Offline");
  assert.equal(pcState({ ...pc, paired: false }), "Offline");
});
