import { List, showToast, Toast } from "@raycast/api";
import { useState, useEffect, useRef } from "react";
import { ActivityListView } from "./ActivityListView";
import { createGroup, Group } from "../db";
import { showErrorHUD } from "../utils";

interface CreateGroupProps {
  title: string;
  onGroupCreated?: () => void;
}

export function CreateGroupView({ title, onGroupCreated }: CreateGroupProps) {
  const [createdGroup, setCreatedGroup] = useState<Group | null>(null);
  const hasCreated = useRef(false);

  useEffect(() => {
    if (hasCreated.current) return;
    hasCreated.current = true;

    (async () => {
      const toast = await showToast({ style: Toast.Style.Animated, title: "Creating group...", message: title });
      try {
        const newGroup = await createGroup(title);
        toast.style = Toast.Style.Success;
        toast.title = "Group created";
        setCreatedGroup(newGroup);
        onGroupCreated?.();
      } catch (error) {
        toast.style = Toast.Style.Failure;
        toast.title = "Failed to create group";
        await showErrorHUD("creating group", error);
      }
    })();
  }, [title, onGroupCreated]);

  if (!createdGroup) {
    return <List isLoading searchBarPlaceholder={`Creating "${title}"...`} navigationTitle="Creating Group" />;
  }

  return <ActivityListView group={createdGroup} />;
}
