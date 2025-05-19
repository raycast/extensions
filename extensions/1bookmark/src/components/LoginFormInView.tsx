import { useEffect, useRef, useState } from "react";
import { z } from "zod";
import { ActionPanel, Action, Form, Icon, Toast, showToast } from "@raycast/api";
import { trpc } from "@/utils/trpc.util";
import { handleSignIn } from "@/handle-signin";
import { showFailureToast, useCachedState } from "@raycast/utils";
import {
  CACHED_KEY_LOGGING_EMAIL,
  CACHED_KEY_LOGGING_TOKEN_SENT,
  CACHED_KEY_SESSION_TOKEN,
} from "../utils/constants.util";

export function LoginFormInView() {
  const [, setSessionToken] = useCachedState(CACHED_KEY_SESSION_TOKEN, "");
  const generateMagicLink = trpc.login.generateMagicLink.useMutation();
  const verificationTokenRef = useRef<Form.TextField>(null);

  const [email, setEmail] = useCachedState(CACHED_KEY_LOGGING_EMAIL, "");
  const [tokenSent, setTokenSent] = useCachedState(CACHED_KEY_LOGGING_TOKEN_SENT, false);

  const [code, setCode] = useState("");

  const emailRef = useRef<Form.TextField>(null);

  const [isLoginPending, setIsLoginPending] = useState(false);
  const isLoading = generateMagicLink.isPending || isLoginPending;

  const requestToToken = (email: string) => {
    const trimmedEmail = email.trim();
    if (!z.string().email().safeParse(trimmedEmail).success) {
      showToast({
        style: Toast.Style.Failure,
        title: "Please enter a valid email",
      });
      return;
    }

    generateMagicLink.mutate(
      { email: trimmedEmail },
      {
        onSuccess: () => {
          setTokenSent(true);
        },
      },
    );
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
              const trimmedEmail = email.trim();
              if (!tokenSent) {
                requestToToken(trimmedEmail);
                return;
              }

              const trimmedCode = code.trim();
              if (!trimmedCode.match(/^.{6}$/)) {
                showToast({
                  style: Toast.Style.Failure,
                  title: "Please input a 6-character code",
                });
                return;
              }

              setIsLoginPending(true);
              handleSignIn({
                email: trimmedEmail,
                token: trimmedCode,
                onSuccess: (sessionToken: string) => {
                  showToast({
                    style: Toast.Style.Success,
                    title: "Signin Success",
                  });
                  setSessionToken(sessionToken);
                  setTokenSent(false);
                  setEmail("");
                  setCode("");
                  setIsLoginPending(false);
                },
                onError: (error: Error) => {
                  showFailureToast(error, { title: "Signin Failed" });
                  setIsLoginPending(false);
                },
              });
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
