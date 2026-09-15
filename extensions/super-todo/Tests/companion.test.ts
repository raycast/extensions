import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { test } from "node:test";
import { CompanionNotFoundError, findCompanion } from "../src/lib/companion";

async function fixture() {
  const root = await mkdtemp(path.join(tmpdir(), "super-todo-install-test-"));
  return {
    home: path.join(root, "home"),
    applications: path.join(root, "Applications"),
  };
}
async function install(app: string) {
  const executable = path.join(app, "Contents", "MacOS", "super-todo");
  await mkdir(path.dirname(executable), { recursive: true });
  await writeFile(executable, "#!/bin/sh\nexit 0\n", { mode: 0o700 });
  return executable;
}

test("missing companion gives an actionable, non-downloading error", async () => {
  const { home, applications } = await fixture();
  await assert.rejects(
    findCompanion(undefined, home, applications),
    (error: unknown) => {
      assert.ok(error instanceof CompanionNotFoundError);
      assert.match(error.message, /Install super todo\.app/);
      assert.match(error.message, /not notarized/);
      return true;
    },
  );
});

test("detects system and user installations with spaces in the app name", async () => {
  const { home, applications } = await fixture();
  const systemApp = path.join(applications, "super todo.app");
  await install(systemApp);
  assert.equal(
    (await findCompanion(undefined, home, applications)).app,
    systemApp,
  );
  const userApp = path.join(home, "Applications", "super todo.app");
  const executable = await install(userApp);
  assert.deepEqual(await findCompanion(undefined, home, applications), {
    app: userApp,
    executable,
  });
});

test("explicit selection wins and a missing selection does not silently fall back", async () => {
  const { home, applications } = await fixture();
  await install(path.join(applications, "super todo.app"));
  const chosen = path.join(home, "custom", "super todo.app");
  await install(chosen);
  assert.equal((await findCompanion(chosen, home, applications)).app, chosen);
  await assert.rejects(
    findCompanion(path.join(home, "missing.app"), home, applications),
    CompanionNotFoundError,
  );
});
