import { Action, ActionPanel, Form } from "@raycast/api";
import moment from "moment";
import { useEffect, useState } from "react";
import { Task } from "../type/Task"
import { debounce } from "lodash";
export interface EditTaskProps {
    task: Task;
    index: number;
    onEdit: (index: number, values: Task) => void
}


export const EditTaskForm = ({ index, onEdit, task: initialValue }: EditTaskProps) => {
    const [task, setTask] = useState<Task>(initialValue)
    const [dateError, setDateError] = useState("")
    const [manHourError, setManHourError] = useState("")
    const handleSubmit = (values: Task) => {
        onEdit(index, values)
    }

    const date = moment(task.date, "DD-MM-YYYY").isValid() ? moment(task.date, "DD-MM-YYYY").format("DD-MM-YYYY") : moment().format("DD-MM-YYYY")
    useEffect(() => {
        if (!moment(task.date, "DD-MM-YYYY").isValid()) {
            setDateError("Invalid date format (DD-MM-YYYY)")
        } else {
            setDateError("")
        }
        if (task.manhours < 1 || task.manhours > 8) {
            setManHourError("Hours can not be less then 1 or more then 8")
            console.log(task.manhours);
        } else {
            setManHourError("")
        }

    }, [task.date, task.manhours])
    return (
        <Form
            actions={
                <ActionPanel>
                    <Action.SubmitForm title="Edit Task" onSubmit={handleSubmit} />
                </ActionPanel>
            }
        >
            <Form.TextField id="task" title="Task" defaultValue={task.task} onChange={(newValue) => setTask({ ...task, task: newValue })} />
            <Form.TextField id="manhours" title="Man hours" error={manHourError} defaultValue={`${task.manhours}`} onChange={(newValue) => setTask({ ...task, manhours: Number.parseInt(newValue) })} />
            <Form.TextField id="module" title="Module" defaultValue={task.module} />
            <Form.TextField id="subTaskInput" title="Sub task" defaultValue={task.subTask} />
            <Form.TextField id="remark" title="Remark" defaultValue={task.remark} />
            <Form.TextField id="crNo" title="Cr No" defaultValue={task.crNo} />
            <Form.TextField id="date" title="Date" defaultValue={`${date}`} error={dateError} onChange={debounce((newValue) => setTask({ ...task, date: newValue }), 1000)} />
        </Form>
    )

}