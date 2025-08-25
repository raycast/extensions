import { BabyBuddyAPI } from "../api";
import { formatErrorMessage } from "../utils";

export default async function () {
  try {
    const api = new BabyBuddyAPI();
    const activeTimers = await api.getActiveTimers();

    // Filter for sleep timers
    const sleepTimers = activeTimers.filter((timer) => timer.name.toLowerCase().includes("sleep"));

    // Get children details for each sleep timer
    const children = await api.getChildren();

    const sleepingChildren = sleepTimers
      .map((timer) => {
        const child = children.find((c) => c.id === timer.child);
        return {
          id: child?.id,
          name: child?.first_name,
          sleepingSince: timer.start,
          timerId: timer.id,
        };
      })
      .filter((child) => child.id !== undefined);

    return sleepingChildren;
  } catch (error) {
    throw new Error("Failed to fetch sleeping children: " + formatErrorMessage(error));
  }
}
