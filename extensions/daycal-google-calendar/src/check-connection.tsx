import { Action, ActionPanel, Detail, Icon } from "@raycast/api";
import { withAccessToken } from "@raycast/utils";
import { useCallback, useEffect, useState } from "react";
import { calendarEntryDisplayName } from "./lib/calendar-settings";
import { listCalendars } from "./lib/google";
import { googleOAuth } from "./lib/google-oauth";

type ConnectionState =
  | { status: "loading" }
  | {
      status: "connected";
      calendarCount: number;
      writableCount: number;
      primaryCalendar: string;
    }
  | { status: "error"; message: string };

function escapeMarkdown(value: string): string {
  return value.replace(/[\\`*_{}[\]()#+\-.!]/g, "\\$&");
}

export function ConnectionCheckView() {
  const [state, setState] = useState<ConnectionState>({ status: "loading" });

  const checkConnection = useCallback(async () => {
    setState({ status: "loading" });

    try {
      const calendars = await listCalendars();
      const writable = calendars.filter(
        (calendar) =>
          calendar.accessRole === "owner" || calendar.accessRole === "writer",
      );
      const primary = calendars.find((calendar) => calendar.primary);

      setState({
        status: "connected",
        calendarCount: calendars.length,
        writableCount: writable.length,
        primaryCalendar: primary
          ? calendarEntryDisplayName(primary)
          : "Primary Calendar",
      });
    } catch (error) {
      setState({
        status: "error",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }, []);

  useEffect(() => {
    void checkConnection();
  }, [checkConnection]);

  if (state.status === "loading") {
    return <Detail isLoading markdown="# Checking Google Calendar…" />;
  }

  if (state.status === "connected") {
    const markdown = [
      "# ✅ Google Calendar connected",
      "",
      "DayCal can access Google Calendar successfully through Raycast's native Google sign-in.",
      "",
      `**Primary calendar:** ${escapeMarkdown(state.primaryCalendar)}`,
      `**Calendars found:** ${state.calendarCount}`,
      `**Writable calendars:** ${state.writableCount}`,
      "",
      "You can close this view when you're finished.",
    ].join("\n");

    return (
      <Detail
        markdown={markdown}
        actions={
          <ActionPanel>
            <Action
              title="Check Again"
              icon={Icon.ArrowClockwise}
              onAction={checkConnection}
            />
          </ActionPanel>
        }
      />
    );
  }

  const markdown = [
    "# ❌ Google Calendar connection problem",
    "",
    "DayCal is signed in, but Google Calendar could not be reached successfully.",
    "",
    "## Details",
    "",
    escapeMarkdown(state.message),
    "",
    "Try **Check Again**. If the problem persists, use **Disconnect Google Account** and sign in again when you next open a DayCal command.",
  ].join("\n");

  return (
    <Detail
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action
            title="Check Again"
            icon={Icon.ArrowClockwise}
            onAction={checkConnection}
          />
        </ActionPanel>
      }
    />
  );
}

export default withAccessToken(googleOAuth)(ConnectionCheckView);
