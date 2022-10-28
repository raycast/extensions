import {
  Action,
  ActionPanel,
  Form,
  Icon,
  popToRoot,
  showToast,
  Toast,
  open,
} from "@raycast/api"
import {FormValidation, useForm} from "@raycast/utils"
import {createTask} from "api/helpers"
import {TaskStatus} from "api/types"
import {labelForTaskColumn} from "helpers/focustask"
import {FC} from "react"
import {ListPicker} from "./list-picker"

const STATUSES: TaskStatus[] = ["current", "next", "icebox"]

interface CreateFormValues {
  title: string
  note: string
  status: string
  checklistId: string | undefined
}

export const CreateForm: FC<{initialTitle?: string}> = ({initialTitle}) => {
  const isLoading = false

  const {handleSubmit, itemProps} = useForm<CreateFormValues>({
    async onSubmit(values) {
      const toast = await showToast({
        style: Toast.Style.Animated,
        title: "Creating task",
        message: "This should only take a moment",
      })

      const {title, note, status, checklistId} = values
      const response = await createTask({
        title,
        note,
        status: status as TaskStatus,
        checklistId,
      })

      if ("id" in response) {
        toast.style = Toast.Style.Success
        toast.title = "Success"
        toast.message = "Task created"
        toast.primaryAction = {
          title: "Open Task",
          onAction: (toast) => {
            open(response.url)
            toast.hide()
          },
        }
      } else {
        toast.style = Toast.Style.Success
        toast.title = "Failure"
        toast.message = "Failed to create a task"
      }

      popToRoot()
    },
    validation: {
      title: FormValidation.Required,
    },
  })

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Create Task"
            onSubmit={handleSubmit}
            icon={Icon.Plus}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        title="Title"
        placeholder="Enter the task title"
        {...itemProps.title}
      />

      <Form.TextArea
        title="Note"
        placeholder="Enter the note"
        {...itemProps.note}
      />

      <Form.Separator />

      <Form.Dropdown title="Status" {...itemProps.status}>
        {STATUSES.map((status) => (
          <Form.Dropdown.Item
            value={status}
            title={labelForTaskColumn(status) ?? ""}
            key={status}
            // icon={{source: icon ? icon : Icon.Dot, tintColor: color}}
          />
        ))}
      </Form.Dropdown>

      <ListPicker {...itemProps.checklistId} />
    </Form>
  )
}
