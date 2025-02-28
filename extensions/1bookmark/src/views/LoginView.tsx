import { useEffect, useRef, useState } from "react";
import { ActionPanel, Action, Form, Icon } from "@raycast/api";
import { CachedQueryClientProvider } from "../components/CachedQueryClientProvider";
import { trpc } from "@/utils/trpc.util";
import { handleSignIn } from "@/handle-signin";
import { useAtom } from "jotai";
import { sessionTokenAtom } from "@/states/session-token.state";
import { loggingEmailAtom, loggingTokenSentAtom } from "../states/logging-email.state";

function Body() {
  const [, setSessionToken] = useAtom(sessionTokenAtom);
  const { mutateAsync, isPending } = trpc.login.generateMagicLink.useMutation();
  const verificationTokenRef = useRef<Form.TextField>(null);

  const [tokenSent, setTokenSent] = useAtom(loggingTokenSentAtom);
  const [email, setEmail] = useAtom(loggingEmailAtom);

  const [code, setCode] = useState("");

  const emailRef = useRef<Form.TextField>(null);

  const [isLoginPending, setIsLoginPending] = useState(false);
  const isLoading = isPending || isLoginPending;
  const requestToToken = async (email: string) => {
    await mutateAsync({ email });

    setTokenSent(true);
  };

  useEffect(() => {
    if (!tokenSent) {
      return;
    }

    verificationTokenRef.current?.focus();
  }, [tokenSent]);

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            icon={tokenSent && email ? Icon.Key : Icon.Envelope}
            title={tokenSent && email ? "Login" : "Send Login Code to Email"}
            onSubmit={async () => {
              if (!tokenSent && email) {
                requestToToken(email);
                return;
              }

              if (tokenSent && email && code) {
                setIsLoginPending(true);
                await handleSignIn({
                  email,
                  token: code,
                  onSuccess: (sessionToken: string) => {
                    setSessionToken(sessionToken);
                    setTokenSent(false);
                    setEmail("");
                  },
                });
                setIsLoginPending(false);
              }
            }}
          />
          {tokenSent && (
            <Action
              title="Reset Email"
              icon={Icon.ArrowLeft}
              shortcut={{ modifiers: ["cmd"], key: "r" }}
              onAction={() => {
                setTokenSent(false);
                setEmail("");

                setTimeout(() => {
                  emailRef.current?.focus();
                }, 100);
              }}
            />
          )}
        </ActionPanel>
      }
    >
      {!tokenSent && (
        <>
          <Form.Description text="👋🏼 Input Email to Login" />
          <Form.TextField
            ref={emailRef}
            id="email"
            title="Email"
            placeholder="Email"
            onChange={(e) => setEmail(e)}
            autoFocus={true}
          />
          <Form.Description text='Press "Command(⌘) + Enter"' />
        </>
      )}

      {tokenSent && (
        <>
          <Form.Description text={`Login code sent to ${email}.`} />
          <Form.Description text={`Enter the 6-digit login code sent to your email.`} />
          <Form.TextField
            ref={verificationTokenRef}
            id="verificationToken"
            title="Verification Token"
            placeholder="Verification Token"
            onChange={(e) => setCode(e)}
          />
          <Form.Description text='Press "Command(⌘) + Enter" again to login.' />
          <Form.Description text='Or press "Command(⌘) + R" to reset email.' />
        </>
      )}
    </Form>
  );
}

export function LoginView() {
  return (
    <CachedQueryClientProvider>
      <Body />
    </CachedQueryClientProvider>
  );
}
