import { LaunchProps, LaunchType, updateCommandMetadata } from "@raycast/api";
import { getActivities } from "./api/client";
import { hasAccessToken } from "./api/oauth";
import { toLocalDateString } from "./utils";

export default async function Command(props: LaunchProps) {
  // The sign-in flow can't be shown from a background refresh.
  if (props.launchType === LaunchType.Background && !(await hasAccessToken())) {
    return;
  }

  const today = toLocalDateString(new Date());

  try {
    const res = await getActivities({ from: today, to: today, limit: 10 });
    const activities = res.activities;

    if (activities.length === 0) {
      await updateCommandMetadata({ subtitle: "Rest Day" });
      return;
    }

    const parts = activities.map((a) => {
      const status = a.completed ? "✓" : "○";
      return `${status} ${a.title}`;
    });

    await updateCommandMetadata({ subtitle: parts.join(" · ") });
  } catch (error) {
    if (props.launchType === LaunchType.Background) {
      return;
    }
    throw error;
  }
}
