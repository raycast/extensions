import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import * as jira from "../src/utils/jira.ts";

const code = ts.transpileModule(
  fs.readFileSync(new URL("../src/commands/activities/components/ActivityStart.tsx", import.meta.url), "utf8"),
  { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2021, jsx: ts.JsxEmit.ReactJSX } },
).outputText;

function renderActions({ withJira = true, withDefaults = false, hours = "" } = {}) {
  const exports = {};
  const jsx = (type, props) => ({ type, props });
  const issue = withJira
    ? jira.extractJiraIssue({
        url: "https://example.atlassian.net/browse/PROJ-123",
        title: "[PROJ-123] Improve sign-in - Jira",
      })
    : undefined;
  const modules = {
    "react/jsx-runtime": { jsx, jsxs: jsx },
    react: { useEffect: () => {}, useRef: () => ({ current: null }), useState: (value) => [value, () => {}] },
    "@raycast/api": {
      ActionPanel: "ActionPanel",
      Action: { SubmitForm: "SubmitForm", OpenInBrowser: "OpenInBrowser", CopyToClipboard: "CopyToClipboard" },
      Form: { Dropdown: { Item: "DropdownItem", Section: "DropdownSection" }, DatePicker: { Type: { Date: "Date" } } },
      Icon: {},
      useNavigation: () => ({ pop: () => {} }),
    },
    "@raycast/utils": {
      FormValidation: { Required: "required" },
      usePromise: () => ({ revalidate: () => {} }),
      useCachedPromise: () => ({ data: [], isLoading: false }),
      useForm: () => ({
        handleSubmit: () => {},
        itemProps: {},
        values: { hours, description: "Improve sign-in", projectDropdown: "", taskDropdown: "" },
        setValue: () => {},
      }),
    },
    "../api": {
      startActivity: () => {
        throw new Error("Must not create an activity in this test");
      },
    },
    "../../projects/api": {
      fetchProjects: () => {
        throw new Error("Must not contact MOCO in this test");
      },
    },
    "../utils": {},
    "../../../utils/jira": jira,
    "../../../utils/jira-defaults": { scopeForIssue: () => ({ prefix: "PROJ" }) },
    "./JiraTicketTime": { JiraTicketTime: "JiraTicketTime" },
    "../jira-time-api": {},
  };
  vm.runInNewContext(code, {
    exports,
    URL,
    require: (name) => {
      assert.ok(name in modules, `Unexpected dependency ${name}`);
      return modules[name];
    },
  });
  const view = exports.ActivityStart({
    jiraIssue: issue,
    assignedProjects: [],
    onSaveDefaults: withDefaults ? async () => {} : undefined,
  });
  return { issue, actions: view.props.actions.props.children.flat(Infinity).filter(Boolean) };
}

for (const hours of ["", "0:15"]) {
  test(`Jira shortcuts remain visible without optional callbacks when hours is ${JSON.stringify(hours)}`, () => {
    const { actions, issue } = renderActions({ hours });
    assert.equal(actions[0].props.title, hours ? "Log Work" : "Start Timer");
    assert.ok(actions.slice(0, 2).every((action) => !action.props.shortcut));
    const openIndex = actions.findIndex((action) => action.props.title === "Open Jira Ticket");
    const refreshIndex = actions.findIndex((action) => action.props.title === "Refresh Jira Ticket Time");
    assert.ok(openIndex >= 2, "Open Jira Ticket must be below the first two action slots");
    assert.ok(refreshIndex >= 2, "Refresh Jira Ticket Time must be below the first two action slots");
    assert.equal(actions[openIndex].props.shortcut.key, "o");
    assert.equal(actions[refreshIndex].props.shortcut.key, "r");
    assert.equal(actions[1].type, "CopyToClipboard");
    assert.equal(actions[1].props.content, issue.url);
  });
}

test("plain timers do not show Jira actions", () => {
  const { actions } = renderActions({ withJira: false });
  assert.equal(actions.length, 1);
  assert.equal(actions[0].props.title, "Start Timer");
});

for (const withJira of [false, true]) {
  test(`saving defaults keeps its custom shortcut visible with Jira ${withJira ? "attached" : "absent"}`, () => {
    const { actions } = renderActions({ withJira, withDefaults: true });
    assert.ok(actions.slice(0, 2).every((action) => !action.props.shortcut));
    const index = actions.findIndex((action) => action.props.title === "Save Project and Role Defaults");
    assert.ok(index >= 2);
    assert.equal(actions[index].props.shortcut.key, "s");
    if (!withJira) {
      assert.equal(actions[1].props.title, "Copy Description");
      assert.equal(actions[1].props.content, "Improve sign-in");
    }
  });
}
