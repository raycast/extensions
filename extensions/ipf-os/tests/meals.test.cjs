const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { test } = require("node:test");
const ts = require("typescript");

const root = path.resolve(__dirname, "..");
const reference = Date.parse("2026-11-26T09:00:00+03:00");
class Clock extends Date {
  constructor(...args) {
    super(...(args.length ? args : [reference]));
  }
  static now() {
    return reference;
  }
}

function harness(overrides = {}) {
  const cache = new Map();
  const storage = new Map();
  const launched = [];
  const native = {
    environment: { launchType: "user" },
    LaunchType: { Background: "background", UserInitiated: "user" },
    getPreferenceValues: () => ({ baseUrl: "https://gateway.test/api/v1", webAppUrl: "https://web.test" }),
    LocalStorage: {
      getItem: async (key) => storage.get(key),
      setItem: async (key, value) => storage.set(key, value),
      removeItem: async (key) => storage.delete(key),
      allItems: async () => Object.fromEntries(storage),
    },
    Cache: class {
      clear() {}
    },
    launchCommand: async (input) => launched.push(input),
  };
  const mocks = {
    "@raycast/api": native,
    "src/lib/auth/index.ts": {
      getAuthProvider: () => ({
        getSession: async () => ({ subject: "employee-1" }),
        getAccessToken: async () => "test-token",
        invalidateAccessToken: async () => undefined,
      }),
    },
    ...overrides,
  };
  function load(file) {
    if (Object.hasOwn(mocks, file)) return mocks[file];
    if (cache.has(file)) return cache.get(file);
    const exports = {};
    cache.set(file, exports);
    const source = ts.transpileModule(fs.readFileSync(path.join(root, file), "utf8"), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2023, jsx: ts.JsxEmit.ReactJSX },
      fileName: file,
    }).outputText;
    vm.runInNewContext(
      source,
      {
        exports,
        Date: Clock,
        URL,
        console,
        process,
        fetch:
          overrides.fetch ??
          (() => {
            throw new Error("Unexpected network call");
          }),
        require(name) {
          if (Object.hasOwn(mocks, name)) return mocks[name];
          if (!name.startsWith(".")) return require(name);
          const relative = path.relative(root, path.resolve(root, path.dirname(file), name));
          const found = [relative + ".ts", relative + ".tsx", path.join(relative, "index.ts")].find((file) =>
            fs.existsSync(path.join(root, file)),
          );
          assert.ok(found, `Cannot resolve ${name} from ${file}`);
          return load(found);
        },
      },
      { filename: file },
    );
    return exports;
  }
  return { load, storage, launched };
}

const options = [
  { day: 1, id: "10", name: "Rice", role: "main", special: false, description: null, note: null },
  { day: 1, id: "11", name: "Pilau", role: "main", special: true, description: null, note: null },
  { day: 1, id: "20", name: "Beans", role: "side", special: false, description: null, note: null },
  { day: 1, id: "21", name: "Vegetables", role: "side", special: false, description: null, note: null },
  { day: 2, id: "22", name: "Tuesday Side", role: "side", special: false, description: null, note: null },
];
const target = { id: "9", week_start: "2026-11-30T00:00:00.000Z" };
const window = {
  phase: "OPEN",
  canSubmit: true,
  weeklyPlanId: "9",
  userAvailable: true,
  reason: null,
  overrideActive: false,
  override: null,
  opensAt: "2026-11-27T07:00:00+03:00",
  closesAt: "2026-11-27T17:00:00+03:00",
  graceClosesAt: "2026-11-27T17:30:00+03:00",
  nextWindowOpen: "2026-11-27T07:00:00+03:00",
};
const saved = {
  id: "100",
  weekly_plan_id: "9",
  week_start: target.week_start,
  submitted_at: "2026-11-27T08:00:00Z",
  items: [{ day: 1, main_id: "10", side_id: "20", main_name: "Rice", side_name: "Beans" }],
};
const dashboard = (selection = null) => ({
  windowStatus: { ...window },
  nextWeekPlan: target,
  myNextSelection: selection,
  myCurrentSelection: null,
});
function api(overrides = {}) {
  return {
    getMealsDashboard: async () => dashboard(),
    getMealOptions: async () => options,
    getMealCompatibility: async () => [],
    getMealsProfile: async () => ({ id: "44", isAvailableNextWeek: true, reminders: true, reminder_channel: "email" }),
    getMealsMenu: async () => ({ ...target, items: options }),
    getMealsHistory: async () => [],
    getNextMealSelection: async () => null,
    getAbsences: async () => [],
    getPopularMeals: async () => ({ selections: [{ day: 1, main_id: "10", side_id: "20" }] }),
    getRecentMeals: async () => ({
      valid: [{ day: 1, main: { id: "10", name: "Rice" }, side: null }],
      invalid: [{ day: 2, reason: "Not offered" }],
      notSelected: [3, 4, 5],
      matchPercentage: 50,
    }),
    saveMealSelection: async () => saved,
    ...overrides,
  };
}
function completeDraft(planning, selection = null) {
  const draft = planning.createDraft(target, selection);
  draft.days = draft.days.map((day) =>
    day.day === 1
      ? { day: 1, state: "selected", mainId: "10", sideId: "20" }
      : { day: day.day, state: "skipped", mainId: null, sideId: null },
  );
  return draft;
}

