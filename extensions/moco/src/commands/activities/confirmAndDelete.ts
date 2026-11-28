import { Alert, confirmAlert } from "@raycast/api";
import { deleteActivity } from "./api";
import { Activity } from "./types";

// A deleted activity cannot be restored in MOCO, so every delete asks first. Returns true only if MOCO deleted it.
export const confirmAndDeleteActivity = async (activity: Activity): Promise<boolean> => {
  const confirmed = await confirmAlert({
    title: "Delete Activity?",
    message: `${activity.project.name} / ${activity.task.name}: ${activity.description}`,
    primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
  });
  return confirmed && (await deleteActivity(activity.id)) === true;
};
