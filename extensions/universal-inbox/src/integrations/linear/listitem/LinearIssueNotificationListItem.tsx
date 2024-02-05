import { LinearWorkflowStateType, LinearIssueNotification, LinearWorkflowState } from "../types";
import { getLinearNotificationReasonAccessory, getLinearUserAccessory } from "../accessories";
import { NotificationActions } from "../../../action/NotificationActions";
import { LinearIssuePreview } from "../preview/LinearIssuePreview";
import { Notification } from "../../../notification";
import { MutatePromise } from "@raycast/utils";
import { Page } from "../../../types";
import { List } from "@raycast/api";
import { match } from "ts-pattern";

interface LinearIssueNotificationListItemProps {
  notification: Notification;
  linearIssueNotification: LinearIssueNotification;
  mutate: MutatePromise<Page<Notification> | undefined>;
}

export function LinearIssueNotificationListItem({
  notification,
  linearIssueNotification,
  mutate,
}: LinearIssueNotificationListItemProps) {
  const projectSubtitle = linearIssueNotification.issue.project
    ? `/ ${linearIssueNotification.issue.project.name} `
    : "";
  const subtitle = `${linearIssueNotification.issue.team.name} ${projectSubtitle}#${linearIssueNotification.issue.identifier}`;

  const state = getLinearIssueStateAccessory(linearIssueNotification.issue.state);
  const assignee = getLinearUserAccessory(linearIssueNotification.issue.assignee);
  const reason = getLinearNotificationReasonAccessory(linearIssueNotification.type);

  const accessories: List.Item.Accessory[] = [
    reason,
    state,
    assignee,
    {
      date: new Date(linearIssueNotification.updated_at),
      tooltip: `Updated at ${linearIssueNotification.updated_at}`,
    },
  ];

  return (
    <List.Item
      key={notification.id}
      title={notification.title}
      icon={{ source: { light: "linear-logo-dark.svg", dark: "linear-logo-light.svg" } }}
      accessories={accessories}
      subtitle={subtitle}
      actions={
        <NotificationActions
          notification={notification}
          detailsTarget={<LinearIssuePreview notification={notification} linearIssue={linearIssueNotification.issue} />}
          mutate={mutate}
        />
      }
    />
  );
}

export function getLinearIssueStateAccessory(state: LinearWorkflowState): List.Item.Accessory {
  return {
    icon: {
      source: match(state)
        .with({ type: LinearWorkflowStateType.Triage }, () => "linear-issue-triage.svg")
        .with({ type: LinearWorkflowStateType.Backlog }, () => "linear-issue-backlog.svg")
        .with({ type: LinearWorkflowStateType.Unstarted }, () => "linear-issue-unstarted.svg")
        .with({ type: LinearWorkflowStateType.Started }, () => "linear-issue-started.svg")
        .with({ type: LinearWorkflowStateType.Completed }, () => "linear-issue-completed.svg")
        .with({ type: LinearWorkflowStateType.Canceled }, () => "linear-issue-canceled.svg")
        .exhaustive(),
      tintColor: state.color,
    },
    tooltip: state.name,
  };
}
