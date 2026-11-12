import assert from "node:assert/strict";
import test from "node:test";
import {
  makeJiraDefault,
  makeTimerDefault,
  parseTimerDefault,
  resolveTimerDefault,
  selectTimerDefaults,
  timerDefaultKey,
  jiraDefaultKey,
  isAvailableTimerProject,
} from "../src/utils/jira-defaults.ts";

const projects = [
  { id: 1, name: "Internal", tasks: [{ id: 10, name: "Development", active: true }] },
  { id: 2, name: "Client", tasks: [{ id: 20, name: "Frontend", active: true }] },
];
const scope = { host: "your-team.atlassian.net", prefix: "PROJ" };
const defaults = makeTimerDefault(1, 10, projects);
const rule = makeJiraDefault(scope, 2, 20, projects);

test("disabled project assignments cannot be restored or saved as plain defaults", () => {
  const assigned = projects.map((p) => ({ ...p, contract: { active: false } }));
  const selected = resolveTimerDefault(defaults, assigned);
  assert.equal(selected.projectId, "");
  assert.equal(selected.taskId, "");
  assert.match(selected.notice, /project is no longer available/);
  assert.throws(() => makeTimerDefault(1, 10, assigned), /Choose an available/);
  assert.equal(assigned.filter(isAvailableTimerProject).length, 0);
  assert.equal(isAvailableTimerProject({ ...projects[0], contract: { active: true } }), true);
});

test("a disabled assignment in a Jira rule requires repair instead of falling back", () => {
  const assigned = projects.map((p) => (p.id === 2 ? { ...p, contract: { active: false } } : p));
  const selected = selectTimerDefaults(scope, rule, defaults, assigned);
  assert.equal(selected.source, "jira");
  assert.equal(selected.projectId, "");
  assert.equal(selected.taskId, "");
  assert.throws(() => makeJiraDefault(scope, 2, 20, assigned), /Choose an available/);
});

test("plain timers restore their saved project and role without Jira", () => {
  const selected = selectTimerDefaults(undefined, undefined, defaults, projects);
  assert.deepEqual(selected, { projectId: "1", taskId: "10", notice: "", source: "default" });
});

test("a matching Jira rule takes priority over plain defaults", () => {
  assert.deepEqual(selectTimerDefaults(scope, rule, defaults, projects), {
    projectId: "2",
    taskId: "20",
    notice: "",
    source: "jira",
  });
});

test("Jira tickets with no matching rule use plain defaults", () => {
  assert.equal(selectTimerDefaults(scope, undefined, defaults, projects).projectId, "1");
  assert.equal(selectTimerDefaults({ ...scope, host: "other.atlassian.net" }, rule, defaults, projects).projectId, "1");
  assert.equal(selectTimerDefaults({ ...scope, prefix: "OTHER" }, rule, defaults, projects).source, "default");
});

test("a removed Jira project does not silently fall back to the plain project", () => {
  const selected = selectTimerDefaults(scope, rule, defaults, projects.slice(0, 1));
  assert.equal(selected.projectId, "");
  assert.equal(selected.taskId, "");
  assert.equal(selected.source, "jira");
  assert.match(selected.notice, /no longer available/);
});

test("stale plain roles preserve the project but require a valid role", () => {
  const selected = resolveTimerDefault(defaults, [{ ...projects[0], tasks: [] }]);
  assert.equal(selected.projectId, "1");
  assert.equal(selected.taskId, "");
  assert.match(selected.notice, /role/);
});

test("no remembered selections leaves the pickers empty", () => {
  assert.deepEqual(selectTimerDefaults(undefined, undefined, undefined, projects), {
    projectId: "",
    taskId: "",
    notice: "",
    source: "none",
  });
});

test("general defaults cannot pair a project with another project's role", () => {
  assert.throws(() => makeTimerDefault(1, 20, projects), /Choose an available/);
});

test("editing a loaded Jira rule uses the newly selected project and role", () => {
  const edited = makeJiraDefault(rule, 1, 10, projects);
  assert.equal(edited.projectId, 1);
  assert.equal(edited.taskId, 10);
  assert.equal(edited.projectName, "Internal");
  assert.equal(edited.taskName, "Development");
  assert.equal(edited.prefix, scope.prefix);
  assert.equal(rule.projectId, 2);
});

test("plain defaults round trip without Jira fields; invalid data is ignored", () => {
  assert.deepEqual(parseTimerDefault(JSON.stringify(defaults)), defaults);
  for (const data of [
    undefined,
    "null",
    "broken",
    "{}",
    JSON.stringify({ ...defaults, version: 9 }),
    JSON.stringify({ ...defaults, taskId: 0 }),
    JSON.stringify({ ...defaults, projectId: "1" }),
  ])
    assert.equal(parseTimerDefault(data), undefined);
});

test("plain and Jira defaults have separate tenant-scoped storage keys", () => {
  assert.notEqual(timerDefaultKey("example-company"), timerDefaultKey("other"));
  assert.notEqual(timerDefaultKey("example-company"), jiraDefaultKey("example-company", scope));
  assert.equal(timerDefaultKey(" EXAMPLE-COMPANY "), timerDefaultKey("example-company"));
});
