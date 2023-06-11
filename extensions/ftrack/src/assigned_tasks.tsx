// :copyright: Copyright (c) 2023 ftrack
import "cross-fetch/polyfill";
import { List, getPreferenceValues } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { buildExpression } from "./util/buildExpression";
import { session } from "./util/session";
import { Preferences, TypedContextEntity } from "./types";
import { configuration, EntityListItem } from "./EntityListItem";

const preferences = getPreferenceValues<Preferences>();

const typedContextConfiguration = configuration.TypedContext;

async function getAssignedTasks() {
  await session.initializing;

  const filters = [
    `assignments.resource.username is "${session.apiUser}"`,
    "status.state.short is_not 'DONE'",
    "project.status is_not 'hidden'",
    "ancestors.status.state.short is_not 'BLOCKED'",
  ];
  if (preferences.assignedTasksFilter) {
    filters.push(preferences.assignedTasksFilter);
  }

  const expression = buildExpression({
    entityType: "Task",
    projection: typedContextConfiguration.projection,
    filter: filters,
    order: "status.sort asc, name asc",
    limit: 200,
  });

  const response = await session.query(expression);
  return response.data as TypedContextEntity[];
}

export default function AssignedTasksCommand() {
  const { data, isLoading, revalidate } = usePromise(getAssignedTasks);
  return (
    <List isLoading={isLoading}>
      {data?.map((entity) => (
        <EntityListItem
          key={entity.id}
          entity={entity}
          configuration={typedContextConfiguration}
          revalidate={revalidate}
        />
      ))}
    </List>
  );
}
