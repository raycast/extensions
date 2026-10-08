import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";
import {
  BrowserLoginStatus,
  cancelDetachedLogin,
  checkDetachedLogin,
  extractLoginUrl,
  forgetLoginUrl,
  isDetachedLoginRunning,
  isProcessRunning,
  startDetachedLogin,
} from "./login";
import { PassCliError } from "../types";

const LOGIN_URL = "https://account.proton.me/desktop/login?app=pass#payload=fake%2Fpayload%3Dwith-encoded-data";
const FAKE_LOGIN_URL = "https://account.proton.me/desktop/login?app=pass#payload=FAKE_PAYLOAD_TOKEN";

function fakeCommand(mode: string) {
  return {
    file: process.execPath,
    args: [resolve(process.cwd(), "src/lib/testing/fake-pass-cli.mjs"), mode],
  };
}

const loginDir = () => join(mkdtempSync(join(tmpdir(), "pass-login-")), "login");
const loggedOut = async () => false;
const sleep = (ms: number) => new Promise((done) => setTimeout(done, ms));

async function waitUntil(condition: () => boolean): Promise<void> {
  for (let tries = 0; !condition() && tries < 100; tries++) await sleep(20);
}

/** Checks the login until pass-cli has exited. */
async function settle(dir: string, isLoggedIn = loggedOut): Promise<BrowserLoginStatus> {
  for (let tries = 0; tries < 100; tries++) {
    const status = await checkDetachedLogin(dir, isLoggedIn);
    if (status.state !== "waiting") return status;
    await sleep(20);
  }
  throw new Error("The login is still running");
}

const savedPid = (dir: string) => (JSON.parse(readFileSync(join(dir, "login.json"), "utf8")) as { pid: number }).pid;

