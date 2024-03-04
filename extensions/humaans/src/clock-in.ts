import { closeMainWindow, showToast, Toast } from "@raycast/api";
import { clockIn, getActiveTimesheetEntry } from "./api/timesheet-entries";
import { getMe } from "./api/me";

export default async () => {
  const now = new Date();

  await closeMainWindow();

  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Clocking in...",
  });

  try {
    const { id: personId } = await getMe();

    const activeEntry = await getActiveTimesheetEntry({ personId });
    if (activeEntry) {
      toast.style = Toast.Style.Failure;
      toast.title = "You have already clocked in";
      return;
    }

    await clockIn({ personId, time: now });

    toast.style = Toast.Style.Success;
    toast.title = "Clocked in";
  } catch (e) {
    const title =
      e && typeof e === "object" && "message" in e && typeof e.message === "string"
        ? e.message
        : "Something went wrong";

    toast.style = Toast.Style.Failure;
    toast.title = title;
  }
};
