import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function source(path) {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

function block(text, start, end) {
  const startIndex = text.indexOf(start);
  if (startIndex === -1) return "";
  const endIndex = text.indexOf(end, startIndex + start.length);
  if (endIndex === -1) return text.slice(startIndex);
  return text.slice(startIndex, endIndex);
}

function count(text, needle) {
  return text.split(needle).length - 1;
}

const schedule = source("src/schedule.tsx");
const scheduleLib = source("src/lib/schedule.ts");
const eventActions = source("src/event-actions.tsx");
const quickAdd = source("src/lib/quick-add.ts");
const enabledCalendars = source("src/enabled-calendars.tsx");
const menuBarSettings = source("src/menu-bar-settings.tsx");
const menuBar = source("src/menu-bar.tsx");

const scheduleRefresh = block(
  schedule,
  "const refreshAfterScheduleMutation = useCallback(async () => {",
  "useEffect(() => {",
);
const scheduleDelete = block(
  schedule,
  "async function remove(item: ScheduleEvent)",
  "if (setupComplete === null)",
);
const confirmDelete = block(
  eventActions,
  "async function confirmAndDelete(",
  "export function CalendarTransferView",
);
const transfer = block(
  eventActions,
  "async function transfer(destination: GoogleCalendarEntry)",
  "if (error) {",
);
const eventActionsView = block(
  eventActions,
  "export function EventActionsView",
  "function Command(",
);
const quickAddCreate = block(
  quickAdd,
  "await createEvent(",
  "const extra = plan.location",
);
const toggleMeetingFilter = block(
  menuBar,
  "const toggleMeetingFilter = useCallback(async () => {",
  "// Keep the headline, dropdown list",
);

const persistIndex = toggleMeetingFilter.indexOf("await updateMenuBarDisplaySettings");
const stateIndex = toggleMeetingFilter.indexOf("setMenuBarOnlyMeetings");

const checks = [
  {
    label: "Schedule edit → Schedule",
    pass:
      scheduleRefresh.includes("await reload()") &&
      count(schedule, "onSaved={refreshAfterScheduleMutation}") >= 2,
    detail: "Timed and all-day edits reload the open Schedule view.",
  },
  {
    label: "Schedule edit → Menu Bar",
    pass:
      scheduleRefresh.includes("void refreshMenuBar()") &&
      count(schedule, "onSaved={refreshAfterScheduleMutation}") >= 2,
    detail: "Timed and all-day edits request a background menu-bar refresh.",
  },
  {
    label: "Schedule delete → Schedule + Menu Bar",
    pass:
      scheduleDelete.includes("await deleteEvent(") &&
      scheduleDelete.includes("await refreshAfterScheduleMutation()"),
    detail: "Direct Schedule deletion reloads Schedule and refreshes the menu bar.",
  },
  {
    label: "Schedule More Actions → Schedule",
    pass: schedule.includes("onChanged={reload}"),
    detail: "Edits, transfers, and deletes made through More Actions can notify Schedule.",
  },
  {
    label: "Event Actions edit → Menu Bar + parent",
    pass:
      eventActionsView.includes("void refreshMenuBar()") &&
      eventActionsView.includes("await onChanged?.()"),
    detail: "Editing through Event Actions refreshes the menu bar and any parent Schedule.",
  },
  {
    label: "Move / Copy → Menu Bar + parent",
    pass:
      transfer.includes("void refreshMenuBar()") &&
      eventActionsView.includes("onTransferred={onChanged}"),
    detail: "Move/copy refreshes the menu bar and can notify the parent Schedule.",
  },
  {
    label: "Delete through Event Actions → Menu Bar + parent",
    pass:
      confirmDelete.includes("void refreshMenuBar()") &&
      eventActionsView.includes("await onChanged?.()"),
    detail: "Event Actions deletion refreshes the menu bar and can notify the parent Schedule.",
  },
  {
    label: "Quick Add → Menu Bar",
    pass: quickAddCreate.includes("void refreshMenuBar()"),
    detail: "Successful Quick Add refreshes the persistent menu-bar snapshot.",
  },
  {
    label: "Enabled Calendars → full Menu Bar refresh",
    pass:
      enabledCalendars.includes('name: "menu-bar"') &&
      enabledCalendars.includes('context: { refreshMode: "full" }'),
    detail: "Changing menu-bar calendar scope requests fresh Google data.",
  },
  {
    label: "Calendar Settings → display/full refresh",
    pass:
      menuBarSettings.includes('name: "menu-bar"') &&
      menuBarSettings.includes('refreshMode: menuBarCalendarsChanged ? "full" : "display"'),
    detail: "Display-only settings avoid Google while calendar-scope changes do a full refresh.",
  },
  {
    label: "Background Menu Bar launch → reload",
    pass:
      menuBar.includes("environment.launchType === LaunchType.Background || !cacheIsFresh") &&
      menuBar.includes("void reload()"),
    detail: "Background refresh requests actually rebuild the cached event snapshot.",
  },
  {
    label: "Worker Unloaded ordering preserved",
    pass: persistIndex >= 0 && stateIndex > persistIndex,
    detail: "Meetings-only setting persists before React state changes.",
  },
  {
    label: "Google Calendar links follow the connected account",
    pass:
      scheduleLib.includes("const authUser = connectedGoogleAccountId(calendars)") &&
      scheduleLib.includes('url.searchParams.set("authuser", authUser)') &&
      scheduleLib.includes("/^\\/calendar\\/u\\/\\d+(?=\\/|$)/"),
    detail: "Event links use the Raycast-authenticated Google account instead of a browser /u/0 slot.",
  },
  {
    label: "Loaded events always receive an account-aware link",
    pass:
      count(scheduleLib, "withAccountAwareGoogleCalendarLink(event, authUser)") >= 2,
    detail: "Normal events and birthdays both carry account-aware Google Calendar URLs into Schedule and Menu Bar.",
  },
];

console.log("\nDayCal refresh contract\n");
for (const check of checks) {
  console.log(`${check.pass ? "✅" : "❌"} ${check.label}`);
  console.log(`   ${check.detail}`);
}

const failures = checks.filter((check) => !check.pass);
if (failures.length > 0) {
  console.error(`\n❌ ${failures.length}/${checks.length} refresh checks failed.`);
  process.exitCode = 1;
} else {
  console.log(`\n✅ ${checks.length}/${checks.length} refresh checks passed`);
}
