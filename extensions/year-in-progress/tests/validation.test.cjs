const assert = require("node:assert/strict");
const { test } = require("node:test");
const { createLoader } = require("./helpers.cjs");

const { createProgressFormValues, validateProgressForm } = createLoader()("utils/validation.ts");
const { getDefaultProgress } = createLoader()("utils/progress.ts");

const custom = {
  id: "custom:project",
  type: "user",
  title: "Project",
  pinned: true,
  startDate: new Date(2026, 9, 1).getTime(),
  endDate: new Date(2026, 10, 1).getTime(),
  progressNum: 20,
  menubar: { shown: true, title: "Ship" },
  showAsCommand: true,
};

function valid() {
  return {
    title: "Release",
    menubarTitle: "Release",
    startDate: new Date(2026, 9, 7, 12),
    endDate: new Date(2026, 9, 8, 12),
    showInMenubar: false,
    showAsCommand: false,
  };
}

test("new forms start with the next calendar day as a meaningful end", () => {
  const now = new Date(2026, 9, 7, 12, 34, 56);
  const values = createProgressFormValues(undefined, now);
  assert.equal(values.startDate.getTime(), now.getTime());
  assert.equal(values.endDate.getTime(), new Date(2026, 9, 8, 12, 34, 56).getTime());
  assert.equal(values.showInMenubar, false);
  values.title = "Release";
  values.menubarTitle = "Ship";
  assert.deepEqual(Object.keys(validateProgressForm(values, [])), []);
});

test("editing preserves dates, label, selection and hidden-platform menu-bar visibility", () => {
  const values = createProgressFormValues(custom);
  assert.equal(values.title, custom.title);
  assert.equal(values.menubarTitle, custom.menubar.title);
  assert.equal(values.startDate.getTime(), custom.startDate);
  assert.equal(values.endDate.getTime(), custom.endDate);
  assert.equal(values.showInMenubar, true);
  assert.equal(values.showAsCommand, true);
});

test("final validation rejects empty or whitespace-only submitted text", () => {
  const errors = validateProgressForm({ ...valid(), title: " \t ", menubarTitle: "\n " }, []);
  assert.ok(errors.title);
  assert.ok(errors.menubarTitle);
});

test("final validation rejects cleared dates, invalid dates and non-increasing ranges", () => {
  for (const field of ["startDate", "endDate"]) {
    for (const value of [null, new Date(NaN)]) {
      const errors = validateProgressForm({ ...valid(), [field]: value }, []);
      assert.ok(errors[field]);
    }
  }
  const values = valid();
  for (const endDate of [new Date(values.startDate), new Date(values.startDate.getTime() - 1)]) {
    assert.ok(validateProgressForm({ ...values, endDate }, []).endDate);
  }
});

test("duplicate names are checked after trimming and only the edited ID is excluded", () => {
  const values = { ...valid(), title: " Project " };
  assert.ok(validateProgressForm(values, [custom]).title);
  assert.deepEqual(Object.keys(validateProgressForm(values, [custom], custom.id)), []);
  assert.ok(validateProgressForm(values, [custom, { ...custom, id: "custom:other" }], custom.id).title);
  assert.ok(validateProgressForm({ ...valid(), title: "Year In Progress" }, getDefaultProgress()).title);
  assert.deepEqual(Object.keys(validateProgressForm({ ...valid(), title: " project " }, [custom])), []);
});