function plain(value) {
  return JSON.parse(JSON.stringify(value));
}

test("Meals decodes plain production-shaped responses without changing ticket envelopes", async () => {
  const calls = [];
  const h = harness({
    fetch: async (url, request) => {
      calls.push({ url, request });
      return {
        ok: true,
        status: 200,
        text: async () =>
          JSON.stringify({ id: "44", isAvailableNextWeek: true, reminders: true, reminder_channel: "email" }),
      };
    },
  });
  const profile = await h.load("src/lib/api/meals.ts").getMealsProfile();
  assert.equal(profile.id, "44");
  assert.equal(calls[0].url, "https://gateway.test/api/v1/staff/profile");
  assert.equal(calls[0].request.headers.Authorization, "Bearer test-token");
  assert.equal(h.load("src/lib/api/envelope.ts").unwrap({ data: { ticket: "1" } }).ticket, "1");
  const schemas = h.load("src/lib/meals/schemas.ts");
  assert.equal(schemas.profileSchema.safeParse({ ...profile, isAvailableNextWeek: "true" }).success, false);
});

test("Meals JSON error messages reach the employee", () => {
  const { toApiError } = harness().load("src/lib/api/errors.ts");
  assert.equal(
    toApiError(409, { error: "The selection window is closed" }, "Conflict").message,
    "The selection window is closed",
  );
});

test("main-side choices respect day menus, allow lists, denials and complete dishes", () => {
  const p = harness().load("src/lib/meals/planning.ts");
  assert.deepEqual(plain(p.compatibleSides(1, "10", options, []).map((side) => side.id)), ["20", "21"]);
  const rules = [
    { main_meal_id: "10", side_meal_id: "20", allowed: true },
    { main_meal_id: "10", side_meal_id: "21", allowed: false },
  ];
  assert.deepEqual(plain(p.compatibleSides(1, "10", options, rules).map((side) => side.id)), ["20"]);
  assert.equal(
    p.choiceIssue({ day: 1, state: "selected", mainId: "11", sideId: "20" }, options, []),
    "Complete dishes cannot have a side",
  );
  assert.equal(
    p.choiceIssue({ day: 1, state: "selected", mainId: "10", sideId: "22" }, options, []),
    "Choose an available, compatible side",
  );
  assert.equal(p.choiceIssue({ day: 1, state: "selected", mainId: "10", sideId: null }, options, []), undefined);
  assert.match(
    p.choiceIssue({ day: 1, state: "unselected", mainId: null, sideId: null }, options, []),
    /explicitly skip/,
  );
});

test("drafts distinguish initial choices, saved skips and unavailable days", () => {
  const p = harness().load("src/lib/meals/planning.ts");
  const fresh = p.createDraft(target, null);
  assert.equal(fresh.days[1].state, "unselected");
  assert.equal(p.createDraft(target, saved).days[1].state, "skipped");
  assert.deepEqual(plain(p.draftIssues(fresh, options, []).map((issue) => issue.day)), [1]);
  assert.equal(p.choiceLabel(fresh.days[4], options), "No menu available");
});

