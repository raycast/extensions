import { Form, ActionPanel, Action } from "@raycast/api";
import { useState } from "react";

interface AppleLoginFormProps {
  onSubmit: (credentials: { email: string; password: string; saveCredentials: boolean }) => void;
}

export function AppleLoginForm({ onSubmit }: AppleLoginFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [saveCredentials, setSaveCredentials] = useState(true);
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

    onSubmit({ email, password, saveCredentials });
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Submit" onSubmit={handleSubmit} />
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
        placeholder="Enter your password"
        value={password}
        onChange={setPassword}
      />
      <Form.Checkbox
        id="saveCredentials"
        label="Save credentials securely"
        value={saveCredentials}
        onChange={setSaveCredentials}
        info="Your Apple ID will be stored locally and your password will be saved in the secure keychain. 2FA codes are never saved."
      />
    </Form>
  );
}
