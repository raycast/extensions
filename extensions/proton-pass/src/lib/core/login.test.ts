import assert from "node:assert/strict";
import { resolve } from "node:path";
import test from "node:test";
import { extractLoginUrl, runBrowserLogin } from "./login";
import { PassCliError } from "../types";

const LOGIN_URL = "https://account.proton.me/desktop/login?app=pass#payload=fake%2Fpayload%3Dwith-encoded-data";
const FAKE_LOGIN_URL = "https://account.proton.me/desktop/login?app=pass#payload=FAKE_PAYLOAD_TOKEN";

function fakeCommand(mode: string) {
  return {
    file: process.execPath,
    args: [resolve(process.cwd(), "src/lib/testing/fake-pass-cli.mjs"), mode],
  };
}

test("extractLoginUrl returns the HTTPS Proton account URL from CLI output", () => {
  const output = [
    "",
    "Please open the following URL in your browser to complete authentication:",
    "",
    LOGIN_URL,
    "",
    "Waiting for authentication to complete...",
  ].join("\n");

  assert.equal(extractLoginUrl(output), LOGIN_URL);
});

test("extractLoginUrl returns null when output has no URL", () => {
  assert.equal(extractLoginUrl("Waiting for authentication to complete..."), null);
});

test("extractLoginUrl rejects an HTTP Proton account URL", () => {
  assert.equal(extractLoginUrl("http://account.proton.me/desktop/login#payload=token"), null);
});

test("extractLoginUrl rejects a different HTTPS host", () => {
  assert.equal(extractLoginUrl("https://evil.com/desktop/login#payload=token"), null);
});

test("extractLoginUrl rejects a Proton hostname on a nonstandard port", () => {
  assert.equal(extractLoginUrl("https://account.proton.me:444/desktop/login#payload=token"), null);
});

test("runBrowserLogin opens the Proton login URL once and resolves on success", async () => {
  const opened: string[] = [];

  await runBrowserLogin(fakeCommand("login-ok"), {
    openUrl: async (url) => {
      opened.push(url);
    },
    timeoutMs: 1_000,
  });

  assert.deepEqual(opened, [FAKE_LOGIN_URL]);
});

test("runBrowserLogin waits for a complete URL split across stdout chunks", async () => {
  const opened: string[] = [];

  await runBrowserLogin(fakeCommand("login-split-url"), {
    openUrl: async (url) => {
      opened.push(url);
    },
    timeoutMs: 1_000,
  });

  assert.deepEqual(opened, [FAKE_LOGIN_URL]);
});

for (const mode of ["login-bad-host", "login-garbage"]) {
  test(`runBrowserLogin never opens a URL for ${mode} output`, async () => {
    const opened: string[] = [];

    await runBrowserLogin(fakeCommand(mode), {
      openUrl: async (url) => {
        opened.push(url);
      },
      timeoutMs: 1_000,
    });

    assert.deepEqual(opened, []);
  });
}

test("runBrowserLogin times out and kills a hanging child", async () => {
  await assert.rejects(
    runBrowserLogin(fakeCommand("login-hang"), {
      openUrl: async () => undefined,
      timeoutMs: 300,
    }),
    (error: unknown) => {
      assert.ok(error instanceof PassCliError);
      assert.equal(error.type, "timeout");
      assert.doesNotMatch(error.message, /payload=|FAKE_PAYLOAD_TOKEN/);
      return true;
    },
  );
});

test("runBrowserLogin classifies CLI failure without exposing payload data", async () => {
  await assert.rejects(
    runBrowserLogin(fakeCommand("login-fail"), {
      openUrl: async () => undefined,
      timeoutMs: 1_000,
    }),
    (error: unknown) => {
      assert.ok(error instanceof PassCliError);
      assert.equal(error.type, "not_authenticated");
      assert.doesNotMatch(error.message, /payload=|FAIL_PAYLOAD_TOKEN/);
      return true;
    },
  );
});

test("runBrowserLogin redacts payload data from an unknown CLI failure", async () => {
  await assert.rejects(
    runBrowserLogin(fakeCommand("login-fail-unknown"), {
      openUrl: async () => undefined,
      timeoutMs: 1_000,
    }),
    (error: unknown) => {
      assert.ok(error instanceof PassCliError);
      assert.equal(error.type, "unknown");
      assert.doesNotMatch(error.message, /payload=|UNKNOWN_PAYLOAD_TOKEN/);
      return true;
    },
  );
});
