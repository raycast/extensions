import { showToast, Toast } from "@raycast/api";
import { GranolaSignInView, SignInProblem } from "../components/GranolaSignInView";
import { ComponentType, useEffect, useRef, useState } from "react";
import getAccessToken, { SignInRequired } from "./getAccessToken";
import { DeviceGrant, GranolaSignInError } from "./granolaAuthProtocol";
import { PendingSignIn, clearPendingSignIn, readPendingSignIn, runDeviceSignIn } from "./deviceSignIn";
import { diagnostic } from "./diagnostics";

export function withGranolaAuth(Command: ComponentType) {
  return function GranolaAuth() {
    const [ready, setReady] = useState(false);
    const [checking, setChecking] = useState(true);
    const [busy, setBusy] = useState(false);
    const [grant, setGrant] = useState<DeviceGrant>();
    const [error, setError] = useState<SignInProblem>();
    const controller = useRef<AbortController | undefined>(undefined);
    useEffect(() => {
      let mounted = true;
      getAccessToken()
        .then(() => {
          if (mounted) setReady(true);
        })
        .catch(async (e) => {
          if (!(e instanceof SignInRequired)) {
            if (mounted) setError("connection");
            return;
          }
          // No session yet. If an earlier command started a sign-in that the
          // user may have approved after Raycast closed, pick it up here.
          const pending = await readPendingSignIn().catch(() => undefined);
          if (mounted && pending) {
            diagnostic("auth.sign_in_resumed");
            void signIn(pending);
          }
        })
        .finally(() => {
          if (mounted) setChecking(false);
        });
      return () => {
        mounted = false;
        controller.current?.abort();
      };
    }, []);

    async function signIn(resume?: PendingSignIn) {
      if (controller.current) return;
      const current = new AbortController();
      controller.current = current;
      let progressToast: Toast | undefined;
      setBusy(true);
      setError(undefined);
      setGrant(undefined);
      try {
        const outcome = await runDeviceSignIn({
          signal: current.signal,
          resume,
          onGrant: async (device) => {
            setGrant(device);
            progressToast = await showToast({ style: Toast.Style.Animated, title: "Waiting for browser approval" });
          },
        });
        await progressToast?.hide();
        progressToast = undefined;
        setReady(true);
        // When another command finished sign-in, it already showed success.
        if (outcome === "saved") await showToast({ style: Toast.Style.Success, title: "Signed In to Granola" });
      } catch (e) {
        diagnostic(current.signal.aborted ? "auth.sign_in_cancelled" : "auth.sign_in_failed", {
          code: e instanceof GranolaSignInError ? e.kind : "unknown",
        });
        if (!current.signal.aborted) setError(e instanceof GranolaSignInError ? e.kind : "unknown");
      } finally {
        await progressToast?.hide();
        if (controller.current === current) {
          controller.current = undefined;
          setBusy(false);
          setGrant(undefined);
        }
      }
    }

    if (ready) return <Command />;
    return (
      <GranolaSignInView
        checking={checking}
        busy={busy}
        code={grant?.user_code}
        url={grant?.verification_uri_complete}
        problem={error}
        onSignIn={() => signIn()}
        onCancel={() => {
          // An explicit cancel should not be resumed by the next command.
          controller.current?.abort();
          void clearPendingSignIn();
        }}
      />
    );
  };
}
