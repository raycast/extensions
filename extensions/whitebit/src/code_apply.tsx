import { Action, ActionPanel, Form, LaunchProps, open, popToRoot, showToast, Toast } from "@raycast/api";
import { useState } from "react";
import { CodesRequester } from "./api/codes";
import Style = Toast.Style;
import { FetchError } from "ofetch";
import { useHttpClient } from "./hooks/use-http-client";

export default function Command(props: LaunchProps<{ arguments: Arguments.CodeApply }>) {
  const args = props.arguments;

  const [code, setCode] = useState(args.code);
  const [password, setPassword] = useState(args.password);

  const client = useHttpClient();
  const codes = new CodesRequester(client);

  async function handleSubmit() {
    const toast = await showToast({ title: "Applying code..", style: Style.Animated });
    try {
      await codes.apply(code, password);

      toast.style = Style.Success;
      toast.title = "Applied successfully!";

      open("raycast://confetti");

      await popToRoot();
    } catch (e) {
      let message = "Unexpected error occurs";
      if (e instanceof FetchError) {
        message = e.message;

        const payload = e.response?._data;

        if (payload && payload.errors) {
          const errors = Object.values(payload.errors) as Array<Array<string>>;

          message = errors[0][0] || message;
        }
      }

      toast.title = "Error";
      toast.style = Style.Failure;
      toast.message = message;
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={handleSubmit} title="Apply Code" />
        </ActionPanel>
      }
    >
      <Form.TextField id="code" title="Code" value={code} onChange={setCode} placeholder="Enter your WhiteBIT code" />
      <Form.PasswordField
        id="password"
        title="Code Password"
        value={password}
        onChange={setPassword}
        placeholder="Leave empty if code not protected by password"
      />
    </Form>
  );
}
