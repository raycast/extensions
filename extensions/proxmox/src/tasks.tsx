import { List } from "@raycast/api";
import { type TaskListGroup, useTaskList } from "@/hooks/use-task-list";
import { NoServersEmptyView } from "@/components/NoServersEmptyView";
import { ServerErrorItem } from "@/components/ServerErrorItem";
import { TaskListItem } from "@/components/TaskListItem";

const Command = () => {
  const { isLoading, groups, hasServers, revalidate } = useTaskList();
  const showSections = groups.length > 1;
  const showNoServers = !isLoading && !hasServers;

  const renderGroup = (group: TaskListGroup) => {
    const items =
      group.error !== undefined ? (
        <ServerErrorItem
          key={`${group.server.id}/error`}
          server={group.server}
          error={group.error}
          revalidate={revalidate}
        />
      ) : (
        group.tasks.map((task) => (
          <TaskListItem
            key={`${group.server.id}/${task.upid}`}
            server={group.server}
            task={task}
            revalidate={revalidate}
          />
        ))
      );

    return (
      <List.Section
        key={group.server.id}
        title={showSections ? group.server.name : undefined}
        subtitle={showSections && group.error === undefined ? `${group.tasks.length}` : undefined}
      >
        {items}
      </List.Section>
    );
  };

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search tasks">
      {showNoServers ? <NoServersEmptyView /> : groups.map(renderGroup)}
    </List>
  );
};

export default Command;
