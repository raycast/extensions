import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import { z } from "zod";
import * as jira from "../src/utils/jira.ts";
import * as ticketTime from "../src/utils/ticket-time.ts";

// Exercise the actual request adapter with an offline MOCO transport and Raycast account stub.
const source = fs.readFileSync(new URL("../src/commands/activities/jira-time-api.ts", import.meta.url), "utf8");
const code = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2021 },
}).outputText;
const issue = jira.extractJiraIssue({ url: "https://your-team.atlassian.net/browse/PROJ-123", title: "" });
const row = (id, overrides = {}) => ({
  id,
  date: "2026-11-12",
  user: { id: 7 },
  worked_seconds: 900,
  ...jira.jiraActivityLink(issue),
  ...overrides,
});

function adapter(get, getCurrentUser = async () => ({ id: 7 })) {
  const exports = {};
  const modules = {
    zod: { z },
    "../../utils/api": { api: { get } },
    "../../utils/jira": jira,
    "../../utils/refresh": { getCurrentUser },
    "../../utils/ticket-time": ticketTime,
    "./utils": { localDate: () => "2026-11-12" },
  };
  vm.runInNewContext(code, {
    exports,
    require: (name) => {
      assert.ok(name in modules, `Unexpected dependency ${name}`);
      return modules[name];
    },
  });
  return exports.fetchJiraTicketTime;
}

test("ticket history is explicitly scoped to the signed-in user, with no date or project restriction", async () => {
  const controller = new AbortController();
  const fetch = adapter(async (url, options) => {
    assert.equal(url, "/activities");
    assert.equal(options.params.user_id, 7);
    assert.equal(options.params.term, "PROJ-123");
    assert.equal(options.params.per_page, 100);
    assert.equal(options.params.from, undefined);
    assert.equal(options.params.to, undefined);
    assert.equal(options.params.project_id, undefined);
    assert.equal(options.signal, controller.signal);
    return {
      data: [
        row(1),
        row(2, { date: "2024-01-01" }),
        row(3, { user: { id: 8 } }),
        row(4, { remote_url: "https://other-team.atlassian.net/browse/PROJ-123" }),
      ],
      headers: { "x-total": "4" },
    };
  });
  const summary = await fetch(issue, controller.signal);
  assert.equal(summary.totalSeconds, 1800);
  assert.equal(summary.todaySeconds, 900);
  assert.equal(summary.bookings, 2);
});

test("all HTTP pages are loaded and early URL-in-description bookings are included", async () => {
  const pages = [];
  const fetch = adapter(async (url, { params }) => {
    pages.push(params.page);
    return params.page === 1
      ? {
          data: [row(1)],
          headers: { "x-total": "2", link: '<https://demo.mocoapp.com/api/v1/activities?page=2>; rel="next"' },
        }
      : {
          data: [
            row(2, { remote_service: null, remote_id: null, remote_url: null, description: `PROJ-123\n${issue.url}` }),
          ],
          headers: { "x-total": "2" },
        };
  });
  const summary = await fetch(issue);
  assert.deepEqual(pages, [1, 2]);
  assert.equal(summary.totalSeconds, 1800);
});

test("authentication, validation and incomplete-pagination failures are not returned as zero time", async () => {
  for (const get of [
    async () => {
      throw new Error("Unauthorized");
    },
    async () => ({ data: [row(1, { user: null })], headers: {} }),
    async () => ({ data: [row(1)], headers: { "x-total": "2" } }),
    async () => ({ data: [row(1)], headers: { "x-total": "unknown" } }),
  ])
    await assert.rejects(adapter(get)(issue));
});

test("an unknown current user prevents the activity request", async () => {
  let requests = 0;
  const fetch = adapter(
    async () => {
      requests++;
    },
    async () => {
      throw new Error("No user");
    },
  );
  await assert.rejects(fetch(issue));
  assert.equal(requests, 0);
});
