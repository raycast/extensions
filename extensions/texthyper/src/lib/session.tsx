// Signing in inside Raycast: the email address, then the six-digit code it
// is sent. View commands wrap themselves in withSession and show this form
// until there is a token.

import { Action, ActionPanel, Form, Icon, List, showToast, Toast } from "@raycast/api";
import { showFailureToast, usePromise } from "@raycast/utils";
import { ComponentType, createContext, useCallback, useContext, useState } from "react";
import { getSession, requestCode, Session, signIn, SignedOutError } from "./api";
import { refreshMenuBar } from "./no-view";

type Errors = { report: (error: unknown, title?: string) => void; session: Session };

const SessionContext = createContext<Errors | undefined>(undefined);

// `report` shows a failure toast, and takes the command back to the sign-in
// form when the failure is a revoked token.
export function useSession(): Errors {
  const context = useContext(SessionContext);
  if (!context) throw new Error("useSession needs withSession around the command");
  return context;
}

// The stored session, for the commands that gate on it: undefined while it
// is read, null when there is none. `reload` reads it again after a sign-in,
// a sign-out or a revoked token changed what is stored.
export function useStoredSession() {
  const { data, isLoading, revalidate } = usePromise(getSession);
  return { session: isLoading && data === undefined ? undefined : (data ?? null), reload: revalidate };
}

export function withSession<Props extends object>(Command: ComponentType<Props>) {
  return function Gate(props: Props) {
    const { session, reload } = useStoredSession();

    const report = useCallback(
      (error: unknown, title = "Something went wrong") => {
        if (error instanceof SignedOutError) reload();
        showFailureToast(error, { title });
      },
      [reload],
    );

    if (session === undefined) return <List isLoading />;
    if (session === null) return <SignInForm onSignedIn={reload} />;
    return (
      <SessionContext.Provider value={{ report, session }}>
        <Command {...props} />
      </SessionContext.Provider>
    );
  };
}

export function SignInForm({ onSignedIn }: { onSignedIn: () => void }) {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [sentTo, setSentTo] = useState<string>();
  const [isLoading, setIsLoading] = useState(false);

  async function sendCode() {
    const address = email.trim();
    if (!address.includes("@")) {
      showToast({ style: Toast.Style.Failure, title: "Enter your email address" });
      return;
    }
    setIsLoading(true);
    try {
      await requestCode(address);
      setSentTo(address);
      setCode("");
      showToast({ style: Toast.Style.Success, title: "Code sent", message: `Check ${address}` });
    } catch (error) {
      showFailureToast(error, { title: "Could not send a code" });
    } finally {
      setIsLoading(false);
    }
  }

  async function submitCode() {
    if (!sentTo) return;
    setIsLoading(true);
    try {
      const session = await signIn(sentTo, code.trim());
      showToast({ style: Toast.Style.Success, title: "Signed in", message: session.email });
      refreshMenuBar();
      onSignedIn();
    } catch (error) {
      showFailureToast(error, { title: "Could not sign in" });
    } finally {
      setIsLoading(false);
    }
  }

  if (!sentTo) {
    return (
      <Form
        isLoading={isLoading}
        actions={
          <ActionPanel>
            <Action.SubmitForm title="Email Me a Code" icon={Icon.Envelope} onSubmit={sendCode} />
          </ActionPanel>
        }
      >
        <Form.Description text="Texthyper has no passwords. Enter your email address and we send you a six-digit code. New here? The same form creates your account." />
        <Form.TextField id="email" title="Email" placeholder="you@example.com" value={email} onChange={setEmail} />
      </Form>
    );
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Sign in" icon={Icon.Key} onSubmit={submitCode} />
          <Action title="Send a New Code" icon={Icon.Envelope} onAction={sendCode} />
          <Action title="Use Another Address" icon={Icon.ArrowLeft} onAction={() => setSentTo(undefined)} />
        </ActionPanel>
      }
    >
      <Form.Description text={`We sent a six-digit code to ${sentTo}. It works for 10 minutes.`} />
      <Form.TextField id="code" title="Code" placeholder="123456" value={code} onChange={setCode} autoFocus />
    </Form>
  );
}
