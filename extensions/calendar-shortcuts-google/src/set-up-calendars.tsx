import { withAccessToken } from "@raycast/utils";
import { googleOAuth } from "./lib/google-oauth";
import {
  Action,
  ActionPanel,
  Detail,
  Icon,
  LaunchType,
  launchCommand,
  openExtensionPreferences,
} from "@raycast/api";
import { useState } from "react";
import { CalendarSetupView } from "./lib/calendar-setup-view";

function Command() {
  const [saved, setSaved] = useState(false);

  if (!saved) return <CalendarSetupView onComplete={() => setSaved(true)} />;

  return (
    <Detail
      navigationTitle="Set Up Your Calendars"
      markdown={
        "## ✅ DayCal is ready\n\nYour calendar roles, Schedule calendars, Menu Bar calendars and optional routing keywords have been saved for this Google account."
      }
      actions={
        <ActionPanel>
          <Action
            title="Open Schedule"
            icon={Icon.Calendar}
            onAction={() =>
              launchCommand({
                name: "schedule",
                type: LaunchType.UserInitiated,
              })
            }
          />
          <Action
            title="Calendar Settings"
            icon={Icon.Gear}
            onAction={() =>
              launchCommand({
                name: "menu-bar-settings",
                type: LaunchType.UserInitiated,
              })
            }
          />
          <Action
            title="Enabled Calendars"
            icon={Icon.Checkmark}
            onAction={() =>
              launchCommand({
                name: "enabled-calendars",
                type: LaunchType.UserInitiated,
              })
            }
          />
          <Action
            title="Open Extension Preferences"
            icon={Icon.Gear}
            onAction={openExtensionPreferences}
          />
          <Action
            title="Edit Setup Again"
            icon={Icon.Pencil}
            onAction={() => setSaved(false)}
          />
        </ActionPanel>
      }
    />
  );
}

export default withAccessToken(googleOAuth)(Command);
