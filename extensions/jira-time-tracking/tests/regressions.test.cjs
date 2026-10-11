const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");

// Load the real TypeScript modules with fixture-only Raycast/Jira boundaries.
function fixtureModules(preferences = {}, request, fetch) {
  const prefs = {
    isJiraCloud: "cloud",
    domain: "example.atlassian.net",
    username: "fixture@example.test",
    token: "fixture",
    ...preferences,
  };
  const cache = new Map();
  const api = { getPreferenceValues: () => prefs };
  function load(name) {
    if (cache.has(name)) return cache.get(name);
    const filename = path.join(__dirname, "../src", `${name}.ts`);
    const code = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
    }).outputText;
    const module = { exports: {} };
    cache.set(name, module.exports);
    const requireFixture = (id) => {
      if (id === "@raycast/api") return api;
      if (id === "./requests" && request) return { jiraRequest: request };
      if (id === "node-fetch" && fetch) return { __esModule: true, default: fetch };
      if (id.startsWith("./")) return load(id.slice(2));
      throw new Error(`Unexpected import: ${id}. Tests must not access external services.`);
    };
    vm.runInThisContext(`(function(require,module,exports){${code}\n})`, { filename })(
      requireFixture,
      module,
      module.exports,
    );
    return module.exports;
  }
  return load;
}

const issue = (key) => ({ key, fields: { summary: `Fixture ${key}`, project: { key: "TEST", name: "Test" } } });
const log = (id, day = 2, author = "me") => ({
  id,
  started: new Date(2026, 9, day, 12).toISOString(),
  timeSpentSeconds: 3600,
  author: { accountId: author, name: author, displayName: "Fixture User" },
});
const page = (worklogs, startAt = 0, total = worklogs.length) => ({ worklogs, startAt, total, maxResults: 1 });
const bounds = () => fixtureModules()("utils").getMonthBounds(new Date(2026, 9, 1));

test("durations reject partial/duplicate units and unsafe values", () => {
  const { parseTimeToSeconds } = fixtureModules()("utils");
  for (const [input, seconds] of [
    ["2h 30m", 9000],
    ["45m", 2700],
    ["30s", 30],
    [" 1h2m3s ", 3723],
    ["90m", 5400],
  ]) {
    assert.equal(parseTimeToSeconds(input), seconds, input);
  }
  for (const input of ["1h rubbish", "1h 2h", "1h 30", "2m 1h", "-1h", "1.5h", "", "999999999999999999h"]) {
    assert.equal(parseTimeToSeconds(input), 0, input);
  }
});

test("nested ADF comments retain text from lists and mentions", () => {
  const { extractCommentText } = fixtureModules()("utils");
  assert.equal(
    extractCommentText({
      type: "doc",
      version: 1,
      content: [
        {
          type: "bulletList",
          content: [
            {
              type: "listItem",
              content: [
                {
                  type: "paragraph",
                  content: [
                    { type: "text", text: "Review with " },
                    { type: "mention", attrs: { text: "@Fixture" } },
                  ],
                },
              ],
            },
          ],
        },
      ],
    }),
    "Review with @Fixture",
  );
});

test("weekend entries count toward month totals, outside-month entries do not", () => {
  const { groupWorklogsByDay } = fixtureModules()("utils");
  const entries = [
    log("weekday", 2),
    log("weekend", 3),
    { ...log("outside"), started: new Date(2026, 8, 30).toISOString() },
  ].map((worklog) => ({
    worklog,
    issue: { key: "TEST-1", summary: "Fixture", project: { key: "TEST", name: "Test" } },
  }));
  const days = groupWorklogsByDay(entries, new Date(2026, 9, 1));
  assert.equal(
    days.reduce((sum, day) => sum + day.totalSeconds, 0),
    7200,
  );
  assert.ok(days.some((day) => day.date.getDay() === 6 && day.entries[0]?.worklog.id === "weekend"));
  assert.ok(days.every((day) => day.entries.length || (day.date.getDay() >= 1 && day.date.getDay() <= 5)));
});

