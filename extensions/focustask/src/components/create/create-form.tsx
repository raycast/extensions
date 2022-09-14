import {Action, ActionPanel, Form, Icon} from "@raycast/api"
import {TaskStatus} from "api/types"
import {labelForTaskColumn} from "helpers/focustask"
import {useState} from "react"
import {ListPicker} from "./list-picker"

const STATUSES: TaskStatus[] = ["current", "next", "icebox"]

export const CreateForm = () => {
  const isLoading = false

  const [title, setTitle] = useState("")
  const [note, setNote] = useState("")
  const [status, setStatus] = useState<TaskStatus>("current")
  const [listId, setListId] = useState<string>()

  console.log("rendering the create form")

  const submit = () => {
    //
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

      <ListPicker value={listId} onChange={setListId} />
    </Form>
  )
}
