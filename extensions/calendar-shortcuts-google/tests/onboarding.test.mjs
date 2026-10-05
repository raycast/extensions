import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import ts from "typescript";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const setupPath = path.join(root, "src", "lib", "calendar-setup-view.tsx");
const settingsPath = path.join(root, "src", "lib", "calendar-settings.ts");
const commandPath = path.join(root, "src", "set-up-calendars.tsx");
const packagePath = path.join(root, "package.json");
const schedulePath = path.join(root, "src", "schedule.tsx");
const replayPath = path.join(root, "src", "reset-onboarding.ts");

const setup = fs.readFileSync(setupPath, "utf8");
const settings = fs.readFileSync(settingsPath, "utf8");
const command = fs.readFileSync(commandPath, "utf8");
const pkg = JSON.parse(fs.readFileSync(packagePath, "utf8"));
const schedule = fs.readFileSync(schedulePath, "utf8");
const replay = fs.readFileSync(replayPath, "utf8");
const menuBar = fs.readFileSync(path.join(root, "src", "menu-bar.tsx"), "utf8");

const checks = [];
function check(name, pass, detail) {
  checks.push({ name, pass, detail });
}

check(
  "Three-step setup flow",
  setup.includes('Set Up Your Calendars · 1 of 3') &&
    setup.includes('Set Up Your Calendars · 2 of 3') &&
    setup.includes('Set Up Your Calendars · 3 of 3'),
  "Roles, visibility and optional routing are separated into focused steps.",
);

check(
  "Persistent setup draft spans all three steps",
  setup.includes("type SetupDraft = {") &&
    setup.includes("const [draft, setDraft] = useState<SetupDraft>") &&
    setup.includes("roles: CalendarRoleMap") &&
    setup.includes("scheduleCalendars: string[]") &&
    setup.includes("menuBarCalendars: string[]") &&
    setup.includes("keywordText: KeywordValues"),
  "Roles, visibility choices and routing text share one persistent draft instead of independent transient form state.",
);

check(
  "Personal calendar remains required",
  setup.includes('title: "Choose a Personal calendar"') &&
    setup.includes("Personal is the fallback calendar for Quick Add events."),
  "The required Quick Add fallback guard remains present.",
);

check(
  "Existing account selections are preserved",
  setup.includes("existingScheduleEnabled ?? visibleCalendarIds") &&
    setup.includes("existingMenuBarEnabled ?? visibleCalendarIds"),
  "Existing per-account Schedule/Menu Bar choices win; Google-visible calendars are only the first-run fallback.",
);

check(
  "Schedule and Menu Bar are independently selectable",
  setup.includes('id="scheduleCalendars"') &&
    setup.includes('id="menuBarCalendars"') &&
    setup.includes("setScheduleEnabledCalendarIds(finalDraft.scheduleCalendars)") &&
    setup.includes("setMenuBarEnabledCalendarIds(finalDraft.menuBarCalendars)"),
  "The onboarding flow saves separate account-scoped calendar lists.",
);

check(
  "Missing native selection submissions cannot silently clear calendars",
  setup.includes("validatedCalendarIds(") &&
    setup.includes("calendar selection was not submitted correctly") &&
    settings.includes("if (!Array.isArray(ids))") &&
    settings.includes("calendar selection was missing"),
  "A missing/undefined Raycast form field is rejected instead of being normalised to an empty array.",
);

check(
  "Intentional clear-all remains valid",
  settings.includes("return Array.from(") &&
    settings.includes("new Set(ids.map((value) => value.trim()).filter(Boolean))"),
  "A deliberate [] remains a valid calendar selection while non-array input is rejected.",
);

check(
  "Account-scoped JSON writes are serialized",
  settings.includes("let localStorageWriteQueue: Promise<void> = Promise.resolve()") &&
    settings.includes("localStorageWriteQueue.then(() =>") &&
    settings.includes("localStorageWriteQueue = write.catch(() => {})"),
  "Concurrent setup setters are queued so Raycast LocalStorage cannot race separate calendar/keyword writes.",
);

check(
  "Missing keyword submissions cannot silently clear routing",
  setup.includes("validatedKeywordValues(") &&
    settings.includes('typeof value !== "string"') &&
    settings.includes("Routing keyword field was missing"),
  "Missing keyword fields fail the save instead of being converted into an empty list.",
);

check(
  "Routing keyword draft is controlled and persists across Back/Continue",
  setup.includes("value={draft.keywordText.sharedKeywords}") &&
    setup.includes("sharedKeywords: value") &&
    setup.includes("keywordTextFromMap(savedKeywords)"),
  "A value such as ‘lauren’ remains in the shared draft while moving between setup steps and after reopening.",
);

