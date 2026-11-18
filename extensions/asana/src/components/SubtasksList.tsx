import { List } from "@raycast/api";
import { Task } from "../api/tasks";
import { useSubtasks } from "../hooks/useSubtasks";
import TaskListItem from "./TaskListItem";

type SubtasksListProps = {
  parentTask: Task;
  workspace?: string;
};

export default function SubtasksList({ parentTask, workspace }: SubtasksListProps) {
  const { data: subtasks, isLoading, mutate } = useSubtasks(parentTask.gid);

  return (
    <List navigationTitle={`Subtasks of ${parentTask.name}`} isLoading={isLoading}>
      <List.EmptyView title="No subtasks" description="This task has no subtasks." />
      {subtasks?.map((subtask) => (
        <TaskListItem key={subtask.gid} task={subtask} workspace={workspace} mutateList={mutate} />
      ))}
    </List>
  );
}
