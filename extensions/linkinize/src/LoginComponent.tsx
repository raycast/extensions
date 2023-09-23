import { useNavigation, Form, ActionPanel, Action, Detail } from "@raycast/api";
import { useState } from "react";
import { LoginPayload } from "./interfaces";
import { validateLoginPayload, attemptLogin } from "./support";
import { LINKINIZE_DOMAIN } from "./constants";

export function Login() {
  const { push } = useNavigation();
  const [emailError, setEmailError] = useState<string | undefined>();
  const [passwordError, setPasswordError] = useState<string | undefined>();

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Login"
            onSubmit={async (values: LoginPayload) => {
              console.log("onSubmit", values);
              const errors = validateLoginPayload(values);
              if (!Object.keys(errors).length) {
                await attemptLogin(values);
                return;
              }
              setEmailError(errors.email);
              setPasswordError(errors.password);
            }}
          ></Action.SubmitForm>
          <Action.OpenInBrowser url={`${LINKINIZE_DOMAIN}/register`} title="Register" />
        </ActionPanel>
      }
    >
      <Form.Description text="Login with your Linkinize.com Accoount" />
      <Form.TextField
        id="email"
        title="Email Address"
        placeholder="you@email.com"
        error={emailError}
        onChange={() => setEmailError(undefined)}
      ></Form.TextField>
      <Form.PasswordField
        id="password"
        title="Password"
        onChange={() => setPasswordError(undefined)}
        error={passwordError}
      ></Form.PasswordField>
    </Form>
  );
}
