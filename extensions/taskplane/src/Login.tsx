import axios from "axios";
import { AuthContext, API_URL } from "./lib";
import { LocalStorage, showToast, Toast, Form, ActionPanel, Action } from "@raycast/api";
import { useContext } from "react";

export default function Login() {
  const { setToken } = useContext(AuthContext);

  async function handleSubmit(values: { email: string; password: string }) {
    try {
      const token = await axios.post(`${API_URL}/auth/login`, values).then((res) => res.data);
      await LocalStorage.setItem("x-taskplane-token", token);
      setToken(token);
    } catch {
      showToast(Toast.Style.Failure, "Failed to sign in");
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={handleSubmit} title="Sign in" />
        </ActionPanel>
      }
      navigationTitle="Sign in to Taskplane"
    >
      <Form.TextField id="email" placeholder="john.doe@email.com" title="Email" autoFocus />
      <Form.PasswordField id="password" placeholder="•••••••••••••" title="Password" />
    </Form>
  );
}
