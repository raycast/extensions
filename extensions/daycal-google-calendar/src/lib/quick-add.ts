import { LaunchType, launchCommand, showHUD } from "@raycast/api";
import { chooseCalendar } from "./chooser";
import {
  CalendarRole,
  calendarEntryDisplayName,
  getCalendarRoles,
  getRoutingKeywords,
  resolveRoleCalendar,
  roleLabel,
} from "./calendar-settings";
import { createEvent, isWritable, listCalendars } from "./google";
import { CALENDAR_NAMES } from "./parse";
import { readMenuBarDisplaySettings } from "./menu-bar-display-settings";
import { buildQuickAddPlan, QuickAddPlanArgs } from "./quick-add-plan";
import { detectCalendarRole } from "./routing";
import { GoogleCalendarEntry } from "./types";

export type QuickAddArgs = QuickAddPlanArgs;

async function refreshMenuBar(): Promise<void> {
  try {
    await launchCommand({
      name: "menu-bar",
      type: LaunchType.Background,
      context: { refreshMode: "full" },
    });
  } catch {
    // Non-fatal: Quick Add should still succeed if the menu bar is disabled.
  }
}

const LEGACY_FALLBACKS: Record<CalendarRole, string> = {
  personal: CALENDAR_NAMES.personal,
  work: CALENDAR_NAMES.work,
  shared: CALENDAR_NAMES.shared,
  family: CALENDAR_NAMES.family,
};

function confirmationCalendarName(
  calendar: GoogleCalendarEntry,
  roles: Awaited<ReturnType<typeof getCalendarRoles>>,
): string {
  if (!calendar.primary) return calendarEntryDisplayName(calendar);

  const mappedRole = (
    ["personal", "work", "shared", "family"] as CalendarRole[]
  ).find((role) => roles[role] === calendar.id);

  return `${roleLabel(mappedRole ?? "personal")} (Primary)`;
}

function requireWritable(
  calendar: GoogleCalendarEntry | undefined,
  role: CalendarRole,
): GoogleCalendarEntry {
  if (!calendar) {
    throw new Error(
      `No calendar is configured for the ${role} role. Run “Set Up Calendars” first.`,
    );
  }
  if (!isWritable(calendar)) {
    throw new Error(
      `“${calendarEntryDisplayName(calendar)}” is read-only in Google Calendar.`,
    );
  }
  return calendar;
}

/**
 * Create a quick-add event using a configured calendar role.
 *
 * Roles are stored by Google calendar ID, so users can name their calendars
 * however they like and can rename them later without breaking routing.
 */
export async function runQuickAdd(
  defaultRole: CalendarRole,
  defaultFallbackName: string,
  args: QuickAddArgs,
): Promise<"created" | "cancelled"> {
  const displaySettings = await readMenuBarDisplaySettings();
  const plan = buildQuickAddPlan(args, displaySettings.dateStyle);

  const [calendars, roles, customKeywords] = await Promise.all([
    listCalendars(),
    getCalendarRoles(),
    getRoutingKeywords(),
  ]);

  const current = requireWritable(
    resolveRoleCalendar(calendars, roles, defaultRole, defaultFallbackName),
    defaultRole,
  );
  let target = current;

  const suggestedRole = detectCalendarRole(plan.summary, customKeywords);
  if (suggestedRole && suggestedRole !== defaultRole) {
    const suggested = resolveRoleCalendar(
      calendars,
      roles,
      suggestedRole,
      LEGACY_FALLBACKS[suggestedRole],
    );
    if (suggested && isWritable(suggested) && suggested.id !== current.id) {
      const choice = await chooseCalendar(
        plan.summary,
        calendarEntryDisplayName(current),
        calendarEntryDisplayName(suggested),
      );
      if (!choice) return "cancelled";
      target = choice === "suggested" ? suggested : current;
    }
  }

  await createEvent(
    target.id,
    plan.kind === "all-day"
      ? {
          summary: plan.summary,
          allDay: true,
          startDate: plan.startDate,
          endDate: plan.endDate,
          location: plan.location || undefined,
          description: plan.description || undefined,
        }
      : {
          summary: plan.summary,
          start: plan.start,
          end: plan.end,
          location: plan.location || undefined,
          description: plan.description || undefined,
        },
  );

  // Quick Add can be launched from Schedule or directly from the menu bar.
  // Refresh the persistent menu-bar snapshot after Google confirms creation.
  void refreshMenuBar();

  const extra = plan.location
    ? ` · 📍 ${plan.location}`
    : plan.description
      ? ` · 💻 ${plan.description}`
      : "";

  await showHUD(
    `✅ ${plan.summary} → ${confirmationCalendarName(target, roles)} · ${plan.humanWhen} · ${plan.durationLabel}${extra}`,
  );
  return "created";
}
