// Starts real projects with bin/makedeck on a dedicated tmux socket.
import { test, after } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";
import { setTimeout as sleep } from "node:timers/promises";

process.env.MAKEDECK_SOCKET = `raycast-test-${process.pid}`;
const { listServices, restartService, stopProject, stopService } = await import("./tmux.ts");

// The launcher lives in the makedeck repository, not in the extension. Outside that repository
// (e.g. in raycast/extensions), set MAKEDECK_BIN; without it these tests are skipped.
const MAKEDECK = process.env.MAKEDECK_BIN || new URL("../../bin/makedeck", import.meta.url).pathname;
const skip =
  !process.env.MAKEDECK_BIN && !existsSync(MAKEDECK) && `launcher not found at ${MAKEDECK}; set MAKEDECK_BIN`;
const dirs: string[] = [];

const ignoreFailure = (fn: () => unknown) => {
  try {
    fn();
  } catch {
    // nothing left to clean up
  }
};

after(() => {
  ignoreFailure(() => execFileSync("pkill", ["-f", `KTEST${process.pid}_`]));
  ignoreFailure(() => execFileSync("tmux", ["-L", process.env.MAKEDECK_SOCKET!, "kill-server"], { stdio: "ignore" }));
  for (const dir of dirs) rmSync(dir, { recursive: true, force: true });
});

// Processes carry a unique marker so pgrep finds only them.
const marker = (name: string) => `KTEST${process.pid}_${name}`;
const running = (name: string) => {
  try {
    return execFileSync("pgrep", ["-f", marker(name)])
      .toString()
      .trim()
      .split("\n").length;
  } catch {
    return 0;
  }
};

function startProject(makefile: string, files: Record<string, string> = {}): string {
  const dir = mkdtempSync("/tmp/raycast-test-");
  dirs.push(dir);
  writeFileSync(join(dir, "Makefile"), makefile);
  for (const [name, content] of Object.entries(files)) writeFileSync(join(dir, name), content);
  execFileSync("bash", [MAKEDECK], { cwd: dir, env: process.env, stdio: "ignore" });
  return dir;
}

test("stopProject: ends processes including background and nohup ones, and runs dev-stop", { skip }, async () => {
  const dir = startProject(
    `dev: web worker\n` +
      `web:\n\t@exec -a ${marker("web")} sleep 300\n` +
      `worker:\n\t@nohup bash -c 'exec -a ${marker("nohup")} sleep 300' >/dev/null 2>&1 & exec -a ${marker("worker")} sleep 300\n` +
      `dev-stop:\n\t@touch stopped\n`,
  );
  await sleep(1000);
  assert.equal(running("web") + running("worker") + running("nohup"), 3);

  const project = basename(dir).replaceAll(".", "_");
  await stopProject(project, dir);
  await sleep(1000);

  assert.equal(running("web") + running("worker") + running("nohup"), 0);
  assert.ok(existsSync(join(dir, "stopped")), "make dev-stop did not run");
  assert.equal((await listServices()).filter((s) => s.project === project).length, 0);
});

test("restartService: ends the old process before starting the new one", { skip }, async () => {
  const dir = startProject(`dev: api\napi:\n\t@exec -a ${marker("api")} sleep 300\n`);
  await sleep(1000);
  const project = basename(dir).replaceAll(".", "_");
  const [api] = (await listServices()).filter((s) => s.project === project);

  await restartService(api.windowId);
  await sleep(1000);

  assert.equal(running("api"), 1);
});

test(
  "stopService: waits for and kills a child that ignores SIGTERM and SIGHUP after the pane exits",
  { skip },
  async () => {
    const dir = startProject(
      `dev: api\napi:\n\t@bash -c 'trap "" TERM HUP; exec -a ${marker("stubborn")} sleep 300' & exec -a ${marker("main")} sleep 300\n`,
    );
    await sleep(1000);
    const project = basename(dir).replaceAll(".", "_");
    const [api] = (await listServices()).filter((s) => s.project === project);
    assert.equal(running("stubborn") + running("main"), 2);

    await stopService(api.windowId);

    assert.equal(running("stubborn") + running("main"), 0);
  },
);

test("stopProject: runs dev-stop defined in an included file", { skip }, async () => {
  const dir = startProject(`include stop.mk\ndev: web\nweb:\n\t@exec -a ${marker("web3")} sleep 300\n`, {
    "stop.mk": "dev-stop:\n\t@touch stopped\n",
  });
  await sleep(1000);
  const project = basename(dir).replaceAll(".", "_");

  assert.equal(await stopProject(project, dir), true);
  assert.ok(existsSync(join(dir, "stopped")), "make dev-stop did not run");
});

test("stopProject: a project without dev-stop reports that it did not run", { skip }, async () => {
  const dir = startProject(`dev: web\nweb:\n\t@exec -a ${marker("web4")} sleep 300\n`);
  await sleep(1000);
  const project = basename(dir).replaceAll(".", "_");

  assert.equal(await stopProject(project, dir), false);
});

test("stopProject: a failing sub-make in dev-stop is reported, not treated as a missing target", { skip }, async () => {
  const dir = startProject(
    `dev: web\nweb:\n\t@exec -a ${marker("web5")} sleep 300\ndev-stop:\n\t@$(MAKE) -C sub dev-stop\n`,
  );
  mkdirSync(join(dir, "sub"));
  writeFileSync(join(dir, "sub", "Makefile"), "other:\n");
  await sleep(1000);
  const project = basename(dir).replaceAll(".", "_");

  await assert.rejects(stopProject(project, dir), /No rule to make target/);
});

// Exited panes have no PID; this used to become kill(-0) on our own process group,
// which killed Raycast (here: the test runner).
test("stopProject: a project with an exited pane stops only that project", { skip }, async () => {
  const dir = startProject(`dev: setup web\nsetup:\n\t@true\nweb:\n\t@exec -a ${marker("web2")} sleep 300\n`);
  await sleep(1000);
  const project = basename(dir).replaceAll(".", "_");
  assert.ok((await listServices()).some((s) => s.project === project && s.status === "exited"));

  await stopProject(project, dir);
  await sleep(500);

  assert.equal(running("web2"), 0);
});

test("restartService: restarts an exited service", { skip }, async () => {
  const dir = startProject(`dev: setup\nsetup:\n\t@echo run\n`);
  await sleep(1000);
  const project = basename(dir).replaceAll(".", "_");
  const [setup] = (await listServices()).filter((s) => s.project === project);
  assert.equal(setup.status, "exited");

  await restartService(setup.windowId);
});