test("EAT dates and absence cutoffs work at midnight, Monday rollover and exactly 08:00", () => {
  const p = harness().load("src/lib/meals/planning.ts");
  assert.equal(p.eatToday(new Date("2026-11-29T21:01:00Z")), "2026-11-30");
  assert.equal(p.currentMonday(new Date("2026-11-29T21:01:00Z")), "2026-11-30");
  assert.equal(p.absenceIsLate("2026-11-26", new Date("2026-11-26T04:59:59Z")), false);
  assert.equal(p.absenceIsLate("2026-11-26", new Date("2026-11-26T05:00:00Z")), true);
  assert.equal(p.validAbsenceDate("2026-02-30"), false);
  assert.equal(p.validAbsenceDate("2026-11-25"), false);
  assert.equal(p.validAbsenceDate("2026-11-26"), true);
});

test("drafts survive reopening, stay isolated by account and environment, and clear on sign-out", async () => {
  let refreshes = 0;
  const h = harness({ "src/lib/meals/status.ts": { refreshMealsStatus: async () => refreshes++ } });
  const drafts = h.load("src/lib/meals/drafts.ts");
  const draft = completeDraft(h.load("src/lib/meals/planning.ts"));
  await drafts.writeMealDraft("production|employee-1", draft);
  assert.deepEqual(plain(await drafts.readMealDraft("production|employee-1", "9")), plain(draft));
  assert.equal(await drafts.readMealDraft("staging|employee-1", "9"), null);
  assert.equal(await drafts.readMealDraft("production|employee-2", "9"), null);
  assert.equal(await drafts.readMealDraft("production|employee-1", "10"), null);
  h.storage.set("unrelated", "kept");
  await h.load("src/lib/auth/token-store.ts").clearSession();
  assert.equal(await drafts.readMealDraft("production|employee-1", "9"), null);
  assert.equal(h.storage.get("unrelated"), "kept");
  assert.equal(refreshes, 0);
});

test("recent and popular quick-fill only preview and leave missing choices unresolved", async () => {
  let writes = 0;
  const h = harness({
    "src/lib/api/meals.ts": api({
      saveMealSelection: async () => {
        writes++;
      },
    }),
  });
  const p = h.load("src/lib/meals/planning.ts");
  const service = h.load("src/lib/meals/service.ts");
  const recent = await service.fillMealDraft(p.createDraft(target, null), "recent");
  assert.equal(recent.days[0].mainId, "10");
  assert.equal(recent.days[1].state, "unselected");
  assert.equal(recent.warnings[0].message, "Not offered");
  assert.equal((await service.fillMealDraft(p.createDraft(target, null), "popular")).days[0].sideId, "20");
  await assert.rejects(
    () => service.fillMealDraft({ ...recent, weekStart: "2026-11-23" }, "recent"),
    /next week's menu only/,
  );
  assert.equal(writes, 0);
});

for (const scenario of ["closed", "target-changed", "saved-changed", "meal-removed"]) {
  test(`submission revalidates ${scenario} before any write`, async () => {
    let writes = 0;
    const state = dashboard(scenario === "saved-changed" ? saved : null);
    if (scenario === "closed") {
      state.windowStatus.canSubmit = false;
      state.windowStatus.reason = "The selection window is closed";
    }
    if (scenario === "target-changed") state.nextWeekPlan = { id: "10", week_start: "2026-12-07" };
    const h = harness({
      "src/lib/api/meals.ts": api({
        getMealsDashboard: async () => state,
        getMealOptions: async () => (scenario === "meal-removed" ? [] : options),
        saveMealSelection: async () => {
          writes++;
          return saved;
        },
      }),
    });
    const draft = completeDraft(h.load("src/lib/meals/planning.ts"));
    await assert.rejects(() => h.load("src/lib/meals/service.ts").submitMealDraft(draft));
    assert.equal(writes, 0);
  });
}

test("a lost successful write response is reconciled without resubmitting", async () => {
  let reads = 0,
    writes = 0;
  const h = harness({
    "src/lib/api/meals.ts": api({
      getMealsDashboard: async () => dashboard(++reads === 1 ? null : saved),
      saveMealSelection: async () => {
        writes++;
        throw new TypeError("Connection dropped");
      },
    }),
  });
  const draft = completeDraft(h.load("src/lib/meals/planning.ts"));
  const result = await h.load("src/lib/meals/service.ts").submitMealDraft(draft);
  assert.equal(result.id, "100");
  assert.equal(writes, 1);
  assert.equal(reads, 2);
});

