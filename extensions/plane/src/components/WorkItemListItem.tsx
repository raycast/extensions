import { PriorityEnum } from "@makeplane/plane-node-sdk";
import { Color, Icon, List } from "@raycast/api";
import { ReactNode } from "react";
import { format } from "date-fns";
import { WorkItemSummary } from "../api/types";
import { priorityToIcon } from "../helpers/icons";
import { formatWorkItemIdentifier } from "../helpers/identifiers";
import { capitalizeString } from "../helpers/strings";
import { isOpenStateGroup } from "../helpers/state-groups";
import { fromPlaneDate } from "../helpers/dates";
import WorkItemActions, { WorkItemMutator } from "./actions/WorkItemActions";

type WorkItemListItemProps = {
  workItem: WorkItemSummary;
  mutate?: WorkItemMutator;
  mutateWorkItemList?: () => void;
  currentUserId?: string;
  /** Show the project name as subtitle (cross-project lists). */
  showProject?: boolean;
  detail?: ReactNode;
  extraActions?: ReactNode;
};

export default function WorkItemListItem({
  workItem,
  mutate,
  mutateWorkItemList,
  currentUserId,
  showProject,
  detail,
  extraActions,
}: WorkItemListItemProps) {
  const identifier = formatWorkItemIdentifier(workItem.projectIdentifier, workItem.sequenceId);
  const accessories: List.Item.Accessory[] = [];

  if (!detail) {
    if (workItem.priority && workItem.priority !== PriorityEnum.None) {
      accessories.push({
        icon: priorityToIcon(workItem.priority),
        tooltip: `Priority: ${capitalizeString(workItem.priority)}`,
      });
    }
    if (workItem.assigneeIds && workItem.assigneeIds.length > 0) {
      const assignedToMe = !!currentUserId && workItem.assigneeIds.includes(currentUserId);
      accessories.push({
        icon: assignedToMe ? Icon.PersonCircle : Icon.Person,
        text: workItem.assigneeIds.length > 1 ? String(workItem.assigneeIds.length) : undefined,
        tooltip: assignedToMe ? "Assigned to you" : `${workItem.assigneeIds.length} assignee(s)`,
      });
    }
    // `fromPlaneDate` keeps the stored calendar day; `new Date("YYYY-MM-DD")` is the day before west of UTC.
    const due = fromPlaneDate(workItem.targetDate);
    if (due) {
      const overdue = due.getTime() < Date.now() && isOpenStateGroup(workItem.state?.group);
      accessories.push({
        icon: { source: Icon.Calendar, tintColor: overdue ? Color.Red : undefined },
        text: format(due, "MMM d"),
        tooltip: `Due ${format(due, "dd MMM yyyy")}${overdue ? " (overdue)" : ""}`,
      });
    }
    if (workItem.state) {
      accessories.push({ tag: { value: workItem.state.name, color: workItem.state.color } });
    }
  }

  return (
    <List.Item
      icon={
        workItem.state
          ? { source: Icon.Circle, tintColor: workItem.state.color, tooltip: workItem.state.name }
          : { source: Icon.BullsEye, tooltip: identifier }
      }
      title={workItem.name}
      subtitle={showProject && workItem.projectName ? `${identifier} · ${workItem.projectName}` : identifier}
      keywords={[identifier, String(workItem.sequenceId), workItem.projectIdentifier, workItem.projectName ?? ""]}
      accessories={accessories}
      detail={detail}
      actions={
        <WorkItemActions
          workItem={workItem}
          mutate={mutate}
          onChanged={mutateWorkItemList}
          mutateWorkItemList={mutateWorkItemList}
          currentUserId={currentUserId}
          extraActions={extraActions}
        />
      }
    />
  );
}
