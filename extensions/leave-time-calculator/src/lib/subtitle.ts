import { updateCommandMetadata } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { buildLeaveStatus, formatTopSubtitle } from "./leave-status";
import { getWorkPreferences } from "./preferences";
import { getTodayShift } from "./storage";
import { formatTimeString } from "./time-utils";

export async function updateCurrentCommandSubtitle() {
  try {
    const { workHours, breakMinutes } = getWorkPreferences();
    const todayShift = await getTodayShift(workHours, breakMinutes);

    if (!todayShift) {
      await updateCommandMetadata({ subtitle: "" });
      return;
    }

    const now = new Date();
    const currentTime = formatTimeString(now.getHours(), now.getMinutes());
    const status = buildLeaveStatus(
      todayShift.startTime,
      workHours,
      breakMinutes,
      currentTime,
      todayShift.startDate,
    );
    await updateCommandMetadata({ subtitle: formatTopSubtitle(status) });
  } catch (err) {
    await showFailureToast(
      `Failed to update menu subtitle: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
}
