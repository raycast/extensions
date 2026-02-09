/**
 * Command to check current attendance status
 */

import { Detail, ActionPanel, Action, Icon } from "@raycast/api";
import { useAttendance } from "./hooks/useAttendance";
import { formatHours, formatTime, formatRelativeTime } from "./utils/odoo";

export default function CheckAttendanceCommand() {
  const { state, loading, error, refresh, toggle } = useAttendance(true);

  if (error) {
    return (
      <Detail
        markdown={`# Error\n\n${error.message}`}
        actions={
          <ActionPanel>
            <Action title="Retry" onAction={() => refresh(false)} icon={Icon.ArrowClockwise} />
          </ActionPanel>
        }
      />
    );
  }

  if (loading && !state) {
    return <Detail isLoading={true} markdown="Loading attendance status..." />;
  }

  if (!state) {
    return <Detail markdown="# No Data\n\nCould not load attendance status." />;
  }

  const isCheckedIn = state.attendance_state === "checked_in";
  const statusIcon = isCheckedIn ? "✓" : "⏹";
  const statusText = isCheckedIn ? "Checked In" : "Checked Out";
  const actionText = isCheckedIn ? "Check Out" : "Check In";

  let markdown = `# ${statusIcon} ${statusText}\n\n`;

  // Employee name
  if (state.employee_name) {
    markdown += `**Employee:** ${state.employee_name}\n\n`;
  }

  // Hours today
  markdown += `**Hours Today:** ${formatHours(state.hours_today)}\n\n`;

  // Last check-in
  if (state.last_check_in) {
    const checkInTime = formatTime(state.last_check_in);
    const checkInRelative = formatRelativeTime(state.last_check_in);
    markdown += `**Last Check-In:** ${checkInTime} (${checkInRelative})\n\n`;
  }

  // Last check-out
  if (state.last_check_out) {
    const checkOutTime = formatTime(state.last_check_out);
    const checkOutRelative = formatRelativeTime(state.last_check_out);
    markdown += `**Last Check-Out:** ${checkOutTime} (${checkOutRelative})\n\n`;
  }

  // Current status details
  if (isCheckedIn) {
    markdown += `\n---\n\n`;
    markdown += `You are currently checked in. Use the action below to check out when you're done for the day.`;
  } else {
    markdown += `\n---\n\n`;
    markdown += `You are currently checked out. Use the action below to check in when you start work.`;
  }

  return (
    <Detail
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action title={actionText} onAction={toggle} icon={isCheckedIn ? Icon.XMarkCircle : Icon.CheckCircle} />
          <Action
            title="Refresh"
            onAction={() => refresh(false)}
            icon={Icon.ArrowClockwise}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
          />
        </ActionPanel>
      }
    />
  );
}
