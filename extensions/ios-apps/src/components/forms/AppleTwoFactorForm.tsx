import { Form, ActionPanel, Action, showToast, Toast, useNavigation } from "@raycast/api";
import { useRef, useState } from "react";
import { loginToAppleId } from "../../utils/auth";

interface AppleTwoFactorFormProps {
  onSubmit: (credentials: { code: string }) => void;
}

export function AppleTwoFactorForm({ onSubmit }: AppleTwoFactorFormProps) {
  const [code, setCode] = useState("");
  const [codeError, setCodeError] = useState<string | undefined>();
  const [isResending, setIsResending] = useState(false);
  const { pop } = useNavigation();
  const lastSubmissionRef = useRef<number>(0);

  function handleSubmit() {
    // Prevent rapid submissions
    const now = Date.now();
    if (now - lastSubmissionRef.current < 1000) {
      setCodeError("Please wait before trying again");
      return;
    }

    if (!code) {
      setCodeError("Verification code is required");
      return;
    }

    // Validate that it's a 6-digit number
    if (!/^\d{6}$/.test(code)) {
      setCodeError("Please enter a valid 6-digit code");
      return;
    }

    // Only record timestamp on valid attempts
    lastSubmissionRef.current = now;
    onSubmit({ code });
  }

  async function handleResend() {
    if (isResending) return;
    try {
      setIsResending(true);
      // Indicate that we're requesting a new code
      await showToast({ style: Toast.Style.Animated, title: "Requesting new code..." });
      // Trigger ipatool login without a code to request a new 2FA code
      await loginToAppleId();
      // If login unexpectedly succeeds without 2FA, inform the user
      await showToast({ style: Toast.Style.Success, title: "Authenticated", message: "You're already signed in" });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      // Treat auth prompts as a successful resend signal
      if (
        (err instanceof Error && (err.name === "Needs2FAError" || err.name === "NeedsLoginError")) ||
        /two-factor|2fa|verification code/i.test(message)
      ) {
        await showToast({
          style: Toast.Style.Success,
          title: "Code resent",
          message: "Check your devices for a new code",
        });
      } else {
        await showToast({ style: Toast.Style.Failure, title: "Couldn't resend code", message });
      }
    } finally {
      setIsResending(false);
    }
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
          <Action
            title={isResending ? "Resending…" : "Resend Code"}
            onAction={handleResend}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
          />
          <Action title="Cancel" onAction={() => pop()} shortcut={{ modifiers: ["cmd"], key: "," }} />
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