test("base URLs accept hostnames and Server context paths", () => {
  assert.equal(
    fixtureModules()("utils").createJiraUrl("/rest/api/3/myself"),
    "https://example.atlassian.net/rest/api/3/myself",
  );
  assert.equal(
    fixtureModules({ domain: "https://example.test/jira/" })("utils").createJiraUrl("/browse/TEST-1"),
    "https://example.test/jira/browse/TEST-1",
  );
  assert.throws(
    () => fixtureModules({ domain: "https://user:pass@example.test" })("utils").createJiraUrl("/rest"),
    /without credentials/,
  );
});

test("Cloud search and per-issue worklogs consume every page and filter current user", async () => {
  const calls = [];
  const load = fixtureModules({}, async (endpoint, body) => {
    calls.push({ endpoint, body });
    if (endpoint.endsWith("/myself")) return { accountId: "me" };
    if (endpoint.endsWith("/search/jql")) {
      return JSON.parse(body).nextPageToken
        ? { issues: [issue("TEST-2")], isLast: true }
        : { issues: [issue("TEST-1")], nextPageToken: "cursor-2", isLast: false };
    }
    const url = new URL(`https://example.test${endpoint}`);
    if (endpoint.includes("TEST-1"))
      return url.searchParams.get("startAt") === "0"
        ? page([log("other-author", 2, "other")], 0, 2)
        : page([log("mine", 3)], 1, 2);
    return page([{ ...log("last-millisecond"), started: new Date(2026, 9, 31, 23, 59, 59, 999).toISOString() }]);
  });
  const { start, end } = bounds();
  const entries = await load("controllers").getWorklogs(start, end);
  assert.deepEqual(
    entries.map((entry) => entry.worklog.id),
    ["last-millisecond", "mine"],
  );
  assert.equal(calls.filter((call) => call.endpoint.endsWith("/search/jql")).length, 2);
  assert.equal(calls.filter((call) => call.endpoint.includes("/worklog?")).length, 3);
});

test("Server offsets advance by returned counts and the full project array loads once", async () => {
  const offsets = [];
  let projectRequests = 0;
  const load = fixtureModules(
    { isJiraCloud: "server", customJQL: 'summary ~ "ORDER BY" ORDER BY updated DESC' },
    async (endpoint) => {
      if (endpoint.endsWith("/project")) {
        projectRequests++;
        return [{ key: "TEST", name: "Test" }];
      }
      const url = new URL(`https://example.test${endpoint}`);
      assert.match(url.searchParams.get("jql"), /AND \(summary ~ "ORDER BY"\) ORDER BY updated DESC$/);
      const startAt = Number(url.searchParams.get("startAt"));
      offsets.push(startAt);
      return { issues: [issue(`TEST-${startAt + 1}`)], startAt, total: 3, maxResults: 1 };
    },
  );
  const controller = load("controllers");
  const projects = await controller.loadAllPages((token) => controller.getProjects(Number(token || 0)));
  assert.equal(projects.length, 1);
  assert.equal(projectRequests, 1);
  const issues = await controller.loadAllPages((token) => controller.getIssues(token, "TEST"));
  assert.equal(issues.length, 3);
  assert.deepEqual(offsets, [0, 1, 2]);
});

test("Server monthly search paginates and uses author.name", async () => {
  const offsets = [];
  const load = fixtureModules({ isJiraCloud: "server" }, async (endpoint) => {
    if (endpoint.endsWith("/myself")) return { name: "me" };
    if (endpoint.includes("/search?")) {
      const startAt = Number(new URL(`https://example.test${endpoint}`).searchParams.get("startAt"));
      offsets.push(startAt);
      return { issues: [issue(`TEST-${startAt + 1}`)], startAt, maxResults: 1, total: 2 };
    }
    return page([log(endpoint.includes("TEST-1") ? "one" : "two")]);
  });
  const { start, end } = bounds();
  assert.equal((await load("controllers").getWorklogs(start, end)).length, 2);
  assert.deepEqual(offsets, [0, 1]);
});

