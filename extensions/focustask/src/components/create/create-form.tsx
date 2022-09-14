import {Action, ActionPanel, Form, Icon, showToast, Toast} from "@raycast/api"
import {createTask} from "api/helpers"
import {TaskStatus} from "api/types"
import {labelForTaskColumn} from "helpers/focustask"
import {FC, useState} from "react"
import {ListPicker} from "./list-picker"

const STATUSES: TaskStatus[] = ["current", "next", "icebox"]

export const CreateForm: FC<{initialTitle?: string}> = ({initialTitle}) => {
  const isLoading = false

  const [title, setTitle] = useState(initialTitle ?? "")
  const [note, setNote] = useState("")
  const [status, setStatus] = useState<TaskStatus>("current")
  const [checklistId, setChecklistId] = useState<string>()

  const submit = async () => {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Creating task",
      message: "This should only take a moment",
    })

    const response = await createTask({title, note, status, checklistId})

    if ("id" in response) {
      toast.style = Toast.Style.Success
      toast.title = "Success"
      toast.message = "Task created"
    } else {
      toast.style = Toast.Style.Success
      toast.title = "Failure"
      toast.message = "Failed to create a task"
    }
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Create Task"
            onSubmit={submit}
            icon={Icon.Plus}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="content"
        title="Title"
        placeholder="Enter the task title"
        value={title}
        onChange={setTitle}
      />

      <Form.TextArea
        id="note"
        title="Note"
        placeholder="Enter the note"
        value={note}
        onChange={setNote}
      />

      <Form.Separator />

      <Form.Dropdown
        id="status"
        title="Status"
        value={status}
        onChange={(value) => setStatus(value as TaskStatus)}
      >
        {STATUSES.map((status) => (
          <Form.Dropdown.Item
            value={status}
            title={labelForTaskColumn(status) ?? ""}
            key={status}
            // icon={{source: icon ? icon : Icon.Dot, tintColor: color}}
          />
        ))}
      </Form.Dropdown>

      <ListPicker value={checklistId} onChange={setChecklistId} />
    </Form>
  )
}
