import { Action, ActionPanel, Form } from "@raycast/api"
import { Task } from "../type/Task"

export interface CreateTaskProps {
    onCreate: (task: Task) => void;
}
export const CreateTaskForm = (props: CreateTaskProps) => {

    const handleSubmit = (values: Task) => {
        props.onCreate(values)
    }
    return (
        <Form
            actions={
                <ActionPanel>
                    <Action.SubmitForm title="Create New Task" onSubmit={handleSubmit} />
                </ActionPanel>
            }
        >
            <Form.TextField id="task" title="Task" />
            <Form.TextField id="manhours" title="Man hours" />
            <Form.TextField id="module" title="Module" />
            <Form.TextField id="subTaskInput" title="Sub task" />
            <Form.TextField id="remark" title="Remark" />
            <Form.TextField id="crNo" title="Cr No" />
            <Form.TextField id="date" title="Date" />
        </Form>
    )
}