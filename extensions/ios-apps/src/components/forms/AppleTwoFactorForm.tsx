import { Form, ActionPanel, Action } from "@raycast/api";
import { useState } from "react";

interface AppleTwoFactorFormProps {
  onSubmit: (credentials: { code: string }) => void;
}

export function AppleTwoFactorForm({ onSubmit }: AppleTwoFactorFormProps) {
  const [code, setCode] = useState("");
  const [codeError, setCodeError] = useState<string | undefined>();

  function handleSubmit() {
    if (!code) {
      setCodeError("Verification code is required");
      return;
    }

    // Validate that it's a 6-digit number
    if (!/^\d{6}$/.test(code)) {
      setCodeError("Please enter a valid 6-digit code");
      return;
    }

    onSubmit({ code });
  }

  function handleCodeChange(value: string) {
    // Only allow numeric input
    const numericValue = value.replace(/\D/g, "");

    // Limit to 6 digits
    const limitedValue = numericValue.slice(0, 6);

    setCode(limitedValue);
    setCodeError(undefined);
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
        id="code"
        title="6-Digit Code"
        placeholder="000000"
        value={code}
        onChange={handleCodeChange}
        error={codeError}
        info="Enter the 6-digit verification code"
      />
    </Form>
  );
}
