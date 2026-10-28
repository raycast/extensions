import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import { format } from "date-fns";
import ts from "typescript";

const require = createRequire(import.meta.url);

// Raycast's runtime is only available inside the app. Run the production modules
// with UI and network stubs while keeping React and date-fns unchanged.
function loadSource(path, dependencies) {
  const source = readFileSync(new URL(`../src/${path}`, import.meta.url), "utf8");
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2023,
      jsx: ts.JsxEmit.ReactJSX,
      esModuleInterop: true,
    },
  });
  const module = { exports: {} };
  const localRequire = (name) => (Object.hasOwn(dependencies, name) ? dependencies[name] : require(name));
  new Function("require", "module", "exports", outputText)(localRequire, module, module.exports);
  return module.exports;
}

const api = {
  Color: { PrimaryText: "primary" },
  List: { Item: "List.Item" },
  Icon: {},
  ActionPanel: Object.assign(() => null, { Section: "ActionPanel.Section" }),
  Action: Object.assign(() => null, {
    Style: {},
    PickDate: Object.assign(() => null, { Type: { Date: "date" } }),
    Push: "Action.Push",
    OpenInBrowser: "Action.OpenInBrowser",
    CopyToClipboard: "Action.CopyToClipboard",
  }),
  Keyboard: { Shortcut: { Common: {} } },
  Toast: { Style: { Animated: "animated", Success: "success", Failure: "failure" } },
  useNavigation: () => ({}),
};
const colors = loadSource("helpers/colors.ts", { "@raycast/api": api });
const { getDueDateText, getDueDateColor, getTaskSubtitle } = loadSource("helpers/task.ts", {
  "@raycast/api": api,
  "./colors": colors,
});
const { default: TaskListItem } = loadSource("components/TaskListItem.tsx", {
  "@raycast/api": api,
  "@raycast/utils": {},
  "../helpers/task": { getTaskSubtitle },
  "./TaskActions": () => null,
  "./TaskDetail": () => null,
});

function makeTask(dates = {}) {
  return {
    gid: "123",
    name: "Test task",
    due_on: null,
    due_at: null,
    completed: false,
    projects: [],
    tags: [],
    memberships: [],
    custom_fields: [],
    assignee: null,
    assignee_section: { gid: "456", name: "Tasks" },
    parent: null,
    ...dates,
  };
}

function findElement(element, predicate) {
  if (!element || typeof element !== "object") return;
  if (predicate(element)) return element;
  for (const child of [element.props?.children].flat()) {
    const found = findElement(child, predicate);
    if (found) return found;
  }
}

for (const timeZone of ["America/New_York", "America/Los_Angeles", "UTC", "Asia/Kolkata", "Pacific/Auckland"]) {
  test(timeZone, async (t) => {
    const originalTimeZone = process.env.TZ;
    process.env.TZ = timeZone;
    t.after(() => {
      if (originalTimeZone === undefined) delete process.env.TZ;
      else process.env.TZ = originalTimeZone;
    });
    t.mock.timers.enable({ apis: ["Date"], now: new Date(2026, 9, 2, 12).getTime() });

    await t.test("calendar dates match labels, list accessories, and colors, including DST changes", () => {
      for (const [year, month, day] of [
        [2026, 9, 2],
        [2026, 2, 8],
        [2026, 10, 1],
      ]) {
        t.mock.timers.setTime(new Date(year, month, day, 12).getTime());
        for (const [offset, label, color] of [
          [-1, "Yesterday", colors.raycastColors.red],
          [0, "Today", colors.raycastColors.green],
          [1, "Tomorrow", colors.raycastColors.green],
        ]) {
          const localDate = new Date(year, month, day + offset);
          const task = makeTask({ due_on: format(localDate, "yyyy-MM-dd") });
          assert.equal(getDueDateText(task), label, task.due_on);
          assert.deepEqual(getDueDateColor(task), color, task.due_on);
          const accessory = TaskListItem({ task }).props.accessories[0];
          assert.equal(format(accessory.date, "yyyy-MM-dd"), task.due_on);
          assert.equal(accessory.tooltip, `Due Date: ${format(localDate, "d MMM yyyy")}`);
        }
        assert.equal(
          getDueDateColor(makeTask({ due_on: format(new Date(year, month, day + 7), "yyyy-MM-dd") })),
          "primary",
        );
      }
    });

    await t.test("timestamps retain their local time and take precedence over due_on", () => {
      t.mock.timers.setTime(new Date(2026, 9, 2, 12).getTime());
      const task = makeTask({ due_at: "2026-10-03T02:00:00Z", due_on: "2026-10-03" });
      const expected = {
        "America/New_York": "Today 22:00",
        "America/Los_Angeles": "Today 19:00",
        UTC: "Tomorrow 02:00",
        "Asia/Kolkata": "Tomorrow 07:30",
        "Pacific/Auckland": "Tomorrow 15:00",
      };
      assert.equal(getDueDateText(task), expected[timeZone]);
      assert.deepEqual(getDueDateColor(task), colors.raycastColors.green);
      assert.deepEqual(
        getDueDateColor(makeTask({ due_at: "2026-10-01T00:00:00Z", due_on: "2026-10-01" })),
        colors.raycastColors.red,
      );
      assert.equal(getDueDateText(makeTask()), "No due date");
      assert.equal(getDueDateColor(makeTask()), "primary");
    });

    await t.test("setting and clearing a due date use date-only API values and optimistic updates", async () => {
      const requests = [];
      const toasts = [];
      const updates = [];
      const task = makeTask();
      const tasks = loadSource("api/tasks.ts", {
        "./request": {
          request: async (url, options) => {
            requests.push({ url, ...options });
            return { data: { data: { ...task, ...options.data.data } } };
          },
        },
      });
      const { default: TaskActions } = loadSource("components/TaskActions.tsx", {
        "@raycast/api": { ...api, showToast: async (toast) => toasts.push(toast) },
        "@raycast/utils": {},
        "../api/tasks": tasks,
        "../api/projects": {},
        "../api/tags": {},
        "../hooks/useUsers": {},
        "../hooks/useProjects": {},
        "../hooks/useSections": {},
        "../hooks/useTags": {},
        "../helpers/colors": colors,
        "../helpers/errors": { getErrorMessage: (error) => error.message },
        "./ParentTaskPicker": () => null,
        "./CreateSubtaskForm": () => null,
        "./RenameTaskForm": () => null,
      });
      const actions = TaskActions({
        task,
        mutateList: async (_promise, options) => updates.push(options.optimisticUpdate([task])[0]),
      });
      const submenu = findElement(actions, (element) => element.type?.name === "DueOnSubMenu");
      assert.ok(submenu);
      const picker = submenu.type(submenu.props);
      await picker.props.onChange(new Date(2026, 9, 3));
      assert.equal(requests[0].url, "/tasks/123");
      assert.equal(requests[0].method, "PUT");
      assert.deepEqual(requests[0].data, { data: { due_on: "2026-10-03" } });
      assert.equal(updates[0].due_on, "2026-10-03");
      assert.equal(getDueDateText(updates[0]), "Tomorrow");
      assert.equal(toasts.at(-1).message, "Due on 3 Oct 2026");

      await picker.props.onChange(null);
      assert.deepEqual(requests[1].data, { data: { due_on: null } });
      assert.equal(updates[1].due_on, null);
      assert.equal(getDueDateText(updates[1]), "No due date");
      assert.equal(toasts.at(-1).message, "No due date");
    });
  });
}
