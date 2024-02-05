import { LinearWorkflowStateType, LinearIssueNotification, LinearWorkflowState } from "../types";
import { getLinearNotificationReasonAccessory, getLinearUserAccessory } from "../accessories";
import { NotificationActions } from "../../../action/NotificationActions";
import { LinearIssuePreview } from "../preview/LinearIssuePreview";
import { Notification } from "../../../notification";
import { MutatePromise } from "@raycast/utils";
import { Page } from "../../../types";
import { match, P } from "ts-pattern";
import { List } from "@raycast/api";

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
  const projectSubtitle = match(linearIssueNotification.issue.project)
    .with({ name: P.select(), icon: P.nullish }, (project_name) => `/ ${project_name}`)
    .with(
      { name: P.select("project_name"), icon: P.select("icon") },
      ({ project_name, icon }) => `/ ${icon} ${project_name}`,
    )
    .otherwise(() => "");
  const teamSubtitle = match(linearIssueNotification.issue.team)
    .with({ name: P.select(), icon: P.nullish }, (team_name) => `${team_name}`)
    .with({ name: P.select("team_name"), icon: P.select("icon") }, ({ team_name, icon }) => `${icon} ${team_name}`)
    .otherwise(() => "");
  const subtitle = `${teamSubtitle} ${projectSubtitle} #${linearIssueNotification.issue.identifier}`;

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
