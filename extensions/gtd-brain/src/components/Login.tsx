import { Action, ActionPanel, Form, Icon, showToast, Toast } from "@raycast/api";
import { useState } from "react";
import { ApiError, userMessage } from "../lib/backend";
import { isValidEmail, requestLoginCode, verifyLoginCode } from "../lib/auth";
import { sendEvent } from "../lib/events";
import { siteUrl } from "../lib/links";
import type { Session } from "../lib/session";

// The same passwordless flow as the dashboard: email → one-time code → token.
export function Login({ onSignedIn }: { onSignedIn: (s: Session) => void }) {
  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | undefined>();

  const sendCode = async (resend = false) => {
    if (!isValidEmail(email)) {
      setError("Enter a valid email address");
      return;
    }
    setBusy(true);
    setError(undefined);
    try {
      await requestLoginCode(email);
      void sendEvent(resend ? "login_code_resent" : "login_email_sent");
      setStep("code");
      setCode("");
      await showToast({ style: Toast.Style.Success, title: "Code sent", message: `Check ${email.trim()}` });
    } catch (e) {
      void sendEvent("login_failed", { stage: "email", code: e instanceof ApiError ? e.code : "network" });
      setError(userMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const verify = async () => {
    if (!code.trim()) {
      setError("Enter the code from the email");
      return;
    }
    setBusy(true);
    setError(undefined);
    try {
      const session = await verifyLoginCode(email, code);
      void sendEvent("login_verified");
      await showToast({ style: Toast.Style.Success, title: "Signed in", message: session.email });
      onSignedIn(session);
    } catch (e) {
      void sendEvent("login_failed", { stage: "code", code: e instanceof ApiError ? e.code : "network" });
      setError(userMessage(e));
    } finally {
      setBusy(false);
    }
  };

  if (step === "email") {
    return (
      <Form
        isLoading={busy}
        navigationTitle="Sign in to GTD Brain"
        actions={
          <ActionPanel>
            <Action.SubmitForm title="Send Code" icon={Icon.Envelope} onSubmit={() => void sendCode()} />
            <Action.OpenInBrowser title="Create a Free Account" url={siteUrl("/")} />
          </ActionPanel>
        }
      >
        <Form.Description text="Use the email you sign in with on the dashboard. We'll send you a one-time code — no password." />
        <Form.TextField
          id="email"
          title="Email"
          placeholder="you@example.com"
          value={email}
          error={error}
          autoFocus
          onChange={(v) => {
            setEmail(v);
            setError(undefined);
          }}
        />
      </Form>
    );
  }

  return (
    <Form
      isLoading={busy}
      navigationTitle="Enter your code"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Sign in" icon={Icon.Key} onSubmit={() => void verify()} />
          <Action title="Resend Code" icon={Icon.ArrowClockwise} onAction={() => void sendCode(true)} />
          <Action
            title="Use a Different Email"
            icon={Icon.ArrowLeft}
            onAction={() => {
              setStep("email");
              setError(undefined);
            }}
          />
        </ActionPanel>
      }
    >
      <Form.Description text={`We sent a code to ${email.trim()}. Paste it here.`} />
      <Form.TextField
        id="code"
        title="Code"
        placeholder="123456"
        value={code}
        error={error}
        autoFocus
        onChange={(v) => {
          setCode(v);
          setError(undefined);
        }}
      />
    </Form>
  );
}
