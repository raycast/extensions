import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { test } from "node:test";
import {
  buildRunEnv,
  buildScheduleSecrets,
  parseRequiredPositiveInt,
  prepareRun,
  runViaRunner,
} from "../src/run-utils";

test("Gmail receives the same app password as IMAP for manual and scheduled runs", () => {
  const prefs = {
    scholarEnabled: true,
    scholarProvider: "gmail",
    scholarImapPasswordEnv: "PAPER_AGENT_TEST_PASSWORD",
    scholarImapPassword: "ab cd ef",
  } as Preferences.RunPipeline;
  assert.equal(buildRunEnv(prefs).PAPER_AGENT_TEST_PASSWORD, "abcdef");
  assert.equal(buildScheduleSecrets(prefs).PAPER_AGENT_TEST_PASSWORD, "abcdef");
});

test("Gmail setup rejects missing login fields before starting the pipeline", (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "paper-agent-run-"));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const configPath = path.join(dir, "config.yaml");
  fs.writeFileSync(configPath, "delivery: {}\n");
  const prefs = {
    configPath,
    paperDir: dir,
    maxPapersPerDay: "12",
    lookbackDays: "5",
    summarizeEnabled: false,
    scholarEnabled: true,
    scholarProvider: "gmail",
  } as Preferences.RunPipeline;
  assert.throws(() => prepareRun(prefs), /IMAP host/);
});

test("numeric preferences reject fractions, trailing text, and unsafe integers", () => {
  for (const value of ["1.5", "12papers", "1e3", "9007199254740993", "-1", "0"]) {
    assert.equal(parseRequiredPositiveInt(value, "Count").ok, false, value);
  }
  assert.deepEqual(parseRequiredPositiveInt(" 12 ", "Count"), { ok: true, value: 12 });
});

test("a missing runner does not report a detached run as successfully started", async (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "paper-agent-no-runner-"));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const result = await runViaRunner({
    agentRoot: dir,
    pythonBin: process.execPath,
    configPath: path.join(dir, "config.yaml"),
    env: {},
    mode: "manual",
    detach: true,
  });
  assert.equal(result.success, false);
  assert.match(result.stderr ?? "", /runner script is missing/);
});