check(
  "Setup save is verified before completion",
  setup.includes("const [savedRoles, savedKeywords, savedSchedule, savedMenuBar]") &&
    setup.includes("sameStringArrays(savedSchedule, finalDraft.scheduleCalendars)") &&
    setup.includes("sameStringArrays(savedMenuBar, finalDraft.menuBarCalendars)") &&
    setup.includes("sameKeywordMap(savedKeywords, keywordMap)") &&
    setup.indexOf("await markCalendarSetupComplete()") >
      setup.indexOf("save read-back"),
  "Finish Setup reads the account-scoped payload back and only marks setup complete after verification succeeds.",
);

const keywordNormaliser = setup.slice(
  setup.indexOf("function normalisedKeywordMap"),
  setup.indexOf("function sameKeywordMap"),
);
check(
  "Setup verification matches persisted keyword normalisation",
  keywordNormaliser.includes("value.trim().toLowerCase()") &&
    keywordNormaliser.includes("new Set("),
  "Capitalised or duplicate routing keywords compare against the lowercase deduplicated form written to storage, so a first save such as ‘Jonah’ does not fail verification.",
);

check(
  "Development diagnostics exclude credentials and calendar contents",
  setup.includes("environment.isDevelopment") &&
    setup.includes("getCalendarSettingsDebugScope") &&
    setup.includes('debugSetup("save payload"') &&
    setup.includes('debugSetup("save read-back"') &&
    !setup.includes("accessToken") &&
    !setup.includes("refreshToken"),
  "Development logs expose draft shape, account scope and write/read-back metadata without OAuth credentials or event contents.",
);

check(
  "Role and routing storage remain account scoped",
  setup.includes("setCalendarRoles(finalDraft.roles)") &&
    setup.includes("setRoutingKeywords(keywordMap)") &&
    setup.includes("markCalendarSetupComplete()"),
  "Setup continues through the existing account-scoped storage helpers.",
);

check(
  "Same-account reconnect keeps the same scoped storage path",
  settings.includes("currentGoogleConnectionFingerprint()") &&
    settings.includes("calendar.primary") &&
    settings.includes("stableHash(primary.id.trim().toLowerCase())") &&
    !settings.includes("removeItem(STORAGE.accountScopeIndex)"),
  "Reconnect continues to resolve the durable primary-calendar-derived account scope rather than clearing saved setup.",
);

check(
  "Setup refreshes Menu Bar once",
  setup.includes('name: "menu-bar"') &&
    setup.includes('context: { refreshMode: "full" }'),
  "Finishing setup asks the real Menu Bar pipeline for one full refresh.",
);

check(
  "Native OAuth error path has no Google Cloud credential instructions",
  !setup.includes("console.cloud.google.com/apis/credentials") &&
    setup.includes("ConnectionCheckView") &&
    setup.includes('title="Check Google Calendar Connection"'),
  "Errors now offer contextual connection diagnostics instead of legacy manual OAuth setup or a public support command.",
);

check(
  "Raycast preferences stay accessible",
  setup.includes("openExtensionPreferences") && setup.includes("⌘⇧P"),
  "Extension-level preferences remain available without duplicating their storage.",
);

const selectionPreference = pkg.preferences.find(
  (preference) => preference.name === "calendarSelectionMode",
);
check(
  "Fresh installs default to Custom Enabled Calendars",
  selectionPreference?.default === "custom",
  "The onboarding calendar pickers are active by default for new installs without overwriting existing preferences.",
);

check(
  "Schedule routes incomplete accounts to dedicated setup",
  schedule.includes('name: "set-up-calendars"') &&
    schedule.includes("setupComplete !== false") &&
    !schedule.includes("<CalendarSetupView"),
  "After Native OAuth, an account with unfinished setup is sent to Set Up Calendars instead of embedding onboarding inside Schedule.",
);

check(
  "Schedule auto-route does not keep a setup polling loop alive",
  !schedule.includes("isCalendarSetupComplete().then((complete)") &&
    !schedule.includes("}, 500)"),
  "The originating Schedule command becomes idle after routing; the setup completion screen opens a fresh Schedule instead of polling in the background.",
);

check(
  "Schedule Native OAuth error path has no legacy Google Cloud setup link",
  !schedule.includes("console.cloud.google.com/apis/credentials") &&
    schedule.includes("ConnectionCheckView") &&
    schedule.includes('title="Check Google Calendar Connection"'),
  "Schedule errors keep the Native OAuth connection diagnostic contextual rather than exposing it in Root Search.",
);

check(
  "Dedicated setup command has useful next actions",
  command.includes('title="Open Schedule"') &&
    command.includes('title="Calendar Settings"') &&
    command.includes('title="Enabled Calendars"'),
  "Finishing the dedicated setup command leads directly to the main product surfaces.",
);

check(
  "Development setup replay preserves saved choices",
  replay.includes("getScheduleEnabledCalendarIds") &&
    replay.includes("getMenuBarEnabledCalendarIds") &&
    replay.includes("getCalendarRoles") &&
    replay.includes("getRoutingKeywords") &&
    replay.includes("setScheduleEnabledCalendarIds") &&
    replay.includes("setMenuBarEnabledCalendarIds") &&
    replay.includes("setCalendarRoles") &&
    replay.includes("setRoutingKeywords"),
  "Replaying onboarding snapshots and restores the connected account's saved setup instead of wiping it.",
);

