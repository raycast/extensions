import { BabyBuddyAPI } from "../api";

export default async function () {
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
}
