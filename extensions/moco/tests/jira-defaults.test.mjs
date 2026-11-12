import assert from "node:assert/strict";
import test from "node:test";
import {
  jiraDefaultKey,
  makeJiraDefault,
  normalizeJiraScope,
  parseJiraDefault,
  resolveJiraDefault,
  scopeForIssue,
} from "../src/utils/jira-defaults.ts";

const scope = { host: "your-team.atlassian.net", prefix: "PROJ" };
const projects = [
  {
    id: 100,
    name: "Project XX",
    active: true,
    tasks: [
      { id: 200, name: "Frontend", active: true },
      { id: 201, name: "Old Role", active: false },
    ],
  },
  { id: 101, name: "Other Project", active: true, tasks: [{ id: 202, name: "Consulting", active: true }] },
];
const rule = makeJiraDefault(scope, 100, 200, projects);

test("all PROJ tickets on the same site resolve to the saved project and role", () => {
  for (const key of ["PROJ-123", "PROJ-1", "PROJ-99999"]) {
    const found = scopeForIssue({ key, url: `https://your-team.atlassian.net/browse/${key}` });
    assert.deepEqual(resolveJiraDefault(found, rule, projects), { projectId: "100", taskId: "200", notice: "" });
  }
});

test("different Jira sites and project keys never inherit this rule", () => {
  for (const other of [
    { ...scope, host: "other-team.atlassian.net" },
    { ...scope, prefix: "OTHER" },
  ]) {
    assert.deepEqual(resolveJiraDefault(other, rule, projects), { projectId: "", taskId: "", notice: "" });
  }
});

test("no saved rule leaves both selections empty", () => {
  assert.deepEqual(resolveJiraDefault(scope, undefined, projects), { projectId: "", taskId: "", notice: "" });
});

test("removed or inactive projects require a fresh selection instead of another project", () => {
  for (const assigned of [projects.slice(1), projects.map((p) => ({ ...p, active: false }))]) {
    const resolved = resolveJiraDefault(scope, rule, assigned);
    assert.equal(resolved.projectId, "");
    assert.equal(resolved.taskId, "");
    assert.match(resolved.notice, /project is no longer available/);
  }
});

test("removed or inactive roles preserve the project but require a new role", () => {
  for (const tasks of [[], [{ id: 200, name: "Frontend", active: false }]]) {
    const resolved = resolveJiraDefault(scope, rule, [{ ...projects[0], tasks }]);
    assert.equal(resolved.projectId, "100");
    assert.equal(resolved.taskId, "");
    assert.match(resolved.notice, /role \/ service is no longer available/);
  }
});

test("cannot save a role from another project or an inactive role", () => {
  for (const [project, task] of [
    [100, 202],
    [100, 201],
    [999, 200],
    [100, 0],
  ]) {
    assert.throws(() => makeJiraDefault(scope, project, task, projects), /Choose an available/);
  }
});

test("saved role is restored by ID even when names or task order change", () => {
  const updated = [
    {
      ...projects[0],
      tasks: [
        { id: 203, name: "Other role", active: true },
        { id: 200, name: "Renamed role", active: true },
      ],
    },
  ];
  assert.equal(resolveJiraDefault(scope, rule, updated).taskId, "200");
});

test("storage keys isolate tenants, Jira sites and project keys", () => {
  const keys = [
    jiraDefaultKey("example-company", scope),
    jiraDefaultKey("other", scope),
    jiraDefaultKey("example-company", { ...scope, host: "other-team.atlassian.net" }),
    jiraDefaultKey("example-company", { ...scope, prefix: "OTHER" }),
  ];
  assert.equal(new Set(keys).size, 4);
  assert.equal(jiraDefaultKey(" EXAMPLE-COMPANY ", scope), keys[0]);
  assert.equal(keys[0].startsWith(jiraDefaultKey("example-company")), true);
  assert.equal(keys[0].startsWith(jiraDefaultKey("proto")), false);
});

test("stored rules round trip and corrupt or future data is ignored", () => {
  assert.deepEqual(parseJiraDefault(JSON.stringify(rule)), rule);
  for (const value of [
    undefined,
    false,
    "bad json",
    "null",
    "{}",
    JSON.stringify({ ...rule, version: 2 }),
    JSON.stringify({ ...rule, taskId: "200" }),
    JSON.stringify({ ...rule, host: "https://your-team.atlassian.net/path" }),
    JSON.stringify({ ...rule, projectId: -1 }),
  ]) {
    assert.equal(parseJiraDefault(value), undefined);
  }
});

test("rule entry accepts a pasted site URL and PROJ-* notation", () => {
  assert.deepEqual(normalizeJiraScope("https://YOUR-TEAM.atlassian.net/", " proj-* "), scope);
  for (const host of ["http://example.org", "https://user:pass@example.org", "example.org/path", "example.org:8443"]) {
    assert.throws(() => normalizeJiraScope(host, "PROJ"));
  }
  for (const prefix of ["", "PROJ-123", "PROJ *", "1PROJ"]) assert.throws(() => normalizeJiraScope(scope.host, prefix));
});
