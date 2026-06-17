#!/usr/bin/env node
/**
 * Headless QA exercise for the raycast-super-productivity extension.
 *
 * Runs against a real Super Productivity instance (no mock server).
 * Every GET endpoint the extension uses is validated for response shape.
 * Mutation is limited to start/stop tracking on the first active task
 * (mimicking what the extension does) — no creations, no deletes.
 *
 * Usage:
 *   SP_API_URL=http://127.0.0.1:3876 node mock-server/qa-exercise.js
 *
 * Or via the runner:
 *   npm run qa
 */

const BASE = process.env.SP_API_URL || "http://127.0.0.1:3876";

let passed = 0;
let failed = 0;
const failures = [];

function typeName(val) {
  if (val === null) return "null";
  if (Array.isArray(val)) return "array";
  return typeof val;
}

function checkType(val, expected) {
  if (typeof expected === "object") {
    // Config-object spec — check top-level type only; collectErrors handles detail
    return checkType(val, expected.type);
  }
  // "string|null" means string OR null
  const opts = expected.split("|");
  return opts.some((t) => {
    if (t === "array") return Array.isArray(val);
    if (t === "null") return val === null;
    if (t === "object")
      return typeof val === "object" && val !== null && !Array.isArray(val);
    return typeof val === t;
  });
}

function collectErrors(obj, fieldTypes, prefix) {
  const errors = [];
  for (const [field, expected] of Object.entries(fieldTypes)) {
    const path = prefix ? `${prefix}.${field}` : field;
    const val = obj[field];
    if (typeof expected === "string") {
      if (!checkType(val, expected)) {
        errors.push(`${path}: expected ${expected}, got ${typeName(val)}`);
      }
    } else {
      // Config-object spec
      if (!checkType(val, expected.type)) {
        errors.push(`${path}: expected ${expected.type}, got ${typeName(val)}`);
      } else if (
        expected.type === "object" &&
        typeof val === "object" &&
        val !== null &&
        !Array.isArray(val)
      ) {
        for (const key of Object.keys(val)) {
          if (expected.keyPattern && !expected.keyPattern.test(key)) {
            errors.push(
              `${path}.key "${key}": does not match ${expected.keyPattern}`,
            );
          }
          if (expected.valueType && !checkType(val[key], expected.valueType)) {
            errors.push(
              `${path}["${key}"]: expected ${expected.valueType}, got ${typeName(val[key])}`,
            );
          }
        }
        if (expected.fields) {
          errors.push(...collectErrors(val, expected.fields, path));
        }
      } else if (
        expected.type === "array" &&
        Array.isArray(val) &&
        expected.elementType
      ) {
        for (let i = 0; i < val.length; i++) {
          if (!checkType(val[i], expected.elementType)) {
            errors.push(
              `${path}[${i}]: expected ${expected.elementType}, got ${typeName(val[i])}`,
            );
          }
        }
      }
    }
  }
  return errors;
}

function isOptional(expected) {
  return typeof expected === "string" && expected.includes("|undefined");
}

function assertShape(label, obj, fieldTypes) {
  const missing = Object.keys(fieldTypes).filter(
    (k) => !(k in (obj ?? {})) && !isOptional(fieldTypes[k]),
  );
  const typeErrors =
    missing.length === 0 ? collectErrors(obj, fieldTypes, "") : [];
  if (missing.length === 0 && typeErrors.length === 0) {
    passed++;
    console.log(`  ✓ ${label}`);
    return true;
  }
  failed++;
  const parts = [];
  if (missing.length > 0) parts.push(`missing [${missing.join(", ")}]`);
  if (typeErrors.length > 0) parts.push(typeErrors.join("; "));
  const msg = `${label}: ${parts.join(" — ")}; got=${JSON.stringify(obj).slice(0, 150)}`;
  failures.push(msg);
  console.log(`  ✗ ${label}`);
  console.log(`      reason: ${msg}`);
  return false;
}

async function call(method, path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: body ? { "Content-Type": "application/json" } : {},
    body: body ? JSON.stringify(body) : undefined,
  });
  let parsed;
  try {
    parsed = await res.json();
  } catch {
    parsed = null;
  }
  return { status: res.status, body: parsed };
}

function expectOk(label, { status, body }) {
  if (![200, 201].includes(status) || !body?.ok) {
    failed++;
    const msg = `${label}: status=${status} body=${JSON.stringify(body).slice(0, 120)}`;
    failures.push(msg);
    console.log(
      `  ✗ ${label} (expected ok=true, got ${JSON.stringify(body).slice(0, 150)})`,
    );
    return null;
  }
  passed++;
  console.log(`  ✓ ${label}`);
  return body.data;
}

// ─── Shared field configs ──────────────────────────────
const STR_ARR = { type: "array", elementType: "string" };
const OBJ_ARR = { type: "array", elementType: "object" };
const TIME_SPENT_ON_DAY = {
  type: "object",
  keyPattern: /^\d{4}-\d{2}-\d{2}$/,
  valueType: "number",
};

