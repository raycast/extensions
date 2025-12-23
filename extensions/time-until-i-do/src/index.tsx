import { Action, ActionPanel, Detail, getPreferenceValues, openExtensionPreferences } from "@raycast/api";
import moment from "moment";
import { useState, useEffect, useMemo } from "react";

export default function TimeUntil() {
  const { bigDayDate, bigDayName } = getPreferenceValues<Preferences>();
  const [now, setNow] = useState(moment());

  const bigDay = useMemo(() => moment(bigDayDate), [bigDayDate]);

  useEffect(() => {
    const interval = setInterval(() => setNow(moment()), 1000);
    return () => clearInterval(interval);
  }, []);

  const timeLeft = useMemo(() => {
    if (!bigDayDate || bigDay.isBefore(now)) return null;

    return {
      days: bigDay.diff(now, "days"),
      hours: bigDay.diff(now, "hours") % 24,
      minutes: bigDay.diff(now, "minutes") % 60,
      seconds: bigDay.diff(now, "seconds") % 60,
      totalDays: bigDay.diff(now, "days"),
    };
  }, [bigDay, now, bigDayDate]);

  const markdown = useMemo(() => {
    if (!bigDayName?.trim() || !bigDayDate) {
      return "# ⚙️ Setup Required\n\nConfigure your event in preferences.";
    }

    if (!timeLeft) {
      return `# 🎉 ${bigDayName}\n\n**Event Date:** ${bigDay.format(
        "MMMM Do, YYYY",
      )}\n\n✨ The day has arrived or passed!`;
    }

    const { days, hours, minutes, seconds, totalDays } = timeLeft;

    return [
      `# ⏰ ${bigDayName}`,
      `**${bigDay.format("MMMM Do, YYYY")}**`,
      "",
      `## ${totalDays} ${totalDays === 1 ? "Day" : "Days"} Remaining`,
      "",
      `**${days}d ${hours}h ${minutes}m ${seconds}s**`,
    ].join("\n");
  }, [bigDayName, bigDayDate, bigDay, timeLeft]);

  return (
    <Detail
      markdown={markdown}
      metadata={
        timeLeft && (
          <Detail.Metadata>
            <Detail.Metadata.Label title="Event" text={bigDayName || "Untitled Event"} />
            <Detail.Metadata.Label title="Date" text={bigDay.format("MMMM Do, YYYY")} />
            <Detail.Metadata.Separator />
            <Detail.Metadata.Label title="Days Left" text={timeLeft.totalDays.toString()} />
            <Detail.Metadata.Label title="Hours Left" text={bigDay.diff(now, "hours").toString()} />
            <Detail.Metadata.Label title="Minutes Left" text={bigDay.diff(now, "minutes").toLocaleString()} />
          </Detail.Metadata>
        )
      }
      actions={
        <ActionPanel>
          <Action title="Preferences" onAction={openExtensionPreferences} />
        </ActionPanel>
      }
    />
  );
}
