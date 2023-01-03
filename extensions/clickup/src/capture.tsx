import {Form, ActionPanel, Action, showToast, Toast, popToRoot,} from "@raycast/api";
import {useState} from "react";
import {ClickUpClient} from "./utils/clickUpClient";
import {TaskItem} from "./types/tasks.dt";
import preferences from "./utils/preferences";

interface FormValues {
    name: string;
    description: string;
    dueDate: string;
    priority: number;
}

export default function QuickCapture() {
    // Error message for the primary TextArea
    const [textErrorMessage, setTextErrorMessage] = useState<string | undefined>();
    const [task, setTask] = useState<TaskItem | undefined>(undefined);


    // Clear the text error message
    const clearTextErrorMessage = () => setTextErrorMessage(undefined);

    const handleSubmit = async (formValues: FormValues) => {
        if (!formValues.name) return setTextErrorMessage("Required");

        const data: Record<string, any> = {'name': formValues.name,}
        if (formValues.description) {
            data['description'] = formValues.description;
        }
        if (formValues.dueDate) {
            data['due_date'] = new Date(formValues.dueDate).getTime();
            console.log(data['due_date']);
        }
        if (formValues.priority) {
            data['priority'] = formValues.priority;
        }

        await ClickUpClient<TaskItem>(`/list/${preferences.listId}/task`, "POST", data).then(
            () => {
                // Ensure the user sees root search when they re-open Raycast
                popToRoot();
            }
        )
            .catch((err) => {
                console.log(err)
                showToast({title: "Something went wrong", message: "Please try again", style: Toast.Style.Failure})
            });
    };

    return (
        <Form
            actions={
                <ActionPanel>
                    <Action.SubmitForm title="Submit" onSubmit={handleSubmit}/>
                </ActionPanel>
            }
        >
            <Form.TextField
                id="name"
                placeholder="Task..."
                error={textErrorMessage}
                onChange={clearTextErrorMessage}
            />
            <Form.Separator/>
            <Form.TextArea id="description"
                           placeholder="Description"
                           error={textErrorMessage}
                           onChange={clearTextErrorMessage}
            />
            <Form.DatePicker title="Due Date" id="dueDate"/>
            <Form.Dropdown id="priority" title="Priority" defaultValue="3">
                <Form.Dropdown.Item value="1" title="Urgent" icon="🚨️" />
                <Form.Dropdown.Item value="2" title="High" icon="⏫" />
                <Form.Dropdown.Item value="3" title="Normal" icon="🟢" />
                <Form.Dropdown.Item value="4" title="Low" icon="⏬" />
            </Form.Dropdown>
        </Form>
    );
}
