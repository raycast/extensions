import { Action, ActionPanel, Form, Icon, showToast, Toast, useNavigation } from "@raycast/api";
import { useMemo, useState } from "react";

interface EmailSignInFormValues {
  email: string;
  magicLink: string;
}

export interface EmailSignInFormProps {
  signInWithGoogle: () => Promise<boolean>;
  requestEmailMagicLink: (email: string) => Promise<void>;
  verifyEmailMagicLink: (magicLinkOrToken: string) => Promise<void>;
  onSignedIn?: () => void;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function EmailSignInForm({
  signInWithGoogle,
  requestEmailMagicLink,
  verifyEmailMagicLink,
  onSignedIn,
}: EmailSignInFormProps) {
  const { pop } = useNavigation();
  const [email, setEmail] = useState("");
  const [magicLink, setMagicLink] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [linkSent, setLinkSent] = useState(false);

  const normalizedEmail = email.trim().toLowerCase();
  const emailError = useMemo(() => {
    if (!email) {
      return undefined;
    }

    return EMAIL_REGEX.test(normalizedEmail) ? undefined : "Enter a valid email address";
  }, [email, normalizedEmail]);

  async function sendMagicLink(values?: EmailSignInFormValues) {
    const nextEmail = (values?.email ?? email).trim().toLowerCase();
    if (!EMAIL_REGEX.test(nextEmail)) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Invalid email",
        message: "Enter a valid email address",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await requestEmailMagicLink(nextEmail);
      setEmail(nextEmail);
      setLinkSent(true);
      await showToast({
        style: Toast.Style.Success,
        title: "Magic link sent",
        message: `Check ${nextEmail} for the sign-in link`,
      });
    } catch {
      // Error toast is shown by useAuth.
    } finally {
      setIsSubmitting(false);
    }
  }

  async function submitMagicLink(values: EmailSignInFormValues) {
    const magicLinkValue = values.magicLink.trim();
    if (!magicLinkValue) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Magic link required",
        message: "Paste the link or token from your email",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await verifyEmailMagicLink(magicLinkValue);
      await showToast({
        style: Toast.Style.Success,
        title: "Signed in",
      });
      onSignedIn?.();
      pop();
    } catch {
      // Error toast is shown by useAuth.
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleSubmit(values: EmailSignInFormValues) {
    if (linkSent) {
      await submitMagicLink(values);
      return;
    }

    await sendMagicLink(values);
  }

  async function handleGoogleSignIn() {
    try {
      const success = await signInWithGoogle();
      if (success) {
        onSignedIn?.();
        pop();
      }
    } catch {
      // Error toast is shown by useAuth.
    }
  }

  return (
    <Form
      navigationTitle="Sign in with Email"
      isLoading={isSubmitting}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            icon={linkSent ? Icon.Checkmark : Icon.Envelope}
            title={linkSent ? "Verify Magic Link" : "Send Magic Link"}
            onSubmit={handleSubmit}
          />
          {linkSent && <Action icon={Icon.ArrowClockwise} title="Resend Magic Link" onAction={sendMagicLink} />}
          <Action icon={Icon.Key} title="Sign in with Google" onAction={handleGoogleSignIn} />
        </ActionPanel>
      }
    >
      <Form.Description
        title="Email Login"
        text={
          linkSent
            ? "Paste the magic link URL (or token) from your email to complete sign-in."
            : "Enter your email and we'll send a magic sign-in link."
        }
      />

      <Form.TextField
        id="email"
        title="Email"
        value={email}
        onChange={setEmail}
        error={emailError}
        placeholder="you@example.com"
      />

      {linkSent && (
        <>
          <Form.TextArea
            id="magicLink"
            title="Magic Link URL or Token"
            value={magicLink}
            onChange={setMagicLink}
            placeholder="https://polidict.com/authorized?token=..."
          />
          <Form.Description
            title="Tip"
            text="You can paste either the full URL from the email or just the token value."
          />
        </>
      )}
    </Form>
  );
}
