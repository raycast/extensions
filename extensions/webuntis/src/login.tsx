/* eslint-disable @typescript-eslint/no-explicit-any */

import { Action, ActionPanel, Form, LocalStorage, showToast, Toast } from "@raycast/api";
import { FormValidation, useForm } from "@raycast/utils";

export default function Login() {
  const { handleSubmit, itemProps } = useForm<any>({
    onSubmit(values) {
      showToast({
        style: Toast.Style.Success,
        title: "Success!",
        message: `Login credentials saved.`,
      });
      LocalStorage.setItem("credentials", JSON.stringify(values));
    },
    validation: {
      username: FormValidation.Required,
      password: FormValidation.Required,
      school: FormValidation.Required,
      server: FormValidation.Required,
    },
  });

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Submit" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField title="Username" placeholder="Enter your username" {...itemProps.username} />
      <Form.PasswordField title="Password" placeholder="Enter your password" {...itemProps.password} />
      <Form.TextField title="School" placeholder="Enter your school" {...itemProps.school} />
      <Form.TextField title="Server" placeholder="Enter your server" {...itemProps.server} />
    </Form>
  );
}
