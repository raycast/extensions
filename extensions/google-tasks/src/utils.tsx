import { Color, Icon } from "@raycast/api";
import { AssignmentInfo, Task } from "./types";

export const defaultListKey = "task-default-list-v1";

export function isCompleted(task: Task): boolean {
  return task.status === "completed";
}

export function dueDay(value?: string): string | undefined {
  return value?.slice(0, 10);
}

export function todayValue(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

export function getIcon(task: Task): { source: Icon; tintColor?: Color } {
  const completed = isCompleted(task);
  const due = dueDay(task.due);
  if (!completed && due && due < todayValue()) {
    return { source: Icon.Circle, tintColor: Color.Red };
  }
  if (completed) {
    return { source: Icon.Checkmark, tintColor: Color.Green };
  }
  return { source: Icon.Circle };
}

const surfaces = {
  DOCUMENT: { source: "Google Docs", icon: Icon.Document },
  SPACE: { source: "Google Chat", icon: Icon.SpeechBubble },
  SURFACE_TYPE_UNSPECIFIED: { source: "Other", icon: Icon.Document },
};

export function assignmentSurface(info?: AssignmentInfo) {
  return info ? surfaces[info.surfaceType ?? "SURFACE_TYPE_UNSPECIFIED"] : undefined;
}

export function assignmentDetails(info?: AssignmentInfo) {
  const surface = assignmentSurface(info);
  if (!info || !surface) return undefined;
  const fileId = info.driveResourceInfo?.driveFileId;
  const resourceKey = info.driveResourceInfo?.resourceKey;
  const spaceId = info.spaceInfo?.space?.replace(/^spaces\//, "");
  return {
    ...surface,
    linkToTask: info.linkToTask,
    fileUrl: fileId
      ? `https://drive.google.com/open?${new URLSearchParams({ id: fileId, ...(resourceKey ? { resourcekey: resourceKey } : {}) })}`
      : undefined,
    driveFileId: fileId,
    resourceKey,
    spaceUrl: spaceId ? `https://mail.google.com/chat/#chat/space/${spaceId}` : undefined,
    space: info.spaceInfo?.space,
  };
}
