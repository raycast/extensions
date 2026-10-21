// Starts real projects with bin/makedeck on a dedicated tmux socket.
import { test, after } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";
import { setTimeout as sleep } from "node:timers/promises";

process.env.MAKEDECK_SOCKET = `raycast-test-${process.pid}`;
const { listServices, restartService, stopProject } = await import("./tmux.ts");

const MAKEDECK = new URL("../../bin/makedeck", import.meta.url).pathname;
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

function startProject(makefile: string): string {
  const dir = mkdtempSync("/tmp/raycast-test-");
  dirs.push(dir);
  writeFileSync(join(dir, "Makefile"), makefile);
  execFileSync("bash", [MAKEDECK], { cwd: dir, env: process.env, stdio: "ignore" });
  return dir;
}

test("stopProject: ends processes including background and nohup ones, and runs dev-stop", async () => {
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

test("restartService: ends the old process before starting the new one", async () => {
  const dir = startProject(`dev: api\napi:\n\t@exec -a ${marker("api")} sleep 300\n`);
  await sleep(1000);
  const project = basename(dir).replaceAll(".", "_");
  const [api] = (await listServices()).filter((s) => s.project === project);

  await restartService(api.windowId);
  await sleep(1000);

  assert.equal(running("api"), 1);
});

// Exited panes have no PID; this used to become kill(-0) on our own process group,
// which killed Raycast (here: the test runner).
test("stopProject: a project with an exited pane stops only that project", async () => {
  const dir = startProject(`dev: setup web\nsetup:\n\t@true\nweb:\n\t@exec -a ${marker("web2")} sleep 300\n`);
  await sleep(1000);
  const project = basename(dir).replaceAll(".", "_");
  assert.ok((await listServices()).some((s) => s.project === project && s.status === "exited"));

  await stopProject(project, dir);
  await sleep(500);

  assert.equal(running("web2"), 0);
});

test("restartService: restarts an exited service", async () => {
  const dir = startProject(`dev: setup\nsetup:\n\t@echo run\n`);
  await sleep(1000);
  const project = basename(dir).replaceAll(".", "_");
  const [setup] = (await listServices()).filter((s) => s.project === project);
  assert.equal(setup.status, "exited");

  await restartService(setup.windowId);
});
