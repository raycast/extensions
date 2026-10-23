import {
  Action,
  ActionPanel,
  Alert,
  confirmAlert,
  Detail,
  Icon,
  open,
  openExtensionPreferences,
  showToast,
  Toast,
} from "@raycast/api";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentType,
  type ReactElement,
} from "react";
import { requestCode, requestToken, signOut } from "../lib/api";
import { DeviceFlowError, pollDeviceToken } from "../lib/device-flow";
import { formatUserCode, verificationUrl } from "../lib/domain";
import { isSignedIn, origin, saveSession, SignedOutError } from "../lib/store";
import { message, refreshMenuBar } from "../lib/actions";
import type { DeviceCode } from "../lib/types";

const AuthContext = createContext({
  /** Returns true when the error meant the session is gone and sign-in is now showing. */
  handle: (error: unknown): boolean => error instanceof SignedOutError,
  signedOut: () => {},
});
export const useAuth = () => useContext(AuthContext);

/** Shows sign-in in place of the command until this Raycast session is connected. */
export function withAuth<P extends object>(
  Command: ComponentType<P>,
  placeholder: ReactElement,
) {
  return function Authenticated(props: P) {
    const [state, setState] = useState<"checking" | "in" | "out">("checking");
    useEffect(() => {
      void isSignedIn().then((signedIn) => setState(signedIn ? "in" : "out"));
    }, []);
    const signedOut = useCallback(() => setState("out"), []);
    const handle = useCallback((error: unknown) => {
      if (!(error instanceof SignedOutError)) return false;
      setState("out");
      return true;
    }, []);
    // A stable value keeps consumers' effects from re-running on every render.
    const auth = useMemo(() => ({ handle, signedOut }), [handle, signedOut]);
    if (state === "checking") return placeholder;
    if (state === "out") return <SignIn onConnected={() => setState("in")} />;
    return (
      <AuthContext.Provider value={auth}>
        <Command {...props} />
      </AuthContext.Provider>
    );
  };
}

function SignIn({ onConnected }: { onConnected: () => void }) {
  const [code, setCode] = useState<DeviceCode>();
  const [state, setState] = useState<"idle" | "waiting" | "error">("idle");
  const [error, setError] = useState<{ code?: string; text: string }>();
  const controller = useRef<AbortController | null>(null);
  useEffect(() => () => controller.current?.abort(), []);
  const server = safeHost();

  async function connect() {
    if (controller.current) return;
    const abort = new AbortController();
    controller.current = abort;
    setState("waiting");
    setError(undefined);
    setCode(undefined);
    try {
      const next = await requestCode(abort.signal);
      if (!next.device_code || !next.user_code || !(next.expires_in > 0))
        throw new Error("ttrackii returned an invalid sign-in response.");
      const url = verificationUrl(next, origin());
      abort.signal.throwIfAborted();
      setCode(next);
      await open(url);
      const token = await pollDeviceToken(
        next,
        (signal) => requestToken(next, signal),
        abort.signal,
      );
      abort.signal.throwIfAborted();
      if (!token.access_token)
        throw new Error("ttrackii did not return a session.");
      await saveSession(
        token.access_token,
        Math.min(token.expires_in ?? 259200, 259200),
      );
      await showToast({
        style: Toast.Style.Success,
        title: "Connected to ttrackii",
      });
      await refreshMenuBar();
      onConnected();
    } catch (error) {
      if (!abort.signal.aborted) {
        setError({
          code: error instanceof DeviceFlowError ? error.code : undefined,
          text: message(error),
        });
        setState("error");
      }
    } finally {
      if (controller.current === abort) controller.current = null;
    }
  }
  function cancel() {
    controller.current?.abort();
    controller.current = null;
    setCode(undefined);
    setState("idle");
  }

  const wrongServer = error?.code === "invalid_client" || !server;
  const markdown =
    state === "waiting" && code
      ? `## Confirm this code in your browser\n\n# ${formatUserCode(code.user_code)}\n\nCheck that it matches the code in ttrackii, then approve. This view continues by itself once you do.`
      : state === "waiting"
        ? `## Connecting…\n\nOpening ttrackii in your browser.`
        : state === "error"
          ? `## Couldn't connect\n\n${error?.text}`
          : `## Connect to ttrackii\n\nApprove Raycast in your browser to start, stop, and review your time from here.\n\nPress **↵** to open the approval page.`;
  return (
    <Detail
      isLoading={state === "waiting"}
      navigationTitle="Connect to ttrackii"
      markdown={markdown}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label
            title="Server"
            text={server ?? "Invalid URL"}
            icon={Icon.Globe}
          />
          <Detail.Metadata.Label
            title="Requires"
            text="Allow API access in ttrackii settings"
            icon={Icon.Key}
          />
          <Detail.Metadata.Label
            title="Session"
            text="Lasts 72 hours, separate from the CLI"
            icon={Icon.Clock}
          />
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          {state === "waiting" ? (
            <>
              {code && (
                <Action.OpenInBrowser
                  title="Open Approval Page"
                  url={verificationUrl(code, origin())}
                />
              )}
              {code && (
                <Action.CopyToClipboard
                  title="Copy Code"
                  content={formatUserCode(code.user_code)}
                />
              )}
              <Action
                title="Cancel"
                icon={Icon.XMarkCircle}
                onAction={cancel}
              />
            </>
          ) : wrongServer ? (
            <>
              <Action
                title="Change Server URL"
                icon={Icon.Gear}
                onAction={openExtensionPreferences}
              />
              <Action
                title="Try Again"
                icon={Icon.ArrowClockwise}
                onAction={connect}
              />
            </>
          ) : (
            <>
              <Action
                title={state === "error" ? "Try Again" : "Connect in Browser"}
                icon={state === "error" ? Icon.ArrowClockwise : Icon.Link}
                onAction={connect}
              />
              {server && (
                <Action.OpenInBrowser
                  title="Open API Access Settings"
                  url={`${origin()}/settings/api`}
                />
              )}
              <Action
                title="Change Server URL"
                icon={Icon.Gear}
                onAction={openExtensionPreferences}
              />
            </>
          )}
        </ActionPanel>
      }
    />
  );
}

function safeHost() {
  try {
    return new URL(origin()).host;
  } catch {
    return undefined;
  }
}

export function SignOutAction() {
  const { signedOut } = useAuth();
  return (
    <Action
      title="Sign out"
      icon={Icon.Logout}
      style={Action.Style.Destructive}
      onAction={async () => {
        const confirmed = await confirmAlert({
          title: "Sign out of ttrackii?",
          message:
            "Raycast will stop tracking time with this account until you connect again.",
          primaryAction: {
            title: "Sign out",
            style: Alert.ActionStyle.Destructive,
          },
        });
        if (!confirmed) return;
        const { revoked } = await signOut();
        await refreshMenuBar();
        await showToast(
          revoked
            ? { style: Toast.Style.Success, title: "Signed out" }
            : {
                style: Toast.Style.Failure,
                title: "Signed out on this Mac",
                message:
                  "Couldn't reach ttrackii to end the session. Remove it in ttrackii under Settings → Sign-in & security.",
              },
        );
        signedOut();
      }}
    />
  );
}
