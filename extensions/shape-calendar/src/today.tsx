import { LaunchProps, LaunchType, updateCommandMetadata } from "@raycast/api";
import { getActivities } from "./api/client";

export default async function Command(props: LaunchProps) {
  const today = new Date().toISOString().split("T")[0];

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
