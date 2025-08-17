import { Form, ActionPanel, Action } from "@raycast/api";
import { useState } from "react";

interface AppleLoginFormProps {
  onSubmit: (credentials: { email: string; password: string }) => void;
}

export function AppleLoginForm({ onSubmit }: AppleLoginFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [emailError, setEmailError] = useState<string | undefined>();

  function handleSubmit() {
    if (!email) {
      setEmailError("Apple ID is required");
      return;
    }

    if (!email.includes("@")) {
      setEmailError("Please enter a valid Apple ID");
      return;
    }

    if (!password) {
      // Password error is handled by Form.PasswordField's required validation
      return;
    }

    onSubmit({ email, password });
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Login" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="email"
        title="Apple ID"
        placeholder="Enter your Apple ID"
        value={email}
        onChange={(value) => {
          setEmail(value);
          setEmailError(undefined);
        }}
        error={emailError}
      />
      <Form.PasswordField
        id="password"
        title="Password"
        placeholder="Enter your Apple password"
        value={password}
        onChange={setPassword}
      />
    </Form>
  );
}
