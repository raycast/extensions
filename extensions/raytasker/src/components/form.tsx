import { Action, ActionPanel, Color, Form, Icon, showToast, Toast, useNavigation } from "@raycast/api"
import { useState } from "react"
import { FormProps, Task } from "../interfaces"
import * as google from "./../oauth/google"

export function EditTaskForm(props: FormProps) {
  const { pop } = useNavigation()
  const [isChanged, setIsChanged] = useState<boolean>(false)
  const [isLoading, setIsLoading] = useState<boolean>(false)

  return (
    <Form
      isLoading={isLoading}
      navigationTitle={"Task"}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Save"
            icon={{ source: Icon.Upload, tintColor: Color.Blue }}
            shortcut={{ modifiers: ["cmd"], key: "enter" }}
            onSubmit={async (values) => {

              // Handle no changes
              if (!isChanged) {
                // props.isLoading(false)
                pop()
                return
              }
              setIsLoading(true)
              // Handle new Task
              if (props.createNew) {
                const res = await google.createTask(values.list, values)
                if (res.status == 200) {
                  showToast({ title: `Task Created`, style: Toast.Style.Success })
                  await props.addTask(await res.json())
                } else {
                  showToast({ title: `Error: ${res.status}`, style: Toast.Style.Failure })
                }

                props.isLoading(false)
                pop()
                return
              } else {

                // Handle moved list
                if (props.task && props.currentList != values.list) {
                  const res = await google.moveTask(values.list, props.task.id)
                  if (res.status == 200) {
                    showToast({ title: `Task Created`, style: Toast.Style.Success })
                  } else {
                    showToast({ title: `Error: ${res.status}`, style: Toast.Style.Failure })
                  }
                  props.isLoading(false)
                  pop()
                } else {
                  // handle patching.
                  const patchTask = await Object.keys(values)
                    .filter((k) => (values[k] != null) && (values[k] != undefined) && (values[k] != ""))
                    .reduce((a, k) => ({ ...a, [k]: values[k] }), {}) as Task

                  const res = await google.patchTask(props?.task?.id ? props.task.id : "", patchTask.list ? patchTask.list : props.currentList, patchTask as Task)

                  if (res.status == 200) {
                    showToast({ title: `Task updated`, style: Toast.Style.Success })
                    await props.editTask(await res.json(), props.index)
                  } else {
                    showToast({ title: `Error: ${res.status}`, style: Toast.Style.Failure })
                  }
                  props.isLoading(false)
                  pop()
                }
              }
            }}
          />
        </ActionPanel>
      }

    >
      <Form.TextField
        id="title"
        title="Title"
        onChange={() => setIsChanged(true)}
        defaultValue={props?.task?.title || undefined} />

      <Form.DatePicker
        id="due"
        title="Deadline"
        onChange={() => setIsChanged(true)}
        defaultValue={props?.task?.due ? new Date(props.task.due) : undefined}
      />
      <Form.Separator />
      <Form.TextArea
        id="notes"
        title="Description"
        onChange={() => setIsChanged(true)}
        defaultValue={props?.task?.notes || undefined} />
      <Form.Dropdown
        id="list"
        title="List"
        onChange={() => setIsChanged(true)}
        defaultValue={props.currentList}>
        {props.lists.map(list => <Form.Dropdown.Item value={list.id} key={list.id} title={list.title} icon={Icon.Dot} />)}
      </Form.Dropdown>
    </Form>
  )
}