test("an uncertain write remains unconfirmed and does not destroy the draft", async () => {
  let writes = 0;
  const h = harness({
    "src/lib/api/meals.ts": api({
      saveMealSelection: async () => {
        writes++;
        throw new TypeError("Connection dropped");
      },
    }),
  });
  const draft = completeDraft(h.load("src/lib/meals/planning.ts"));
  const before = JSON.stringify(draft);
  await assert.rejects(() => h.load("src/lib/meals/service.ts").submitMealDraft(draft), /Could not confirm submission/);
  assert.equal(JSON.stringify(draft), before);
  assert.equal(writes, 1);
});

test("AI confirmation shows concrete meals; execution only creates a local draft and opens review", async () => {
  let writes = 0;
  const h = harness({
    "src/lib/api/meals.ts": api({
      saveMealSelection: async () => {
        writes++;
        return saved;
      },
    }),
  });
  const tool = h.load("src/tools/prepare-meal-plan.ts");
  const input = {
    weeklyPlanId: "9",
    expectedSavedAt: "",
    choices: [1, 2, 3, 4, 5].map((day) =>
      day === 1 ? { day, mainMealId: "10", sideMealId: "20" } : { day, skip: true },
    ),
  };
  const confirmation = await tool.confirmation(input);
  assert.equal(confirmation.info[1].value, "Rice · Beans");
  assert.match(confirmation.message, /No meals will be submitted/);
  assert.equal(h.storage.size, 0);
  const result = await tool.default(input);
  assert.equal(result.submitted, false);
  assert.equal(result.draftPrepared, true);
  assert.equal(writes, 0);
  assert.equal(h.storage.size, 1);
  assert.equal(h.launched[0].name, "plan-my-meals");
  assert.equal(h.launched[0].context.review, true);
});

test("AI refuses stale saved state, repeated weekdays and incompatible choices before confirmation", async () => {
  const h = harness({ "src/lib/api/meals.ts": api({ getMealsDashboard: async () => dashboard(saved) }) });
  const tool = h.load("src/tools/prepare-meal-plan.ts");
  const input = {
    weeklyPlanId: "9",
    expectedSavedAt: "",
    choices: [1, 2, 3, 4, 5].map((day) => ({ day, skip: true })),
  };
  await assert.rejects(() => tool.confirmation(input), /saved selection changed/);
  await assert.rejects(
    () =>
      tool.confirmation({
        ...input,
        expectedSavedAt: saved.submitted_at,
        choices: [1, 1, 3, 4, 5].map((day) => ({ day, skip: true })),
      }),
    /every weekday/,
  );
  await assert.rejects(
    () =>
      tool.confirmation({
        ...input,
        expectedSavedAt: saved.submitted_at,
        choices: input.choices.map((day) => (day.day === 1 ? { day: 1, mainMealId: "11", sideMealId: "20" } : day)),
      }),
    /Complete dishes/,
  );
  assert.equal(h.storage.size, 0);
  assert.equal(h.launched.length, 0);
});

test("AI lunch lookup reads saved choices without inventing consumption or changing meals", async () => {
  const monday = "2026-11-30";
  const h = harness({ "src/lib/api/meals.ts": api({ getMealsDashboard: async () => dashboard(saved) }) });
  const result = await h.load("src/tools/get-my-meals.ts").default({ date: monday });
  assert.equal(result.status, "selected");
  assert.equal(result.meal.main, "Rice");
  assert.match(result.note, /not proof of collection/);
  assert.equal(h.storage.size, 0);
});