function assertNoPayload(error: unknown) {
  assert.ok(error instanceof PassCliError);
  assert.doesNotMatch(error.message, /payload|TOKEN|https?:/i);
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

test("isProcessRunning tells running processes from gone ones", () => {
  assert.equal(isProcessRunning(process.pid), true);
  assert.equal(isProcessRunning(999_999), false);
});

test("a login started on its own gives the Proton URL, then succeeds once pass-cli exits", async () => {
  const dir = loginDir();
  assert.equal(await startDetachedLogin(fakeCommand("login-ok"), dir, 2_000), FAKE_LOGIN_URL);

  assert.deepEqual(await settle(dir), { state: "succeeded" });
  // The output held the login URL and its payload.
  assert.equal(existsSync(dir), false);
});

test("a login waits for a complete URL split across writes", async () => {
  const dir = loginDir();
  assert.equal(await startDetachedLogin(fakeCommand("login-split-url"), dir, 2_000), FAKE_LOGIN_URL);
  assert.deepEqual(await settle(dir), { state: "succeeded" });
});

for (const mode of ["login-bad-host", "login-garbage"]) {
  test(`a login fails to start when pass-cli exits without a Proton URL (${mode})`, async () => {
    const dir = loginDir();
    await assert.rejects(startDetachedLogin(fakeCommand(mode), dir, 2_000), PassCliError);
    assert.equal(existsSync(dir), false);
  });
}

test("a login that pass-cli doesn't start in time is stopped", async () => {
  const dir = loginDir();
  await assert.rejects(startDetachedLogin(fakeCommand("login-hang"), dir, 300), (error: unknown) => {
    assert.ok(error instanceof PassCliError);
    assert.equal(error.type, "timeout");
    return true;
  });
  assert.equal(existsSync(dir), false);
});

test("failures say why without exposing the login payload", async () => {
  await assert.rejects(startDetachedLogin(fakeCommand("login-fail"), loginDir(), 2_000), (error: unknown) => {
    assertNoPayload(error);
    assert.equal((error as PassCliError).type, "not_authenticated");
    return true;
  });
  await assert.rejects(startDetachedLogin(fakeCommand("login-fail-unknown"), loginDir(), 2_000), (error: unknown) => {
    assertNoPayload(error);
    assert.equal((error as PassCliError).type, "unknown");
    return true;
  });

  const dir = loginDir();
  assert.equal(await startDetachedLogin(fakeCommand("login-url-fail"), dir, 2_000), FAKE_LOGIN_URL);
  const status = await settle(dir);
  assert.equal(status.state, "failed");
  if (status.state === "failed") {
    assertNoPayload(status.error);
    assert.equal(status.error.type, "not_authenticated");
  }
});

test("a login tells when pass-cli is saving the session after the browser login", async () => {
  const dir = loginDir();
  await startDetachedLogin(fakeCommand("login-finishing"), dir, 2_000);
  const pid = savedPid(dir);
  let status = await checkDetachedLogin(dir, loggedOut);
  for (let tries = 0; status.state === "waiting" && !status.isFinishing && tries < 100; tries++) {
    await sleep(20);
    status = await checkDetachedLogin(dir, loggedOut);
  }
  assert.deepEqual(status, { state: "waiting", url: FAKE_LOGIN_URL, isFinishing: true });
  await cancelDetachedLogin(dir);
  await waitUntil(() => !isProcessRunning(pid));
});

test("a login says when something stopped pass-cli, rather than a vague failure", async () => {
  const dir = loginDir();
  await startDetachedLogin(fakeCommand("login-wait"), dir, 2_000);
  const pid = savedPid(dir);
  process.kill(pid, "SIGKILL");
  await waitUntil(() => !isProcessRunning(pid));
  await sleep(50);

  const status = await checkDetachedLogin(dir, loggedOut);
  assert.equal(status.state, "failed");
  if (status.state === "failed") assert.match(status.error.message, /stopped \(SIGKILL\)/);
});

test("a login counts as running from its start until pass-cli exits", async () => {
  const dir = loginDir();
  assert.equal(await isDetachedLoginRunning(dir), false);
  await startDetachedLogin(fakeCommand("login-wait"), dir, 2_000);
  assert.equal(await isDetachedLoginRunning(dir), true);
  await cancelDetachedLogin(dir);
  assert.equal(await isDetachedLoginRunning(dir), false);
});

test("a running login is waiting for the browser, and canceling it stops pass-cli", async () => {
  const dir = loginDir();
  await startDetachedLogin(fakeCommand("login-wait"), dir, 2_000);
  const pid = savedPid(dir);

  assert.deepEqual(await checkDetachedLogin(dir, loggedOut), {
    state: "waiting",
    url: FAKE_LOGIN_URL,
    isFinishing: false,
  });
  await cancelDetachedLogin(dir);
  await waitUntil(() => !isProcessRunning(pid));
  assert.equal(isProcessRunning(pid), false);
  assert.deepEqual(await checkDetachedLogin(dir, loggedOut), { state: "none" });
});

test("a canceled login exiting late can't replace a newer successful login's result", async () => {
  const dir = loginDir();
  await startDetachedLogin(fakeCommand("login-slow-stop"), dir, 2_000);
  const oldPid = savedPid(dir);
  await startDetachedLogin(fakeCommand("login-ok"), dir, 2_000);
  await waitUntil(() => !isProcessRunning(oldPid));
  await sleep(50);

  assert.deepEqual(await settle(dir), { state: "succeeded" });
});

test("once a login is over, the next pass-cli command removes the login URL, and keeps why the login failed", async () => {
  // No login screen shows once logged in to remove it. A missing exit code, when Raycast closed first, isn't a success.
  for (const { mode, missedExit, isLoggedIn, state } of [
    { mode: "login-ok", missedExit: false, isLoggedIn: true, state: "succeeded" },
    { mode: "login-ok", missedExit: true, isLoggedIn: true, state: "succeeded" },
    { mode: "login-url-fail", missedExit: false, isLoggedIn: false, state: "failed" },
    { mode: "login-url-fail", missedExit: true, isLoggedIn: false, state: "failed" },
  ]) {
    const dir = loginDir();
    await startDetachedLogin(fakeCommand(mode), dir, 2_000);
    const pid = savedPid(dir);
    await waitUntil(() => !isProcessRunning(pid));
    await sleep(50);
    if (missedExit) rmSync(join(dir, `${pid}-exit-code.txt`), { force: true });

    assert.equal(await isDetachedLoginRunning(dir), false);
    for (const file of readdirSync(dir)) {
      assert.doesNotMatch(readFileSync(join(dir, file), "utf8"), /https?:|payload|TOKEN/i);
    }
    // The login screen still gets the result.
    const status = await settle(dir, async () => isLoggedIn);
    assert.equal(status.state, state);
    if (status.state === "failed") assert.equal(status.error.message, "The login didn't complete. Try again.");
    assert.equal(existsSync(dir), false);
  }
});

test("cleanups that overlap keep why the login failed", async () => {
  const dir = loginDir();
  await startDetachedLogin(fakeCommand("login-url-fail"), dir, 2_000);
  const ended = JSON.parse(readFileSync(join(dir, "login.json"), "utf8"));
  await waitUntil(() => !isProcessRunning(ended.pid));
  await sleep(50);

  // The second one reads the output after the first removed it.
  await forgetLoginUrl(dir, ended);
  await forgetLoginUrl(dir, ended);
  const status = await settle(dir);
  assert.equal(status.state, "failed");
  if (status.state === "failed") assert.equal(status.error.message, "The login didn't complete. Try again.");
});

test("a login that succeeded a while ago doesn't show again once its session has ended", async () => {
  const dir = loginDir();
  await startDetachedLogin(fakeCommand("login-ok"), dir, 2_000);
  const pid = savedPid(dir);
  await waitUntil(() => !isProcessRunning(pid));
  await sleep(50);
  // A command ran meanwhile, then the user logged out.
  assert.equal(await isDetachedLoginRunning(dir), false);

  assert.deepEqual(await checkDetachedLogin(dir, loggedOut), { state: "none" });
});

test("cleaning up after a login that's over leaves a login started meanwhile alone", async () => {
  const dir = loginDir();
  await startDetachedLogin(fakeCommand("login-url-fail"), dir, 2_000);
  const ended = JSON.parse(readFileSync(join(dir, "login.json"), "utf8"));
  await waitUntil(() => !isProcessRunning(ended.pid));
  await sleep(50);

  // The cleanup read the ended login, then a new login replaced it before the cleanup changed anything.
  await startDetachedLogin(fakeCommand("login-wait"), dir, 2_000);
  await forgetLoginUrl(dir, ended);
  assert.equal(await isDetachedLoginRunning(dir), true);
  assert.deepEqual(await checkDetachedLogin(dir, loggedOut), {
    state: "waiting",
    url: FAKE_LOGIN_URL,
    isFinishing: false,
  });
  await cancelDetachedLogin(dir);
});

test("when the extension missed pass-cli's exit, the session tells whether the login succeeded", async () => {
  for (const isLoggedIn of [true, false]) {
    const dir = loginDir();
    await startDetachedLogin(fakeCommand("login-wait"), dir, 2_000);
    const pid = savedPid(dir);
    process.kill(pid);
    await waitUntil(() => !isProcessRunning(pid));
    await sleep(50);
    // As if Raycast had stopped the extension before pass-cli exited.
    rmSync(join(dir, `${pid}-exit-code.txt`), { force: true });

    const status = await checkDetachedLogin(dir, async () => isLoggedIn);
    assert.equal(status.state, isLoggedIn ? "succeeded" : "failed");
  }
});

test("a login past the timeout fails while pass-cli still runs, and is forgotten once it's gone", async () => {
  const running = loginDir();
  await startDetachedLogin(fakeCommand("login-wait"), running, 2_000);
  const pid = savedPid(running);
  await sleep(5);

  const status = await checkDetachedLogin(running, loggedOut, 0);
  assert.equal(status.state, "failed");
  if (status.state === "failed") assert.equal(status.error.type, "timeout");
  // Started by this process, so it's still surely pass-cli and is stopped.
  await waitUntil(() => !isProcessRunning(pid));
  assert.equal(isProcessRunning(pid), false);

  const ended = loginDir();
  await startDetachedLogin(fakeCommand("login-ok"), ended, 2_000);
  const endedPid = savedPid(ended);
  await waitUntil(() => !isProcessRunning(endedPid));
  await sleep(5);
  assert.deepEqual(await checkDetachedLogin(ended, loggedOut, 0), { state: "none" });
});
