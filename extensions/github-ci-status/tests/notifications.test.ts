import assert from "node:assert/strict";
import { test } from "node:test";
import { access, chmod, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { constants } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { WorkflowRun } from "../src/lib/model";
import { notifyRun, prepareNotifier } from "../src/lib/notifications";

const run = {
  id: 42,
  name: "Tests",
  display_title: '[CI] Fix "login"; $(echo literal)',
  head_branch: "feature/login",
  head_sha: "abcdef123456",
  html_url: "https://github.com/owner/repo/actions/runs/42",
  status: "completed",
  conclusion: "failure",
  run_attempt: 2,
  repository: { id: 1, full_name: "owner/repo", html_url: "https://github.com/owner/repo" },
  pull_requests: [],
  created_at: "2026-10-24T10:00:00Z",
  updated_at: "2026-10-24T10:01:00Z",
} satisfies WorkflowRun;

test("the bundled helper is used and unpacked executable permissions are repaired", async (t) => {
  const assets = await mkdtemp(join(tmpdir(), "ci-notifier-test-"));
  t.after(() => rm(assets, { recursive: true, force: true }));
  const helper = join(assets, "notification-helper/terminal-notifier.app/Contents/MacOS/terminal-notifier");
  await mkdir(dirname(helper), { recursive: true });
  await writeFile(helper, '#!/bin/sh\nprintf "%s\\n" "$@" > "$0.args"\n');
  await chmod(helper, 0o644);
  assert.equal(await prepareNotifier(assets), helper);
  await access(helper, constants.X_OK);

  await notifyRun(run, helper);
  const args = (await readFile(`${helper}.args`, "utf8")).trimEnd().split("\n");
  assert.equal(args[args.indexOf("-open") + 1], run.html_url);
  assert.equal(args[args.indexOf("-group") + 1], "github-ci-42-2");
  assert.equal(args[args.indexOf("-message") + 1], ` ${run.display_title} · abcdef1 · Attempt 2`);
  assert.ok(!args.includes("-execute"));
});

test("a missing bundled helper reports a packaging error without using a system installation", async (t) => {
  const assets = await mkdtemp(join(tmpdir(), "ci-notifier-missing-"));
  t.after(() => rm(assets, { recursive: true, force: true }));
  await assert.rejects(prepareNotifier(assets), /bundled notification helper is missing/);
});

test("denied notification permission remains an actionable error", async (t) => {
  const assets = await mkdtemp(join(tmpdir(), "ci-notifier-denied-"));
  t.after(() => rm(assets, { recursive: true, force: true }));
  const helper = join(assets, "denied");
  await writeFile(helper, '#!/bin/sh\necho "Notifications are not allowed for this application" >&2\nexit 3\n');
  await chmod(helper, 0o755);
  await assert.rejects(notifyRun(run, helper), /Allow notifications for terminal-notifier/);
});

test("notification clicks cannot open a non-GitHub URL", async () => {
  for (const url of ["file:///tmp/anything", "https://example.com/run/42", "http://github.com/run/42"]) {
    await assert.rejects(notifyRun({ ...run, html_url: url }, "/unused"), /valid GitHub URL/);
  }
});
