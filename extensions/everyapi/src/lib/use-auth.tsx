import {
  Action,
  ActionPanel,
  Detail,
  Icon,
  open,
  showToast,
  Toast,
} from "@raycast/api";
import {
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { AuthSession } from "./auth";
import { createRaycastAuthSession } from "./raycast-auth";

type AuthState =
  | { kind: "loading" }
  | { kind: "signed-out" }
  | { kind: "authorizing"; userCode: string; verificationUri: string }
  | { kind: "authenticated"; accessToken: string }
  | { kind: "error"; message: string };

export function useAuthSession(apiBase: string): {
  session: AuthSession;
  state: AuthState;
  signIn: () => Promise<void>;
  retry: () => Promise<void>;
  signOut: () => Promise<void>;
} {
  const session = useMemo(() => createRaycastAuthSession(apiBase), [apiBase]);
  const [state, setState] = useState<AuthState>({ kind: "loading" });

  const retry = useCallback(async () => {
    setState({ kind: "loading" });
    try {
      const accessToken = await session.getAccessToken();
      setState(
        accessToken
          ? { kind: "authenticated", accessToken }
          : { kind: "signed-out" },
      );
    } catch (error) {
      setState({
        kind: "error",
        message: error instanceof Error ? error.message : "Sign in failed",
      });
    }
  }, [session]);

  useEffect(() => {
    void retry();
  }, [retry]);

  const signIn = useCallback(async () => {
    try {
      const authorization = await session.startSignIn();
      setState({
        kind: "authorizing",
        userCode: authorization.userCode,
        verificationUri: authorization.verificationUri,
      });
      await open(authorization.verificationUri);
      const accessToken = await session.completeSignIn(authorization);
      setState({ kind: "authenticated", accessToken });
      await showToast({
        style: Toast.Style.Success,
        title: "Signed in to EveryAPI",
      });
    } catch (error) {
      setState({
        kind: "error",
        message: error instanceof Error ? error.message : "Sign in failed",
      });
    }
  }, [session]);

  const signOut = useCallback(async () => {
    await session.signOut();
    setState({ kind: "signed-out" });
  }, [session]);

  return { session, state, signIn, retry, signOut };
}

export function AuthGate({
  apiBase,
  children,
}: {
  apiBase: string;
  children: (value: {
    accessToken: string;
    session: AuthSession;
    signOut: () => Promise<void>;
  }) => ReactNode;
}) {
  const auth = useAuthSession(apiBase);
  if (auth.state.kind === "authenticated") {
    return children({
      accessToken: auth.state.accessToken,
      session: auth.session,
      signOut: auth.signOut,
    });
  }

  const authorization =
    auth.state.kind === "authorizing" ? auth.state : undefined;
  const markdown = authorization
    ? [
        "# Finish signing in",
        "",
        "Your browser is open to EveryAPI. Approve this Raycast session to continue.",
        "",
        `Verification code: **${authorization.userCode}**`,
        "",
        "Raycast will continue automatically after approval.",
      ].join("\n")
    : auth.state.kind === "error"
      ? ["# Sign in unavailable", "", auth.state.message].join("\n")
      : [
          "# Sign in to EveryAPI",
          "",
          "Use your EveryAPI account securely in Raycast. Your password and API keys are never entered into this extension.",
        ].join("\n");

  return (
    <Detail
      isLoading={auth.state.kind === "loading" || Boolean(authorization)}
      markdown={markdown}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label
            title="Authentication"
            text="OAuth device flow"
            icon={Icon.Lock}
          />
          <Detail.Metadata.Label
            title="Credentials"
            text="No API key required"
            icon={Icon.Key}
          />
          <Detail.Metadata.TagList title="Status">
            <Detail.Metadata.TagList.Item
              text={
                authorization
                  ? "Waiting for approval"
                  : auth.state.kind === "error"
                    ? "Unavailable"
                    : auth.state.kind === "loading"
                      ? "Checking session"
                      : "Signed out"
              }
              color={
                auth.state.kind === "error"
                  ? "#FF5B5B"
                  : authorization
                    ? "#FFCC00"
                    : "#8E8E93"
              }
            />
          </Detail.Metadata.TagList>
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          {authorization ? (
            <Action.OpenInBrowser
              title="Open Authorization Page"
              url={authorization.verificationUri}
              icon={Icon.Globe}
            />
          ) : (
            <Action
              title="Sign in with Everyapi"
              icon={Icon.Person}
              onAction={auth.signIn}
            />
          )}
          {auth.state.kind === "error" ? (
            <Action
              title="Retry"
              icon={Icon.ArrowClockwise}
              onAction={auth.retry}
            />
          ) : null}
          <Action.OpenInBrowser
            title="Open Everyapi"
            url="https://app.everyapi.ai"
            icon={Icon.AppWindow}
          />
        </ActionPanel>
      }
    />
  );
}
