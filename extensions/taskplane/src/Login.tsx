import axios from "axios";
import { AuthContext, API_URL } from "./lib";
import { LocalStorage, showToast, Toast, Form, ActionPanel, Action, Icon, open } from "@raycast/api";
import { useContext, useState } from "react";

export default function Login() {
  const { setToken } = useContext(AuthContext);
  const [nameError, setNameError] = useState<string | undefined>();
  const [passwordError, setPasswordError] = useState<string | undefined>();

  function dropNameErrorIfNeeded() {
    if (nameError && nameError.length > 0) {
      setNameError(undefined);
    }
  }

  function dropPasswordErrorIfNeeded() {
    if (passwordError && passwordError.length > 0) {
      setPasswordError(undefined);
    }
  }

  async function handleSubmit(values: { email: string; password: string }) {
    const { email, password } = values;

    if (!email.length || !password.length) {
      if (email.length === 0) {
        setNameError("This field is required!");
      }

      if (!password.length) {
        setPasswordError("This field is required!");
      }

      return false;
    }

    try {
      const token = await axios.post(`${API_URL}/auth/login`, values).then((res) => res.data);
      await LocalStorage.setItem("x-taskplane-token", token);
      setToken(token);
    } catch {
      const options: Toast.Options = {
        style: Toast.Style.Failure,
        title: "Failed to sign in",
        message: "Check credentials and try again",
        primaryAction: {
          title: "Go to https://taskplane.app",
          onAction: (toast) => {
            open("https://taskplane.app");
            toast.hide();
          },
        },
      };

      await showToast(options);
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={handleSubmit} icon={Icon.ArrowRight} title="Sign In" />
          <Action.OpenInBrowser url="https://taskplane.app" title="Open Taskplane" />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="email"
        placeholder="john.doe@email.com"
        title="Email"
        error={nameError}
        onChange={dropNameErrorIfNeeded}
        onBlur={(event) => {
          if (event.target.value?.length == 0) {
            setNameError("This field is required!");
          } else {
            dropNameErrorIfNeeded();
          }
        }}
        autoFocus
      />
      <Form.PasswordField
        id="password"
        placeholder="•••••••••••••"
        title="Password"
        error={passwordError}
        onChange={dropPasswordErrorIfNeeded}
        onBlur={(event) => {
          if (event.target.value?.length == 0) {
            setPasswordError("This field is required!");
          }
        }}
      />
    </Form>
  );
}
