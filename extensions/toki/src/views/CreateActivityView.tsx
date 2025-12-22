import { List, showToast, Toast } from "@raycast/api";
import { useState, useEffect, useRef } from "react";
import { Group, Activity, createActivity } from "../db";
import { showErrorHUD } from "../utils";
import { SelectActionView } from "./SelectActionView";

interface CreateActivityProps {
  group: Group;
  title: string;
}

export function CreateActivityView({ group, title }: CreateActivityProps) {
  const [createdActivity, setCreatedActivity] = useState<Activity | null>(null);
  const hasCreated = useRef(false);

  useEffect(() => {
    if (hasCreated.current) return;
    hasCreated.current = true;

    (async () => {
      const toast = await showToast({ style: Toast.Style.Animated, title: "Creating activity...", message: title });
      try {
        const newActivity = await createActivity(group.uuid, title);
        toast.style = Toast.Style.Success;
        toast.title = "Activity created";
        setCreatedActivity(newActivity);
      } catch (error) {
        toast.style = Toast.Style.Failure;
        toast.title = "Failed to create";
        await showErrorHUD("creating activity", error);
      }
    })();
  }, [group.uuid, title]);

  if (!createdActivity) {
    return <List isLoading searchBarPlaceholder={`Creating "${title}"...`} navigationTitle="Creating Activity" />;
  }

  return <SelectActionView group={group} activity={createdActivity} />;
}