function uiHarness(file, exportName, props, apiOverrides = {}, confirm = true, cached = {}, moduleOverrides = {}) {
  const state = [];
  let cursor = 0;
  const toasts = [];
  let pops = 0;
  const pushed = [];
  const confirmations = [];
  const Form = Object.assign(() => {}, {
    Dropdown: Object.assign(() => {}, { Item: "DropdownItem" }),
    Description: "Description",
    Checkbox: "Checkbox",
    TextArea: "TextArea",
    TextField: "TextField",
    Separator: "Separator",
  });
  const List = Object.assign(() => {}, {
    Item: Object.assign(() => {}, { Detail: "ListDetail" }),
    Section: "Section",
    EmptyView: "EmptyView",
  });
  const h = harness({
    "@raycast/api": {
      Form,
      getPreferenceValues: () => ({ baseUrl: "https://gateway.test/api/v1", webAppUrl: "https://web.test" }),
      List,
      Detail: "Detail",
      Color: {},
      Keyboard: { Shortcut: { Common: {} } },
      Action: Object.assign(() => {}, {
        SubmitForm: "SubmitForm",
        Push: "Push",
        OpenInBrowser: "OpenInBrowser",
        Style: { Destructive: "destructive" },
      }),
      ActionPanel: Object.assign(() => {}, { Section: "ActionSection" }),
      Alert: { ActionStyle: { Destructive: "destructive" } },
      Icon: {},
      Toast: { Style: { Animated: "animated", Success: "success", Failure: "failure" } },
      showToast: async (toast) => {
        toasts.push(toast);
        return toast;
      },
      confirmAlert: async (options) => {
        confirmations.push(options);
        return confirm;
      },
      useNavigation: () => ({ pop: () => pops++, push: (node) => pushed.push(node) }),
    },
    "react/jsx-runtime": { jsx: (type, props) => ({ type, props }), jsxs: (type, props) => ({ type, props }) },
    react: {
      useRef: (current) => ({ current }),
      useEffect: () => {},
      useState: (value) => {
        const i = cursor++;
        if (!(i in state)) state[i] = value;
        return [state[i], (next) => (state[i] = typeof next === "function" ? next(state[i]) : next)];
      },
    },
    "@raycast/utils": {
      useCachedPromise: (fn) => ({
        data: undefined,
        isLoading: false,
        revalidate: () => {},
        mutate: async () => {},
        ...cached[fn.name],
      }),
    },
    "src/lib/api/meals.ts": api(apiOverrides),
    "src/lib/meals/status.ts": { refreshMealsStatus: async () => {} },
    ...moduleOverrides,
  });
  const component = h.load(file)[exportName];
  return {
    render: () => {
      cursor = 0;
      return component(props);
    },
    toasts,
    pushed,
    confirmations,
    pops: () => pops,
  };
}
function uiNodes(node) {
  if (!node || typeof node !== "object") return [];
  if (Array.isArray(node)) return node.flatMap(uiNodes);
  return node.props ? [node, ...Object.values(node.props).flatMap(uiNodes)] : [];
}
const formControl = (tree, id) => uiNodes(tree).find((node) => node.props.id === id)?.props;
const formSubmit = (tree) => uiNodes(tree).find((node) => node.type === "SubmitForm").props.onSubmit;

test("day editor clears a stale side when a complete main is selected and only applies locally", async () => {
  const applied = [];
  const ui = uiHarness("src/views/meals/day-editor.tsx", "MealDayEditor", {
    choice: { day: 1, state: "selected", mainId: "10", sideId: "20" },
    options,
    rules: [],
    onApply: async (choice) => applied.push(choice),
  });
  formControl(ui.render(), "main").onChange("11");
  const tree = ui.render();
  assert.equal(formControl(tree, "side"), undefined);
  assert.ok(uiNodes(tree).some((node) => node.props.title === "Complete Dish"));
  await formSubmit(tree)();
  assert.deepEqual(plain(applied[0]), { day: 1, state: "selected", mainId: "11", sideId: null });
  assert.equal(ui.pops(), 1);
});

test("cancelling the availability confirmation makes no preference or selection writes", async () => {
  let writes = 0;
  const ui = uiHarness(
    "src/views/meals/preferences.tsx",
    "MealPreferences",
    {
      profile: { id: "44", isAvailableNextWeek: true, reminders: true, reminder_channel: "email" },
      onSaved() {},
    },
    {
      getNextMealSelection: async () => saved,
      setMealAvailability: async () => writes++,
      setMealReminders: async () => writes++,
    },
    false,
  );
  formControl(ui.render(), "available").onChange(false);
  formControl(ui.render(), "reminders").onChange(false);
  await formSubmit(ui.render())();
  assert.equal(writes, 0);
  assert.equal(ui.pops(), 0);
  assert.equal(ui.toasts.length, 0);
});

