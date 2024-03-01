import { closeMainWindow, showToast, Toast } from "@raycast/api";
import { clockIn, getActiveTimesheetEntry } from "./api/timesheet-entries";
import { getMe } from "./api/me";

export default async () => {
  const now = new Date();

  await closeMainWindow();

  await showToast({
    style: Toast.Style.Animated,
    title: "Clocking in...",
  });

  try {
    const { id: personId } = await getMe();

    const activeEntry = await getActiveTimesheetEntry({ personId });
    if (activeEntry) {
      await showToast({
        style: Toast.Style.Failure,
        title: "You have already clocked in",
      });
      return;
    }

    await clockIn({ personId, time: now });

    await showToast({
      style: Toast.Style.Success,
      title: "Clocked in",
    });
  } catch (e) {
    const title =
      e && typeof e === "object" && "message" in e && typeof e.message === "string"
        ? e.message
        : "Something went wrong";

    await showToast({
      style: Toast.Style.Failure,
      title,
    });
  }
};
