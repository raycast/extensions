import { Action, ActionPanel, Form, Icon, showToast, Toast } from "@raycast/api";
import { useState } from "react";
import { isNewlyCreatedUser, requestEmailCode, verifyEmailCode } from "../lib/auth";

type Step = "email" | "code";

interface SignInViewProps {
  onAuthenticated: (result: { didSignUp: boolean }) => void;
}

/**
 * Two-step passwordless auth form.
 *
 * Step one collects an email and sends a one-time code; the same flow signs in
 * existing users and creates accounts for new ones. Step two verifies the code
 * and reports back via {@link SignInViewProps.onAuthenticated}, flagging
 * brand-new accounts so the caller can show the install nudge.
 */
export function SignInView({ onAuthenticated }: SignInViewProps) {
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSendCode() {
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      await showToast({ style: Toast.Style.Failure, title: "Enter your email" });
      return;
    }

    setIsSubmitting(true);
    try {
      await requestEmailCode(trimmedEmail);
      await showToast({ style: Toast.Style.Success, title: "Code sent", message: `Check ${trimmedEmail}` });
      setStep("code");
    } catch (sendError) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Couldn't send code",
        message: (sendError as Error).message,
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleVerifyCode() {
    const trimmedCode = code.trim();
    if (!trimmedCode) {
      await showToast({ style: Toast.Style.Failure, title: "Enter the code" });
      return;
    }

    setIsSubmitting(true);
    try {
      const user = await verifyEmailCode(email.trim(), trimmedCode);
      onAuthenticated({ didSignUp: isNewlyCreatedUser(user) });
    } catch (verifyError) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Verification failed",
        message: (verifyError as Error).message,
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  if (step === "code") {
    return (
      <Form
        isLoading={isSubmitting}
        actions={
          <ActionPanel>
            <Action.SubmitForm title="Verify Code" icon={Icon.Check} onSubmit={handleVerifyCode} />
            <Action title="Use a Different Email" icon={Icon.ArrowLeft} onAction={() => setStep("email")} />
          </ActionPanel>
        }
      >
        <Form.Description text={`Enter the 6-digit code we emailed to ${email.trim()}.`} />
        <Form.TextField id="code" title="Code" placeholder="123456" value={code} onChange={setCode} autoFocus />
      </Form>
    );
  }

  return (
    <Form
      isLoading={isSubmitting}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Send Code" icon={Icon.Envelope} onSubmit={handleSendCode} />
        </ActionPanel>
      }
    >
      <Form.Description text="Enter your email and we'll send you a one-time code to sign in or create your account." />
      <Form.TextField
        id="email"
        title="Email"
        placeholder="you@example.com"
        value={email}
        onChange={setEmail}
        autoFocus
      />
    </Form>
  );
}