test("partial preference failure is explicit and retry does not repeat an availability cancellation", async () => {
  let availabilityWrites = 0,
    reminderWrites = 0,
    refreshed = 0;
  const profile = { id: "44", isAvailableNextWeek: true, reminders: true, reminder_channel: "email" };
  const ui = uiHarness(
    "src/views/meals/preferences.tsx",
    "MealPreferences",
    { profile, onSaved: () => refreshed++ },
    {
      setMealAvailability: async () => {
        availabilityWrites++;
        return { success: true, user: { ...profile, isAvailableNextWeek: false } };
      },
      setMealReminders: async () => {
        if (++reminderWrites === 1) throw new Error("Reminder service unavailable");
        return { success: true, user: { ...profile, isAvailableNextWeek: false, reminders: false } };
      },
    },
  );
  formControl(ui.render(), "available").onChange(false);
  formControl(ui.render(), "reminders").onChange(false);
  await formSubmit(ui.render())();
  assert.match(ui.toasts.at(-1).title, /Availability saved; reminders not confirmed/);
  assert.equal(ui.pops(), 0);
  assert.equal(refreshed, 1);
  await formSubmit(ui.render())();
  assert.equal(availabilityWrites, 1);
  assert.equal(reminderWrites, 2);
  assert.equal(ui.pops(), 1);
});

test("absence confirmation reports the server's late classification", async () => {
  let notices = 0;
  const ui = uiHarness(
    "src/views/meals/absence.tsx",
    "MealAbsenceForm",
    { date: "2026-11-27", onSaved() {} },
    {
      notifyAbsence: async () => {
        notices++;
        return { date: "2026-11-27", notifiedAt: "2026-11-27T08:00:00+03:00", onTime: false, reason: "Meeting" };
      },
    },
  );
  await formSubmit(ui.render())({ reason: "Meeting" });
  assert.equal(notices, 1);
  assert.equal(ui.toasts.at(-1).title, "Absence recorded late");
  assert.equal(ui.pops(), 1);
});

test("a gateway 502 after commit is reconciled against the saved selection", async () => {
  let reads = 0,
    writes = 0;
  let h;
  h = harness({
    "src/lib/api/meals.ts": api({
      getMealsDashboard: async () => dashboard(++reads === 1 ? null : saved),
      saveMealSelection: async () => {
        writes++;
        const { ApiError } = h.load("src/lib/api/client.ts");
        throw new ApiError(502, "BAD_GATEWAY", "Bad Gateway");
      },
    }),
  });
  const result = await h
    .load("src/lib/meals/service.ts")
    .submitMealDraft(completeDraft(h.load("src/lib/meals/planning.ts")));
  assert.equal(result.id, "100");
  assert.equal(writes, 1);
  assert.equal(reads, 2);
});

test("regular next-week selection stays separate from an override planning target", async () => {
  const override = { ...target, id: "8", week_start: "2026-11-23T00:00:00.000Z" };
  const h = harness({
    "src/lib/api/meals.ts": api({
      getMealsDashboard: async () => ({ ...dashboard(), nextWeekPlan: override }),
      getNextMealSelection: async () => saved,
    }),
  });
  const overview = await h.load("src/lib/meals/service.ts").loadMealsOverview("employee-1");
  assert.equal(overview.nextSelection.weekly_plan_id, "9");
  assert.equal(overview.dashboard.nextWeekPlan.id, "8");
  const menu = await h.load("src/tools/get-meal-menu.ts").default({});
  assert.equal(menu.menu.id, "8");
  assert.equal(menu.menu.items[0].name, "Rice");
  await assert.rejects(
    () => h.load("src/tools/get-meal-menu.ts").default({ suggestions: "popular" }),
    /next week's menu only/,
  );
});

test("retained drafts are discoverable only in their original account and environment", async () => {
  const h = harness();
  const drafts = h.load("src/lib/meals/drafts.ts");
  const draft = completeDraft(h.load("src/lib/meals/planning.ts"));
  await drafts.writeMealDraft("production|employee-1", draft);
  await drafts.writeMealDraft("production|employee-1", { ...draft, planId: "8", weekStart: "2026-11-23" });
  await drafts.writeMealDraft("staging|employee-1", { ...draft, planId: "7" });
  await drafts.writeMealDraft("production|employee-2", { ...draft, planId: "6" });
  const retained = await drafts.readMealDrafts("production|employee-1");
  assert.deepEqual(plain(retained.map((entry) => entry.planId)), ["9", "8"]);
  assert.equal(retained[1].weekStart, "2026-11-23");
});

