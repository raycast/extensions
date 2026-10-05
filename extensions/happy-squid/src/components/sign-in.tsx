import { Action, ActionPanel, Color, Detail, Form, Icon, useNavigation } from "@raycast/api";
import { useEffect, useRef, useState, type ReactNode } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { beginHappySquidConnection, cancelHappySquidConnection } from "../handoff";

export function SignIn({ client, initialError }: { client: SupabaseClient; initialError: string | null }) {
  const { push, pop } = useNavigation();
  const routes = useRef(new Set<symbol>());
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    const { data } = client.auth.onAuthStateChange((_event, session) => {
      if (!session) return;
      const depth = routes.current.size;
      routes.current.clear();
      for (let index = 0; index < depth; index++) pop();
    });
    return () => {
      mounted.current = false;
      data.subscription.unsubscribe();
    };
  }, [client, pop]);
  const pushSignIn = (page: ReactNode, onBack?: () => void) => {
    const route = Symbol();
    routes.current.add(route);
    push(page, () => {
      routes.current.delete(route);
      onBack?.();
    });
  };
  const openCode = (email: string, onBack: () => void) =>
    pushSignIn(<EmailSignIn client={client} sentTo={email} initialError={null} />, onBack);
  const [busy, setBusy] = useState(false);
  const inFlight = useRef(false);
  const connect = async (browserOnly: boolean) => {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    try {
      await beginHappySquidConnection(browserOnly);
    } catch (error) {
      console.warn("[raycast-auth] connect", error);
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  };
  const signInWithEmail = async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    try {
      await cancelHappySquidConnection();
      if (mounted.current)
        pushSignIn(<EmailSignIn client={client} initialError={initialError} onCodeSent={openCode} />);
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  };
  return (
    <Detail
      navigationTitle="Happy Squid"
      markdown="# Connect to Happy Squid"
      isLoading={busy}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.TagList title="">
            <Detail.Metadata.TagList.Item
              text="Continue with Happy Squid"
              icon="icon.png"
              color={Color.PrimaryText}
              onAction={busy ? undefined : () => connect(false)}
            />
          </Detail.Metadata.TagList>
          <Detail.Metadata.TagList title="">
            <Detail.Metadata.TagList.Item
              text="Sign in with Email"
              icon={Icon.Envelope}
              color={Color.PrimaryText}
              onAction={busy ? undefined : signInWithEmail}
            />
          </Detail.Metadata.TagList>
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action title="Continue with Happy Squid" onAction={() => connect(false)} />
          <Action title="Continue in Browser" onAction={() => connect(true)} />
          <Action title="Sign in with Email" onAction={signInWithEmail} />
        </ActionPanel>
      }
    />
  );
}

function EmailSignIn({
  client,
  initialError,
  sentTo = null,
  onCodeSent,
}: {
  client: SupabaseClient;
  initialError: string | null;
  sentTo?: string | null;
  onCodeSent?: (email: string, onBack: () => void) => void;
}) {
  const [email, setEmail] = useState("");
  const emailField = useRef<Form.TextField>(null);
  const [returnCount, setReturnCount] = useState(0);
  useEffect(() => {
    if (returnCount) emailField.current?.focus();
  }, [returnCount]);
  const [code, setCode] = useState("");
  const { pop } = useNavigation();
  const mounted = useRef(true);
  const inFlight = useRef(false);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(initialError);

  const submit = async () => {
    if (inFlight.current) return;
    if (!sentTo && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError("Enter your email address.");
      return;
    }
    if (sentTo && !/^\d{6}$/.test(code.trim())) {
      setError("Enter the six-digit code from your email.");
      return;
    }
    inFlight.current = true;
    setBusy(true);
    setError(null);
    try {
      const { error } = sentTo
        ? await client.auth.verifyOtp({ email: sentTo, token: code.trim(), type: "email" })
        : await client.auth.signInWithOtp({ email: email.trim(), options: { shouldCreateUser: true } });
      if (!mounted.current) return;
      if (error) setError(error.message);
      else if (!sentTo) onCodeSent?.(email.trim(), () => setReturnCount((count) => count + 1));
    } catch (error) {
      if (mounted.current) setError((error as Error).message);
    } finally {
      inFlight.current = false;
      if (mounted.current) setBusy(false);
    }
  };

  return (
    <Form
      navigationTitle="Happy Squid"
      isLoading={busy}
      actions={
        <ActionPanel>
          {!busy && (
            <Action.SubmitForm
              title={sentTo ? "Sign In" : "Send Code"}
              shortcut={{ modifiers: [], key: "return" }}
              onSubmit={submit}
            />
          )}
          {!busy && <Action title={sentTo ? "Use Another Email" : "Continue with Happy Squid"} onAction={pop} />}
        </ActionPanel>
      }
    >
      <Form.Description
        text={
          sentTo
            ? `Enter the code sent to ${sentTo}.`
            : "Use the same account as your Happy Squid app or browser extension."
        }
      />
      {sentTo ? (
        <Form.TextField
          id="code"
          title="Email Code"
          value={code}
          onChange={setCode}
          error={error ?? undefined}
          autoFocus
        />
      ) : (
        <Form.TextField
          ref={emailField}
          id="email"
          title="Email"
          placeholder="you@example.com"
          value={email}
          onChange={setEmail}
          error={error ?? undefined}
        />
      )}
    </Form>
  );
}
