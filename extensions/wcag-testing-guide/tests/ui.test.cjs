const { test } = require("node:test");
const assert = require("node:assert/strict");
const React = require("react");
const { act } = require("react-test-renderer");
const { harness } = require("./helpers/raycast.cjs");

test("pushed summary stays current after two creations, switches, reopening and HTML/PDF actions", async () => {
  const h = harness();
  try {
    const root = await h.mount(React.createElement(h.Command));
    await h.invoke(root, "Open Audit Summary");
    const summary = await h.mount(h.stack.pop());
    for (const name of ["First", "Second"]) {
      await h.invoke(summary, "Create New Audit…");
      const form = await h.mount(h.stack.pop());
      const field = form.root.findByType("Form.TextField");
      if (field.props.onChange) await act(async () => { field.props.onChange(name); });
      const submit = form.root.findByType("Action.SubmitForm");
      await act(async () => { await submit.props.onSubmit({ name }); });
      assert.match(summary.root.findByType("Detail").props.markdown, new RegExp(`Active audit:\\*\\* ${name}`));
    }
    assert.ok(h.action(summary, "Switch to: First"));
    assert.ok(h.action(summary, "Current: Second"));
    await h.invoke(summary, "Switch to: First");
    assert.match(summary.root.findByType("Detail").props.markdown, /Active audit:\*\* First/);
    for (const format of ["HTML", "PDF"]) {
      await h.invoke(summary, `Export ${format} Report`);
      const form = await h.mount(h.stack.pop());
      assert.equal(form.root.findAllByType("Form.TextField").find((node) => node.props.id === "project").props.defaultValue, "First");
      assert.equal(form.root.findByType("Action.SubmitForm").props.title, `Export ${format} Report`);
    }
    await h.invoke(root, "Open Audit Summary");
    const reopened = await h.mount(h.stack.pop());
    assert.match(reopened.root.findByType("Detail").props.markdown, /Active audit:\*\* First/);
    const savedProjects = [...h.data.entries()].find(([key]) => key === "wcag-audit-projects-v1");
    assert.equal(JSON.parse(savedProjects[1]).length, 3);
    assert.equal(h.errors.length, 0);
  } finally { await h.cleanup(); }
});

test("loading and failed reads hide result/export actions and do not overwrite existing data", async () => {
  const h = harness();
  try {
    let release; const gate = new Promise((resolve) => { release = resolve; });
    h.api.LocalStorage.getItem = async () => { await gate; throw new Error("Read failed"); };
    const root = await h.mount(React.createElement(h.Command));
    assert.equal(h.action(root, "Mark as Pass"), undefined);
    assert.equal(h.action(root, "Export HTML Report"), undefined);
    await act(async () => { release(); });
    assert.equal(h.action(root, "Mark as Pass"), undefined);
    assert.equal(h.action(root, "Clear All Results for This WCAG Version"), undefined);
    assert.equal(h.data.size, 0);
    assert.ok(h.errors.length > 0);
  } finally { await h.cleanup(); }
});

test("scope override preserves legacy raw storage and changes only after successful writes", async () => {
  const h = harness();
  const { REVIEW_SCOPE_STORAGE_KEY } = h.load("src/review-scope.ts");
  h.data.set(REVIEW_SCOPE_STORAGE_KEY, "AAA");
  try {
    const root = await h.mount(React.createElement(h.Command));
    assert.ok(h.action(root, "A + AA (Recommended)"));
    await h.invoke(root, "A + AA (Recommended)");
    assert.equal(h.data.get(REVIEW_SCOPE_STORAGE_KEY), "AA");
    h.api.LocalStorage.setItem = async () => { throw new Error("Write failed"); };
    await h.invoke(root, "Level A Only");
    assert.equal(h.data.get(REVIEW_SCOPE_STORAGE_KEY), "AA");
    assert.ok(h.action(root, "A + AA (Recommended) · Current"));
    await h.invoke(root, "Use Default from Preferences");
    assert.equal(h.data.has(REVIEW_SCOPE_STORAGE_KEY), false);
  } finally { await h.cleanup(); }
});

test("a guide opened during loading gains current results and actions without reopening", async () => {
  const h = harness();
  try {
    const { projectStorageKey, AUDIT_PROJECTS_KEY, AUDIT_ACTIVE_PROJECT_KEY } = h.load("src/audit-projects.ts");
    const project = { id: "f24d67de-9f5d-4a91-8179-af54d223b32a", name: "Previously selected", createdAt: "" };
    h.data.set(AUDIT_PROJECTS_KEY, JSON.stringify([project]));
    h.data.set(AUDIT_ACTIVE_PROJECT_KEY, project.id);
    h.data.set(projectStorageKey(project.id, "2.2"), JSON.stringify({ "1.1.1": { status: "fail", notes: "Existing evidence", updatedAt: "" } }));
    let release; const gate = new Promise((resolve) => { release = resolve; });
    const read = h.api.LocalStorage.getItem;
    h.api.LocalStorage.getItem = async (key) => { await gate; return read(key); };
    const root = await h.mount(React.createElement(h.Command));
    await h.invoke(root, "Open Full Guide");
    const guide = await h.mount(h.stack.pop());
    assert.equal(h.action(guide, "Mark as Pass"), undefined);
    assert.equal(guide.root.findByType("Detail").props.isLoading, true);
    await act(async () => { release(); });
    assert.ok(h.action(guide, "Mark as Pass"));
    assert.equal(guide.root.findByType("Detail").props.isLoading, false);
    assert.match(guide.root.findByType("Detail").props.markdown, /Your test result: Fail/);
    assert.match(guide.root.findByType("Detail").props.markdown, /Existing evidence/);
    await h.invoke(guide, "Mark as Pass");
    assert.match(guide.root.findByType("Detail").props.markdown, /Your test result: Pass/);
    assert.equal(JSON.parse(h.data.get(projectStorageKey(project.id, "2.2")))["1.1.1"].status, "pass");
    assert.equal(h.data.has(projectStorageKey("default", "2.2")), false);
    assert.equal(h.errors.length, 0);
  } finally { await h.cleanup(); }
});
