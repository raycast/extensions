import { Icon, Image } from "@raycast/api";

import type { Label } from "@/types/fieldTemplate";
import { UserObject } from "@/types/user";

export function getIconByStatusState(statusId: string | undefined, statuses: Label[] | undefined) {
  const status = statuses?.find((item) => item.id === statusId)?.statusState ?? "default";

  switch (status) {
    case "default":
      return Icon.Circle;
    case "blocked":
      return Icon.MinusCircle;
    case "started":
      return Icon.CircleProgress50;
    case "canceled":
      return Icon.XMarkCircle;
    case "completed":
      return Icon.CheckCircle;
    default:
      return Icon.Window;
  }
}

export function getStatusById(status: string | undefined, statuses: Label[] | undefined) {
  return statuses?.find((item) => item.id === status);
}

export function getPriorityIcon(priority: string | undefined) {
  switch (priority) {
    case "High":
      return Icon.Exclamationmark3;
    case "Medium":
      return Icon.Exclamationmark2;
    case "Low":
      return Icon.Exclamationmark;
    default:
      return Icon.ExclamationMark;
  }
}

export function getAssignedUsers(assigneesIds: string[], users: UserObject[] | undefined) {
  return assigneesIds?.map((userId) => {
    const foundUser = users?.find((user) => user.id === userId);

    return {
      icon: {
        source: foundUser?.pictureUrl ?? Icon.Person,
        mask: Image.Mask.Circle,
      },
      tooltip: `${foundUser?.firstname} ${foundUser?.lastname}`,
    };
  });
}

export function getAssigneeById(assigneeId: string | undefined, users: UserObject[] | undefined) {
  return users?.find((user) => user.id === assigneeId);
}

export function getAssigneeFullNameById(assigneeId: string | undefined, users: UserObject[] | undefined) {
  if (assigneeId === "all") return "All";
  const foundUser = getAssigneeById(assigneeId, users);
  return `${foundUser?.firstname} ${foundUser?.lastname}`;
}
