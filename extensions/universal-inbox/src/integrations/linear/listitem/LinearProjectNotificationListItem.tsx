import { getLinearNotificationReasonAccessory, getLinearUserAccessory } from "../accessories";
import { LinearProjectNotification, LinearProjectState, LinearProject } from "../types";
import { NotificationActions } from "../../../action/NotificationActions";
import { LinearProjectPreview } from "../preview/LinearProjectPreview";
import { Notification } from "../../../notification";
import { MutatePromise } from "@raycast/utils";
import { List, Color } from "@raycast/api";
import { Page } from "../../../types";
import { match, P } from "ts-pattern";

interface LinearProjectNotificationListItemProps {
  notification: Notification;
  linearProjectNotification: LinearProjectNotification;
  mutate: MutatePromise<Page<Notification> | undefined>;
}

export function LinearProjectNotificationListItem({
  notification,
  linearProjectNotification,
  mutate,
}: LinearProjectNotificationListItemProps) {
  const subtitle = match(linearProjectNotification.project)
    .with({ name: P.select(), icon: P.nullish }, (project_name) => `${project_name}`)
    .with(
      { name: P.select("project_name"), icon: P.select("icon") },
      ({ project_name, icon }) => `${icon} ${project_name}`,
    )
    .otherwise(() => "");

  const state = getLinearProjectStateAccessory(linearProjectNotification.project);
  const lead = getLinearUserAccessory(linearProjectNotification.project.lead);
  const reason = getLinearNotificationReasonAccessory(linearProjectNotification.type);

  const accessories: List.Item.Accessory[] = [
    reason,
    state,
    lead,
    {
      date: new Date(linearProjectNotification.updated_at),
      tooltip: `Updated at ${linearProjectNotification.updated_at}`,
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
          detailsTarget={
            <LinearProjectPreview notification={notification} linearProject={linearProjectNotification.project} />
          }
          mutate={mutate}
        />
      }
    />
  );
}

export function getLinearProjectStateAccessory(project: LinearProject): List.Item.Accessory {
  return {
    icon: match(project)
      .with({ state: LinearProjectState.Planned }, () => {
        return { source: "linear-project-planned.svg", tintColor: Color.SecondaryText };
      })
      .with({ state: LinearProjectState.Backlog }, () => {
        return { source: "linear-project-backlog.svg", tintColor: Color.PrimaryText };
      })
      .with({ state: LinearProjectState.Started }, () => {
        return { source: "linear-project-started.svg", tintColor: Color.Blue };
      })
      .with({ state: LinearProjectState.Paused }, () => {
        return { source: "linear-project-paused.svg", tintColor: Color.PrimaryText };
      })
      .with({ state: LinearProjectState.Completed }, () => {
        return { source: "linear-project-completed.svg", tintColor: Color.Magenta };
      })
      .with({ state: LinearProjectState.Canceled }, () => {
        return { source: "linear-project-canceled.svg", tintColor: Color.SecondaryText };
      })
      .exhaustive(),
    tooltip: project.state,
  };
}
