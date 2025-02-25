import { Action, ActionPanel, Form, showToast, Toast } from "@raycast/api"
import { useForm, FormValidation } from "@raycast/utils"
import { compareSync } from "bcryptjs"

type FormValues = {
  password: string
  hash: string
}

export default function CompareForm() {
  const { handleSubmit, itemProps } = useForm<FormValues>({
    validation: {
      password: FormValidation.Required,
      hash: FormValidation.Required,
    },
    async onSubmit(values) {
      const matchPassword = compareSync(values.password, values.hash)
      showToast({
        style: matchPassword ? Toast.Style.Success : Toast.Style.Failure,
        title: matchPassword ? "Password Matched" : "Wrong Password",
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
      <Form.TextField title="Hash" {...itemProps.hash} />
    </Form>
  )
}