const replayCommand = pkg.commands.find((item) => item.name === "reset-onboarding");
check(
  "Development setup replay is not exposed as a public command",
  replayCommand === undefined,
  "The replay helper remains available in source for development testing but is not listed in the Store-facing Raycast manifest.",
);

// Execute the actual redirect effect with mocked Raycast/storage boundaries.
// This verifies launch behavior without claiming to mount Raycast's native UI.
const menuSource = ts.createSourceFile("menu-bar.tsx", menuBar, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const redirectEffects = [];
function findRedirectEffect(node) {
  if (ts.isCallExpression(node) && node.expression.getText(menuSource) === "useEffect" &&
      node.arguments[0]?.getText(menuSource).includes("setupRedirectStartedRef")) {
    redirectEffects.push(node.arguments[0].getText(menuSource));
  }
  ts.forEachChild(node, findRedirectEffect);
}
findRedirectEffect(menuSource);
check("Menu Bar has one guarded setup redirect effect", redirectEffects.length === 1 &&
  menuBar.includes("const setupRedirectStartedRef = useRef(false)"),
  "The launch guard persists across renders of the current command.");

if (redirectEffects.length === 1) {
  for (const scenario of [
    { name: "Explicit incomplete Menu Bar launch opens setup once", launchType: "userInitiated", cached: false, complete: false, launches: 1, reads: 1 },
    { name: "Background incomplete Menu Bar launch stays quiet", launchType: "background", cached: false, complete: false, launches: 0, reads: 0 },
    { name: "Explicit completed Menu Bar launch keeps normal behavior", launchType: "userInitiated", cached: true, complete: true, launches: 0, reads: 0 },
    { name: "Background completed Menu Bar launch keeps normal behavior", launchType: "background", cached: true, complete: true, launches: 0, reads: 0 },
    { name: "Unknown setup waits for the existing loader", launchType: "userInitiated", cached: null, complete: false, launches: 0, reads: 0 },
    { name: "Stale incomplete snapshot does not reopen completed setup", launchType: "userInitiated", cached: false, complete: true, launches: 0, reads: 1 },
    { name: "Failed setup launch does not automatically retry", launchType: "userInitiated", cached: false, complete: false, launches: 1, reads: 1, failLaunch: true },
    { name: "Failed account lookup does not launch setup or retry", launchType: "userInitiated", cached: false, complete: false, launches: 0, reads: 1, failRead: true },
  ]) {
    const launches = [];
    const errors = [];
    let reads = 0;
    const context = {
      environment: { launchType: scenario.launchType },
      LaunchType: { UserInitiated: "userInitiated", Background: "background" },
      setupComplete: scenario.cached,
      setupRedirectStartedRef: { current: false },
      sessionIsCurrent: () => true,
      isCalendarSetupComplete: async () => {
        reads++;
        if (scenario.failRead) throw new Error("Lookup failed");
        return scenario.complete;
      },
      setSetupComplete: (complete) => { context.setupComplete = complete; },
      launchCommand: async (options) => {
        launches.push(options);
        if (scenario.failLaunch) throw new Error("Launch failed");
      },
      setError: (error) => errors.push(error),
    };
    const effect = vm.runInNewContext(`(${redirectEffects[0]})`, context);
    effect();
    effect(); // A render while the asynchronous lookup is pending.
    await new Promise((resolve) => setImmediate(resolve));
    effect(); // A render after success/failure must not repeat the launch.
    await new Promise((resolve) => setImmediate(resolve));
    check(scenario.name,
      launches.length === scenario.launches && reads === scenario.reads &&
      launches.every((options) => options.name === "set-up-calendars" && options.type === "userInitiated") &&
      errors.length === (scenario.failLaunch || scenario.failRead ? 1 : 0),
      "Executed redirect with mocked account completion and launchCommand, including repeated renders.");
  }
}

check("Menu Bar keeps the manual setup CTA and existing account helper",
  menuBar.includes('title="Set Up Calendars"') &&
  menuBar.includes('subtitle="Finish first-run calendar setup"') &&
  menuBar.includes("const complete = await isCalendarSetupComplete()"),
  "Quiet background workers retain the setup action and use the existing account-scoped setup state.");

console.log("\nDayCal onboarding contract\n");
for (const item of checks) {
  console.log(`${item.pass ? "✅" : "❌"} ${item.name}`);
  console.log(`   ${item.detail}`);
}

const failed = checks.filter((item) => !item.pass);
console.log("");
if (failed.length) {
  console.error(`❌ ${failed.length}/${checks.length} onboarding checks failed`);
  process.exit(1);
}

console.log(`✅ ${checks.length}/${checks.length} onboarding checks passed`);
