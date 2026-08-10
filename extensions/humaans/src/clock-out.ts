import { closeMainWindow, showToast, Toast } from "@raycast/api";
import { clockOut, getActiveTimesheetEntry } from "./api/timesheet-entries";
import { getMe } from "./api/me";

export default async () => {
  const now = new Date();

  await closeMainWindow();

  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Clocking out...",
  });

  try {
    const { id: personId } = await getMe();

    const activeEntry = await getActiveTimesheetEntry({ personId });
    if (!activeEntry) {
      toast.style = Toast.Style.Failure;
      toast.title = "You are not clocked in";
      return;
    }

    await clockOut({ timesheetEntryId: activeEntry.id, time: now });

    toast.style = Toast.Style.Success;
    toast.title = "Clocked out";
  } catch (e) {
    const title =
      e && typeof e === "object" && "message" in e && typeof e.message === "string"
        ? e.message
        : "Something went wrong";

    toast.style = Toast.Style.Failure;
    toast.title = title;
  }
};
