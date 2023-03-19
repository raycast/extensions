import { Action, Icon } from "@raycast/api";
import { Task } from "../type/Task";
import { EditTaskForm } from "./EditTaskForm";

export const EditTaskAction = (props: { onEdit: (index: number, task: Task) => void, task: Task, index: number }) => {
    return (
        <Action.Push
            icon={Icon.Trash}
            title="Edit Task"
            target={<EditTaskForm onEdit={props.onEdit} task={props.task} index={props.index} />}
        />
    );
}
