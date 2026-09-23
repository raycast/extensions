import { open, showToast, Toast } from "@raycast/api";
import { GranolaSignInView, SignInProblem } from "../components/GranolaSignInView";
import { ComponentType, useEffect, useRef, useState } from "react";
import { setTimeout as delay } from "node:timers/promises";
import getAccessToken, { granolaOAuth, SignInRequired } from "./getAccessToken";
import {
  DeviceGrant,
  GranolaSignInError,
  exchangeToken,
  nextPoll,
  parseTokens,
  requestDeviceGrant,
} from "./granolaAuthProtocol";
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
        .catch((e) => {
          if (mounted && !(e instanceof SignInRequired)) setError("connection");
        })
        .finally(() => {
          if (mounted) setChecking(false);
        });
      return () => {
        mounted = false;
        controller.current?.abort();
      };
    }, []);

    async function signIn() {
      if (controller.current) return;
      const current = new AbortController();
      controller.current = current;
      let progressToast: Toast | undefined;
      setBusy(true);
      setError(undefined);
      setGrant(undefined);
      try {
        const device = await requestDeviceGrant(current.signal);
        setGrant(device);
        const deadline = Date.now() + device.expires_in * 1000;
        progressToast = await showToast({ style: Toast.Style.Animated, title: "Waiting for browser approval" });
        await open(device.verification_uri_complete);
        let interval = device.interval;
        while (Date.now() < deadline) {
          await delay(Math.min(interval * 1000, Math.max(0, deadline - Date.now())), undefined, {
            signal: current.signal,
          });
          if (Date.now() >= deadline) break;
          const { response, body } = await exchangeToken(
            { grant_type: "urn:ietf:params:oauth:grant-type:device_code", device_code: device.device_code },
            current.signal,
          );
          if (response.ok) {
            const tokens = parseTokens(body);
            current.signal.throwIfAborted();
            await granolaOAuth.setTokens(tokens);
            diagnostic("auth.session_saved", { code: "device_grant" });
            await progressToast?.hide();
            progressToast = undefined;
            setReady(true);
            await showToast({ style: Toast.Style.Success, title: "Signed In to Granola" });
            return;
          }
          interval = nextPoll(body.error, interval);
        }
        throw new GranolaSignInError("expired", "Your sign-in code expired.");
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
        onSignIn={signIn}
        onCancel={() => controller.current?.abort()}
      />
    );
  };
}
