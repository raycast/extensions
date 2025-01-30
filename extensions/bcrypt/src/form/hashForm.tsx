import { Action, ActionPanel, Form, showToast, Toast, Clipboard } from "@raycast/api"
import { useForm, FormValidation } from "@raycast/utils"
import { hashSync } from "bcryptjs"

type FormValues = {
  password: string
  salt: string
}

export default function HashForm() {
  const { handleSubmit, itemProps } = useForm<FormValues>({
    initialValues: {
      salt: "10",
    },
    validation: {
      password: FormValidation.Required,
      salt: (value) => {
        if (!Number(value)) return "The item must be a number"
      },
    },
    async onSubmit(values) {
      await Clipboard.copy(hashSync(values.password, parseInt(values.salt)))
      showToast({
        style: Toast.Style.Success,
        title: "hash copied to clipboard",
      })
    },
  })

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Submit" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField title="Password" {...itemProps.password} />
      <Form.TextField title="Salt" placeholder="10" {...itemProps.salt} />
    </Form>
  )
}