test("failed identity/worklog requests reject instead of producing partial totals", async () => {
  const { start, end } = bounds();
  const noIdentity = fixtureModules({}, async () => {
    throw new Error("identity unavailable");
  });
  await assert.rejects(noIdentity("controllers").getWorklogs(start, end), /identity unavailable/);
  const partial = fixtureModules({}, async (endpoint) => {
    if (endpoint.endsWith("/myself")) return { accountId: "me" };
    if (endpoint.endsWith("/search/jql")) return { issues: [issue("TEST-1"), issue("TEST-2")], isLast: true };
    if (endpoint.includes("TEST-2")) throw new Error("rate limited");
    return page([log("one")]);
  });
  await assert.rejects(partial("controllers").getWorklogs(start, end), /rate limited/);
});

test("worklog fan-out stays at five requests at a time", async () => {
  let active = 0,
    peak = 0;
  const load = fixtureModules({}, async (endpoint) => {
    if (endpoint.endsWith("/myself")) return { accountId: "me" };
    if (endpoint.endsWith("/search/jql"))
      return { issues: Array.from({ length: 12 }, (_, i) => issue(`TEST-${i}`)), isLast: true };
    active++;
    peak = Math.max(peak, active);
    await new Promise((resolve) => setImmediate(resolve));
    active--;
    return page([log(endpoint)]);
  });
  const { start, end } = bounds();
  assert.equal((await load("controllers").getWorklogs(start, end)).length, 12);
  assert.equal(peak, 5);
});

test("repeated pagination tokens and malformed responses are failures", async () => {
  const controller = fixtureModules({}, async () => ({ issues: "invalid" }))("controllers");
  await assert.rejects(controller.getIssues(undefined, "TEST"), /invalid issue response/);
  await assert.rejects(
    controller.loadAllPages(async () => ({ data: [], nextPageToken: "same" })),
    /repeated pagination token/,
  );
});

test("time-only updates omit comment, empty Cloud descriptions contain no blank text node", async () => {
  const calls = [];
  const controller = fixtureModules({}, async (endpoint, body, method) =>
    calls.push({ endpoint, body: body && JSON.parse(body), method }),
  )("controllers");
  await controller.updateWorklog("TEST-1", "42", 7200, undefined, new Date(2026, 9, 2));
  assert.equal("comment" in calls[0].body, false);
  await controller.postTimeLog(3600, "TEST-1", "", new Date(2026, 9, 2));
  assert.equal("comment" in calls[1].body, false);
  await controller.updateWorklog("TEST-1", "42", 7200, "first\nsecond", new Date(2026, 9, 2));
  assert.equal(calls[2].body.comment.content.length, 2);
  await controller.updateWorklog("TEST-1", "42", 7200, "", new Date(2026, 9, 2));
  assert.deepEqual(calls[3].body.comment, { type: "doc", version: 1, content: [{ type: "paragraph" }] });
});

test("Jira errors retain errorMessages/errors and handle non-JSON status failures", async () => {
  const response = (status, text) => ({ status, ok: status < 400, text: async () => text });
  let next = response(400, JSON.stringify({ errorMessages: ["Bad date"], errors: { timeSpent: "Invalid duration" } }));
  const request = fixtureModules({}, undefined, async () => next)("requests").jiraRequest;
  await assert.rejects(request("/rest/api/3/issue/TEST-1/worklog"), /Bad date Invalid duration/);
  next = response(401, "<html>Unauthorized</html>");
  await assert.rejects(request("/rest/api/3/myself"), /Authentication/);
  next = response(204, "");
  assert.equal(await request("/rest/api/3/issue/TEST-1/worklog/42", undefined, "DELETE"), undefined);
});