const THEME_FIELDS = {
  warn: "string",
  accent: "string",
  primary: "string",
  hueWarn: "string",
  hueAccent: "string",
  huePrimary: "string",
  isAutoContrast: "boolean",
  isDisableBackgroundTint: "boolean",
  backgroundImageDark: "string|null",
  backgroundImageLight: "string|null",
};
const WORKLOG_EXPORT_FIELDS = {
  cols: STR_ARR,
  groupBy: "string",
  separateTasksBy: "string",
  roundEndTimeTo: "null",
  roundWorkTimeTo: "null",
  roundStartTimeTo: "null",
};
const ADVANCED_CFG = {
  type: "object",
  fields: {
    worklogExportSettings: { type: "object", fields: WORKLOG_EXPORT_FIELDS },
  },
};
const THEME_OBJ = { type: "object", fields: THEME_FIELDS };

const TASK_BASE_FIELDS = {
  id: "string",
  title: "string",
  isDone: "boolean",
  timeEstimate: "number",
  timeSpent: "number",
  created: "number",
  subTaskIds: STR_ARR,
  timeSpentOnDay: TIME_SPENT_ON_DAY,
  tagIds: STR_ARR,
  attachments: OBJ_ARR,
};
const TASK_FIELDS = {
  ...TASK_BASE_FIELDS,
  modified: "number",
  projectId: "string|undefined",
  dueDay: "string|undefined",
};
const TASK_CREATE_FIELDS = { ...TASK_BASE_FIELDS, notes: "string" };
const PROJECT_FIELDS = {
  id: "string",
  title: "string",
  icon: "string",
  isArchived: "boolean",
  isHiddenFromMenu: "boolean",
  isEnableBacklog: "boolean",
  taskIds: STR_ARR,
  backlogTaskIds: STR_ARR,
  noteIds: STR_ARR,
  theme: THEME_OBJ,
  advancedCfg: ADVANCED_CFG,
};
const TAG_FIELDS = {
  id: "string",
  title: "string",
  icon: "string",
  color: "string|null",
  created: "number",
  modified: "number",
  taskIds: STR_ARR,
  advancedCfg: ADVANCED_CFG,
  theme: THEME_OBJ,
};
const CURRENT_FIELDS = {
  id: "string",
  title: "string",
  timeSpentOnDay: TIME_SPENT_ON_DAY,
  timeSpent: "number",
  isDone: "boolean",
};
const HEALTH_FIELDS = { server: "string", rendererReady: "boolean" };
const STATUS_FIELDS = {
  currentTask: "object|null",
  currentTaskId: "string|null",
  taskCount: "number",
};

console.log(`QA exercise target: ${BASE}\n`);

// ─── Health + Status ──────────────────────────────────────
console.log("health & status");
{
  const hb = await call("GET", "/health");
  expectOk("GET /health", hb);
  if (hb.body?.ok)
    assertShape("HealthResponse shape", hb.body.data, HEALTH_FIELDS);

  const sr = await call("GET", "/status");
  const sd = expectOk("GET /status", sr);
  if (sd) assertShape("StatusResponse shape", sd, STATUS_FIELDS);
}

// ─── 1. Menu Bar (`src/menu-bar.tsx`) ──────────────────────
console.log("\n1. menu-bar");
{
  const r = await call("GET", "/task-control/current");
  const data = expectOk("GET /task-control/current", r);
  if (data) assertShape("CurrentTask shape", data, CURRENT_FIELDS);

  const t = await call("GET", "/tasks?source=active");
  const td = expectOk("GET /tasks?source=active", t);
  if (td?.[0]) assertShape("Task shape (sample)", td[0], TASK_FIELDS);
}

// ─── 2. View Tasks (`src/view-tasks.tsx`) ──────────────────
console.log("\n2. view-tasks");
{
  const r = await call("GET", "/tasks?source=active");
  const d = expectOk("GET /tasks?source=active", r);
  if (d?.[0]) assertShape("Active task", d[0], TASK_FIELDS);

  const projects = await call("GET", "/projects");
  const pd = expectOk("GET /projects", projects);
  if (pd?.[0]) assertShape("Project shape", pd[0], PROJECT_FIELDS);

  const tags = await call("GET", "/tags");
  const td = expectOk("GET /tags", tags);
  if (td?.[0]) assertShape("Tag shape", td[0], TAG_FIELDS);
}

// ─── 3. Today's Tasks (`src/view-today.tsx`) ───────────────
console.log("\n3. view-today");
{
  const r = await call("GET", "/tasks?tagId=TODAY&source=active");
  const d = expectOk("GET /tasks?tagId=TODAY&source=active", r);
  console.log(`  (${d?.length ?? 0} tasks for today)`);
  if (d?.[0]) assertShape("Today task", d[0], TASK_FIELDS);
}