test("cancelling a submitted plan keeps the separate unsent draft", async () => {
  let cancelled = 0,
    removed = 0;
  const planning = harness().load("src/lib/meals/planning.ts");
  const draft = completeDraft(planning, saved);
  draft.days[0] = { day: 1, state: "selected", mainId: "11", sideId: null };
  const planner = {
    ...dashboard(saved),
    options,
    rules: [],
    profile: {},
    fetchedAt: new Date(reference).toISOString(),
  };
  const ui = uiHarness(
    "src/views/meals/planner.tsx",
    "MealPlanner",
    { account: "employee-1" },
    {
      cancelMealSelection: async () => {
        cancelled++;
        return { success: true };
      },
    },
    true,
    {
      loadMealPlanner: { data: planner },
      readMealDraft: { data: draft },
      readMealDrafts: { data: [draft] },
    },
    {
      "src/lib/meals/drafts.ts": {
        readMealDraft: function readMealDraft() {},
        readMealDrafts: function readMealDrafts() {},
        removeMealDraft: async () => removed++,
      },
    },
  );
  const cancel = uiNodes(ui.render()).find((node) => node.props.title === "Cancel Submitted Plan");
  await cancel.props.onAction();
  assert.equal(cancelled, 1);
  assert.equal(removed, 0);
  assert.match(ui.confirmations[0].message, /Unsent draft choices will be kept/);
});

test("review refreshes a closed window and focuses the first unresolved day", async () => {
  let fresh = {
    ...dashboard(),
    windowStatus: { ...window, canSubmit: false },
    options,
    rules: [],
    profile: {},
    fetchedAt: new Date(reference).toISOString(),
  };
  const planning = harness().load("src/lib/meals/planning.ts");
  const draft = planning.createDraft(target, null);
  const result = { data: fresh, revalidate: () => {} };
  const ui = uiHarness("src/views/meals/planner.tsx", "MealPlanner", { account: "employee-1" }, {}, true, {
    loadMealPlanner: result,
    readMealDraft: { data: draft },
    readMealDrafts: { data: [] },
  });
  uiNodes(ui.render())
    .find((node) => node.props.title === "Review Plan")
    .props.onAction();
  const review = ui.pushed[0];
  let tree = review.type(review.props);
  assert.equal(
    uiNodes(tree).some((node) => node.props.title === "Submit Plan"),
    false,
  );
  const fix = uiNodes(tree).find((node) => node.props.title === "Fix Monday");
  fix.props.onAction();
  assert.equal(ui.pops(), 1);
  assert.equal(ui.render().props.selectedItemId, "1");
  result.data = { ...fresh, windowStatus: window };
  review.props.draft = completeDraft(planning);
  tree = review.type(review.props);
  assert.ok(uiNodes(tree).some((node) => node.props.title === "Submit Plan"));
  result.error = new Error("offline");
  tree = review.type(review.props);
  assert.equal(
    uiNodes(tree).some((node) => node.props.title === "Submit Plan"),
    false,
  );
});

test("week labels distinguish years and deadlines use server grace times", () => {
  const p = harness().load("src/lib/meals/planning.ts");
  assert.equal(p.weekLabel("2026-11-30"), "30 Nov–4 Dec 2026");
  assert.equal(p.weekLabel("2025-12-29"), "29 Dec 2025–2 Jan 2026");
  assert.match(p.windowLabel({ ...window, graceClosesAt: "2026-11-27T18:00:00+03:00" }), /18:00 EAT/);
});

test("an existing absence notice is visible and cannot be submitted as a replacement", () => {
  const ui = uiHarness(
    "src/views/meals/absence.tsx",
    "MealAbsenceForm",
    { account: "employee-1", date: "2026-11-27", onSaved() {} },
    {},
    true,
    {
      loadExistingAbsence: { data: [{ notifiedAt: "2026-11-26T08:00:00+03:00", onTime: true, reason: "Leave" }] },
    },
  );
  const tree = ui.render();
  assert.ok(uiNodes(tree).some((node) => node.props.title === "Existing Notice"));
  assert.equal(
    uiNodes(tree).some((node) => node.type === "SubmitForm"),
    false,
  );
  assert.equal(formControl(tree, "reason"), undefined);
});
