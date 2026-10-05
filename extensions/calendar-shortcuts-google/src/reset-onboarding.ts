import {
  Cache,
  LaunchType,
  environment,
  launchCommand,
  showHUD,
} from "@raycast/api";
import { withAccessToken } from "@raycast/utils";
import { googleOAuth } from "./lib/google-oauth";
import {
  getCalendarRoles,
  getMenuBarEnabledCalendarIds,
  getRoutingKeywords,
  getScheduleEnabledCalendarIds,
  resetCalendarSetup,
  setCalendarRoles,
  setMenuBarEnabledCalendarIds,
  setRoutingKeywords,
  setScheduleEnabledCalendarIds,
} from "./lib/calendar-settings";

const menuBarCache = new Cache({ namespace: "calendar-shortcuts-menu-bar" });

async function Command() {
  if (!environment.isDevelopment) {
    await showHUD("Development-only command");
    return;
  }

  // Snapshot the current account's setup first. The purpose of this command is
  // to replay onboarding, not to destroy a working account configuration.
  const [scheduleCalendars, menuBarCalendars, roles, routingKeywords] =
    await Promise.all([
      getScheduleEnabledCalendarIds(),
      getMenuBarEnabledCalendarIds(),
      getCalendarRoles(),
      getRoutingKeywords(),
    ]);

  // Clear the menu snapshot so the setup completion refresh rebuilds it from
  // the account's current settings.
  menuBarCache.clear();

  // resetCalendarSetup() marks setup incomplete by clearing the account-scoped
  // setup keys. Restore every saved choice immediately afterwards, leaving only
  // setupComplete unset so the wizard can be exercised again safely.
  await resetCalendarSetup();

  await Promise.all([
    scheduleCalendars
      ? setScheduleEnabledCalendarIds(scheduleCalendars)
      : Promise.resolve(),
    menuBarCalendars
      ? setMenuBarEnabledCalendarIds(menuBarCalendars)
      : Promise.resolve(),
    setCalendarRoles(roles),
    setRoutingKeywords(routingKeywords),
  ]);

  await showHUD("🧪 Calendar setup replay ready · saved choices kept");

  await launchCommand({
    name: "set-up-calendars",
    type: LaunchType.UserInitiated,
    context: { replaySetup: Date.now() },
  });
}

export default withAccessToken(googleOAuth)(Command);
