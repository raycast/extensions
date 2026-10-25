import assert from "node:assert/strict";
import { test } from "node:test";
import { GitHubError } from "../src/lib/github";
import { checkTrackedRuns, WatchStorage } from "../src/lib/monitor";
import { WorkflowRun } from "../src/lib/model";
import { notificationFor, RunState, shouldNotify, stateKey, TrackedRun } from "../src/lib/tracking";

const run: WorkflowRun = {
  id: 42,
  name: "Tests",
  display_title: "Fix login redirect",
  head_branch: "main",
  head_sha: "abcdef123456",
  html_url: "https://github.com/owner/repo/actions/runs/42",
  status: "in_progress",
  conclusion: null,
  created_at: "2020-01-01T00:00:00Z",
  updated_at: "2020-01-01T00:00:00Z",
  run_attempt: 1,
  repository: { id: 1, full_name: "owner/repo", html_url: "https://github.com/owner/repo" },
  pull_requests: [],
};
const watch: TrackedRun = { subscription: "subscription-1", run, baselineAttempt: 0 };
const key = "test:42";
const completed = (conclusion = "success", attempt = 1): WorkflowRun => ({
  ...run,
  status: "completed",
  conclusion,
  run_attempt: attempt,
});

function fixture(watches = { [key]: JSON.stringify(watch) }) {
  const values: Record<string, string> = { ...watches };
  const storage: WatchStorage = {
    allItems: async () => ({ ...values }),
    getItem: async (key) => values[key],
    setItem: async (key, value) => {
      values[key] = value;
    },
  };
  const sent: WorkflowRun[] = [];
  const check = (
    options: {
      fetch?: () => Promise<WorkflowRun>;
      notify?: (run: WorkflowRun) => Promise<void>;
    } = {},
  ) =>
    checkTrackedRuns({
      prefix: "test:",
      storage,
      client: { run: options.fetch ?? (async () => completed()) },
      notify:
        options.notify ??
        (async (run) => {
          sent.push(run);
        }),
      signal: new AbortController().signal,
    });
  return { values, sent, check };
}

test("all terminal outcomes notify once, including runs outside the lookback", async () => {
  for (const conclusion of ["success", "failure", "cancelled", "timed_out", "skipped"]) {
    const { check, sent } = fixture();
    await check({ fetch: async () => completed(conclusion) });
    await check({ fetch: async () => completed(conclusion) });
    assert.equal(sent.length, 1, conclusion);
    assert.equal(sent[0].conclusion, conclusion);
  }
});

test("running and incomplete results do not notify; a later completion does", async () => {
  const { check, sent } = fixture();
  await check({ fetch: async () => run });
  await check({ fetch: async () => ({ ...completed(), conclusion: null }) });
  assert.equal(sent.length, 0);
  await check();
  assert.equal(sent.length, 1);
});

test("a previously saved completion baseline is respected; reruns notify once", async () => {
  const { check, sent } = fixture({ [key]: JSON.stringify({ ...watch, baselineAttempt: 1 }) });
  await check();
  assert.equal(sent.length, 0);
  await check({ fetch: async () => ({ ...run, run_attempt: 2 }) });
  await check({ fetch: async () => completed("failure", 2) });
  await check({ fetch: async () => completed("failure", 2) });
  assert.equal(sent.length, 1);
  assert.equal(sent[0].run_attempt, 2);
});

test("untracking during a scan prevents notification and does not recreate saved state", async () => {
  const { values, check, sent } = fixture();
  await check({
    fetch: async () => {
      delete values[key];
      return completed();
    },
  });
  assert.equal(sent.length, 0);
  assert.equal(values[stateKey(watch)], undefined);
});

test("retracking during a scan does not send the old subscription's notification", async () => {
  const { values, check, sent } = fixture();
  await check({
    fetch: async () => {
      values[key] = JSON.stringify({ ...watch, subscription: "replacement" });
      return completed();
    },
  });
  assert.equal(sent.length, 0);
  assert.equal(values[stateKey(watch)], undefined);
});

test("notification errors preserve delivery state and retry on the next scan", async () => {
  const { values, check, sent } = fixture();
  const failed = await check({
    notify: async () => {
      throw new Error("Notification permission denied");
    },
  });
  assert.match(failed.errors[0], /permission denied/);
  assert.equal(values[stateKey(watch)], undefined);
  await check();
  assert.equal(sent.length, 1);
});

test("API failures do not notify or erase state", async () => {
  const { values, check, sent } = fixture();
  await check({ fetch: async () => run });
  const saved = values[stateKey(watch)];
  const failed = await check({
    fetch: async () => {
      throw new GitHubError("Revoked", 401, true);
    },
  });
  assert.equal(failed.errors.length, 1);
  assert.equal(sent.length, 0);
  assert.equal(values[stateKey(watch)], saved);
});

test("notification text includes workflow, repository, branch, result and a direct run link", () => {
  const notification = notificationFor(completed("failure"));
  assert.match(notification.title, /failure.*owner\/repo/i);
  assert.match(notification.subtitle, /Tests.*main/);
  assert.match(notification.message, /Fix login redirect.*abcdef1/);
  assert.equal(notification.url, run.html_url);
});

test("delivery state cannot suppress a newer attempt or notify a different run", () => {
  const state: RunState = { run: completed(), notifiedAttempt: 1 };
  assert.equal(shouldNotify(watch, state, completed()), false);
  assert.equal(shouldNotify(watch, state, completed("success", 2)), true);
  assert.equal(shouldNotify(watch, state, { ...completed("success", 2), id: 99 }), false);
});
