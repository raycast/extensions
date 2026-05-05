import {
  Action,
  ActionPanel,
  Detail,
  Icon,
  getPreferenceValues,
  showToast,
  Toast,
  updateCommandMetadata,
} from "@raycast/api";
import { showFailureToast, usePromise } from "@raycast/utils";
import { useEffect } from "react";
import {
  buildDetailMarkdown,
  buildSubtitle,
  nextActionLabel,
  successToastFromSummary,
} from "./lib/attendance-metadata";
import { getAttendanceSummary, toggleCheckInOut } from "./lib/attendance-service";
import type { AttendanceSummary } from "./lib/attendance-service";

async function syncCommandSubtitle(summary: AttendanceSummary): Promise<void> {
  await updateCommandMetadata({ subtitle: buildSubtitle(summary) });
}

export default function AttendanceCommand() {
  const prefs = getPreferenceValues<Preferences.Attendance>();

  const { data, isLoading, error, revalidate } = usePromise(async () => getAttendanceSummary(prefs), []);

  useEffect(() => {
    if (data) void syncCommandSubtitle(data);
  }, [data]);

  async function doToggle() {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Updating attendance…",
      message: "Mindnow Odoo",
    });
    try {
      await toggleCheckInOut(prefs);
      const summary = await getAttendanceSummary(prefs);
      await syncCommandSubtitle(summary);
      const t = successToastFromSummary(summary);
      toast.style = Toast.Style.Success;
      toast.title = t.title;
      toast.message = t.message;
      await revalidate();
    } catch (e) {
      await toast.hide();
      await showFailureToast(e, { title: "Attendance failed" });
    }
  }

  async function doRefreshSession() {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Refreshing…",
      message: "Mindnow Odoo",
    });
    try {
      await revalidate();
      const summary = await getAttendanceSummary(prefs);
      await syncCommandSubtitle(summary);
      toast.style = Toast.Style.Success;
      toast.title = "Session updated";
      toast.message = buildSubtitle(summary);
    } catch (e) {
      await toast.hide();
      await showFailureToast(e, { title: "Refresh failed" });
    }
  }

  const markdown =
    error != null
      ? `## Error\n\n${error instanceof Error ? error.message : String(error)}`
      : data
        ? buildDetailMarkdown(data)
        : "";

  const toggleTitle = data ? nextActionLabel(data) : "Check in";
  const toggleIcon = data?.state === "in" ? Icon.Stop : Icon.Play;

  return (
    <Detail
      navigationTitle="Attendance"
      isLoading={isLoading && !data && !error}
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action title={toggleTitle} icon={toggleIcon} onAction={doToggle} />
          <Action
            title="Refresh Session"
            icon={Icon.ArrowClockwise}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
            onAction={doRefreshSession}
          />
        </ActionPanel>
      }
    />
  );
}
