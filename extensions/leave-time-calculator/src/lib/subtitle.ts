import { updateCommandMetadata } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { buildLeaveStatus, formatTopSubtitle } from "./leave-status";
import { getWorkPreferences } from "./preferences";
import { getTodayStartTime } from "./storage";
import { formatTimeString } from "./time-utils";

export async function updateCurrentCommandSubtitle() {
  try {
    const { workHours, breakMinutes } = getWorkPreferences();
    const todayStart = await getTodayStartTime();

    if (!todayStart) {
      await updateCommandMetadata({ subtitle: "" });
      return;
    }

    const now = new Date();
    const currentTime = formatTimeString(now.getHours(), now.getMinutes());
    const status = buildLeaveStatus(
      todayStart,
      workHours,
      breakMinutes,
      currentTime,
    );
    await updateCommandMetadata({ subtitle: formatTopSubtitle(status) });
  } catch (err) {
    await showFailureToast(
      `Failed to update menu subtitle: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
}
