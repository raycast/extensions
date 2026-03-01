import assert from "node:assert/strict";
import { resolve } from "node:path";
import test from "node:test";
import type { ExtensionPreferences } from "../src/lib/preferences";
import type { AgentWalletRun } from "../src/lib/runner";
import { CliExecutionError, executeCli, runZbdwWithPreferences } from "../src/lib/runner";

const nodeBinary = process.execPath;
const fixturesDir = resolve(process.cwd(), "test/fixtures");

test("cli runner parses json stdout", async () => {
  const result = await executeCli({
    cliPath: nodeBinary,
    args: [resolve(fixturesDir, "emit-json.mjs")],
    timeoutMs: 5_000,
  });

  assert.deepEqual(result, { balance_sats: 123 });
});

test("cli runner maps error envelope on non-zero exit", async () => {
  await assert.rejects(
    () =>
      executeCli({
        cliPath: nodeBinary,
        args: [resolve(fixturesDir, "emit-error-envelope.mjs")],
        timeoutMs: 5_000,
      }),
    (error: unknown) => {
      assert.equal(error instanceof CliExecutionError, true);
      const typed = error as CliExecutionError;
      assert.equal(typed.code, "invalid_api_key");
      assert.equal(typed.message, "API key rejected by ZBD API");
      assert.equal(typed.exitCode, 1);
      return true;
    },
  );
});

test("cli runner rejects invalid json", async () => {
  await assert.rejects(
    () =>
      executeCli({
        cliPath: nodeBinary,
        args: [resolve(fixturesDir, "emit-invalid-json.mjs")],
        timeoutMs: 5_000,
      }),
    (error: unknown) => {
      assert.equal(error instanceof CliExecutionError, true);
      const typed = error as CliExecutionError;
      assert.equal(typed.code, "invalid_json");
      return true;
    },
  );
});

test("runZbdw falls back to bundled cli when zbdw is missing", async () => {
  const calls: Array<{ cliPath: string; args: string[] }> = [];
  const prefs: ExtensionPreferences = {
    apiKey: "test-key",
  };
  let bundledRunnerCalled = false;
  const bundledRun: AgentWalletRun = async () => 0;

  const result = await runZbdwWithPreferences(
    ["balance"],
    prefs,
    5_000,
    async (options) => {
      calls.push({
        cliPath: options.cliPath,
        args: options.args,
      });

      if (options.cliPath === "zbdw") {
        throw new CliExecutionError("spawn_failed", "spawn zbdw ENOENT", 1);
      }

      return {
        balance_sats: 321,
      };
    },
    async () => bundledRun,
    async () => {
      bundledRunnerCalled = true;
      return {
        balance_sats: 321,
      };
    },
  );

  assert.deepEqual(result, { balance_sats: 321 });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].cliPath, "zbdw");
  assert.equal(bundledRunnerCalled, true);
});

test("runZbdw does not fallback when cliPath is explicitly configured", async () => {
  const calls: Array<{ cliPath: string; args: string[] }> = [];
  const prefs: ExtensionPreferences = {
    apiKey: "test-key",
    cliPath: "/custom/bin/zbdw",
  };

  await assert.rejects(
    () =>
      runZbdwWithPreferences(
        ["info"],
        prefs,
        5_000,
        async (options) => {
          calls.push({ cliPath: options.cliPath, args: options.args });
          throw new CliExecutionError("spawn_failed", "spawn /custom/bin/zbdw ENOENT", 1);
        },
        async () => {
          assert.fail("bundled resolver should not run when cliPath is configured");
          return null;
        },
      ),
    (error: unknown) => {
      assert.equal(error instanceof CliExecutionError, true);
      const typed = error as CliExecutionError;
      assert.equal(typed.code, "spawn_failed");
      return true;
    },
  );

  assert.equal(calls.length, 1);
  assert.equal(calls[0].cliPath, "/custom/bin/zbdw");
});

test("runZbdw returns spawn details when bundled cli is unavailable", async () => {
  const calls: Array<{ cliPath: string; args: string[] }> = [];
  const prefs: ExtensionPreferences = {
    apiKey: "test-key",
  };

  await assert.rejects(
    () =>
      runZbdwWithPreferences(
        ["info"],
        prefs,
        5_000,
        async (options) => {
          calls.push({
            cliPath: options.cliPath,
            args: options.args,
          });

          throw new CliExecutionError("spawn_failed", "spawn zbdw ENOENT", 1);
        },
        async () => null,
      ),
    (error: unknown) => {
      assert.equal(error instanceof CliExecutionError, true);
      const typed = error as CliExecutionError;
      assert.equal(typed.code, "spawn_failed");
      assert.equal(typed.message, "spawn zbdw ENOENT");
      const attempts = typed.details?.attempts as Array<{ cliPath: string }>; 
      assert.equal(attempts.length, 1);
      assert.equal(attempts[0].cliPath, "zbdw");
      return true;
    },
  );
  assert.equal(calls.length, 1);
});