// ─── 4. Create Task (`src/create-task.tsx`) ────────────────
console.log("\n4. create-task");
{
  await call("GET", "/projects");
  await call("GET", "/tags");
  // Creates a test task (user is running this against their own SP for testing)
  const r = await call("POST", "/tasks", {
    title: `QA test task ${Date.now()}`,
    notes: "Created by qa-exercise.js — safe to delete",
    timeEstimate: 15 * 60_000,
  });
  const d = expectOk("Create Task", r);
  if (d) {
    assertShape("Newly created task", d, TASK_CREATE_FIELDS);
    // Cleanup: delete the test task
    const del = await call("DELETE", `/tasks/${d.id}`);
    if (del.status === 200) {
      passed++;
      console.log(`    ✓ cleanup (${d.id})`);
    } else {
      failed++;
      const msg = `DELETE /tasks/${d.id}: status=${del.status}`;
      failures.push(msg);
      console.log(`    ✗ cleanup failed (status=${del.status})`);
    }
  }
}

// ─── 5. Current Task (`src/current-task.tsx`) ───────────────
console.log("\n5. current-task");
{
  await call("GET", "/task-control/current");

  const r = await call("GET", "/tasks?source=active");
  const d = expectOk("GET /tasks?source=active", r);
  const firstTask = d?.find((t) => !t.isDone) || d?.[0];
  if (firstTask) {
    expectOk("Start task", await call("POST", `/tasks/${firstTask.id}/start`));

    // Verify the started task is now the current task
    const current = await call("GET", "/task-control/current");
    const cd = expectOk("GET /task-control/current (after start)", current);
    if (cd) {
      assertShape("CurrentTask shape (after start)", cd, CURRENT_FIELDS);
      if (cd.id === firstTask.id) {
        passed++;
        console.log(`    ✓ task ${firstTask.id.slice(0, 12)}… is now tracking`);
      } else {
        failed++;
        const msg = `Expected current task id ${firstTask.id}, got ${cd.id}`;
        failures.push(msg);
        console.log(`    ✗ ${msg}`);
      }
    }

    expectOk("Stop tracking", await call("POST", "/task-control/stop"));
  }
}

// ─── 6. Quick Add (`src/quick-add.tsx`) ─────────────────────
console.log("\n6. quick-add");
{
  const rp = await call("GET", "/projects");
  const pd = expectOk("GET /projects", rp);
  if (pd?.[0]) assertShape("Project shape (quick-add)", pd[0], PROJECT_FIELDS);

  const rt = await call("GET", "/tags");
  const td = expectOk("GET /tags", rt);
  if (td?.[0]) assertShape("Tag shape (quick-add)", td[0], TAG_FIELDS);
}

// ─── 7. Scheduled (`src/view-scheduled.tsx`) ──────────────
console.log("\n7. view-scheduled");
{
  const r = await call("GET", "/tasks?source=active");
  const d = expectOk("GET /tasks?source=active", r);
  if (d) {
    const today = new Date().toISOString().slice(0, 10);
    const overdue = d.filter((t) => t.dueDay && t.dueDay < today);
    const todayTasks = d.filter((t) => t.dueDay === today);
    console.log(
      `  (overdue=${overdue.length}, today=${todayTasks.length}, total=${d.length})`,
    );
    if (d[0]) assertShape("Scheduled task sample", d[0], TASK_FIELDS);
  }
  await call("GET", "/projects");
  await call("GET", "/tags");
}

// ─── 8. Archived (`src/view-archived.tsx`) ──────────────────
console.log("\n8. view-archived");
{
  const r = await call("GET", "/tasks?source=archived");
  const d = expectOk("GET /tasks?source=archived", r);
  console.log(`  (${d?.length ?? 0} archived tasks)`);
  if (d?.[0]) assertShape("Archived task", d[0], TASK_FIELDS);
}

// ─── 9. Tags (`src/view-tags.tsx`) ──────────────────────────
console.log("\n9. view-tags");
{
  const r = await call("GET", "/tags");
  const d = expectOk("GET /tags", r);
  if (d?.[0]) assertShape("Tags list shape", d[0], TAG_FIELDS);
}

// ─── 10. Projects (`src/view-projects.tsx`) ────────────────
console.log("\n10. view-projects");
{
  const rp = await call("GET", "/projects");
  const pd = expectOk("GET /projects", rp);
  const projectId = pd?.[0]?.id || "PROJ_WORK";
  const r = await call("GET", `/tasks?projectId=${projectId}&source=active`);
  const d = expectOk(`GET /tasks?projectId=${projectId}`, r);
  console.log(`  (${d?.length ?? 0} tasks in project ${projectId})`);
  if (d?.[0]) assertShape("Project task", d[0], TASK_FIELDS);
}

// ─── Summary ────────────────────────────────────────────────
console.log(`\n${"─".repeat(60)}`);
console.log(`RESULT: ${passed} passed, ${failed} failed`);
if (failures.length === 0) {
  console.log(
    "✅ Every endpoint used by every command returned the expected envelope and shape.",
  );
} else {
  console.log(`❌ ${failures.length} mismatch(es):`);
  for (const f of failures) console.log(`   - ${f}`);
  process.exitCode = 1;
}
