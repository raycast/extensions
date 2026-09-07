import { Action, ActionPanel, Detail, Icon, open, showToast, Toast } from "@raycast/api";
import { ComponentType, useEffect, useRef, useState } from "react";
import { setTimeout as delay } from "node:timers/promises";
import getAccessToken, { granolaOAuth, SignInRequired } from "./getAccessToken";
import { DeviceGrant, exchangeToken, nextPoll, parseTokens, requestDeviceGrant } from "./granolaAuthProtocol";

export function withGranolaAuth(Command: ComponentType) {
  return function GranolaAuth() {
    const [ready, setReady] = useState(false);
    const [checking, setChecking] = useState(true);
    const [busy, setBusy] = useState(false);
    const [grant, setGrant] = useState<DeviceGrant>();
    const [error, setError] = useState<string>();
    const controller = useRef<AbortController | undefined>(undefined);
    useEffect(() => {
      let mounted = true;
      getAccessToken()
        .then(() => {
          if (mounted) setReady(true);
        })
        .catch((e) => {
          if (mounted && !(e instanceof SignInRequired))
            setError(e instanceof Error ? e.message : "Could not check sign-in.");
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
      setBusy(true);
      setError(undefined);
      setGrant(undefined);
      try {
        const device = await requestDeviceGrant(current.signal);
        setGrant(device);
        const deadline = Date.now() + device.expires_in * 1000;
        await open(device.verification_uri_complete);
        let interval = device.interval;
        while (Date.now() < deadline) {
          await delay(interval * 1000, undefined, { signal: current.signal });
          if (Date.now() >= deadline) break;
          const { response, body } = await exchangeToken(
            { grant_type: "urn:ietf:params:oauth:grant-type:device_code", device_code: device.device_code },
            current.signal,
          );
          if (response.ok) {
            const tokens = parseTokens(body);
            current.signal.throwIfAborted();
            await granolaOAuth.setTokens(tokens);
            setReady(true);
            await showToast({ style: Toast.Style.Success, title: "Signed In to Granola" });
            return;
          }
          interval = nextPoll(body.error, interval);
        }
        throw new Error("Your sign-in code expired. Press Return to get a new code.");
      } catch (e) {
        if (!current.signal.aborted) setError(e instanceof Error ? e.message : "Could not sign in. Please try again.");
      } finally {
        if (controller.current === current) {
          controller.current = undefined;
          setBusy(false);
          setGrant(undefined);
        }
      }
    }

    if (ready) return <Command />;
    return (
      <Detail
        navigationTitle="Sign In to Granola"
        isLoading={checking || busy}
        markdown={
          checking
            ? ""
            : `# ${busy ? "Finish Signing In" : "Connect to Granola"}\n\n${busy ? `Approve access in your browser. Confirm that the code matches:\n\n## ${grant?.user_code ?? "Preparing…"}\n\nYour notes will load here automatically after approval.` : "Sign in once to search your notes, read transcripts, and export meetings. Raycast keeps you signed in automatically."}${error ? `\n\n${error}` : ""}`
        }
        actions={
          !checking && (
            <ActionPanel>
              {busy && grant ? (
                <Action.OpenInBrowser title="Continue in Browser" url={grant.verification_uri_complete} />
              ) : (
                !busy && (
                  <Action title={error ? "Try Again" : "Sign in to Granola"} icon={Icon.Person} onAction={signIn} />
                )
              )}
              {grant && <Action.CopyToClipboard title="Copy Confirmation Code" content={grant.user_code} />}
              {busy && (
                <Action
                  title="Cancel Sign-in"
                  icon={Icon.XMarkCircle}
                  onAction={() => controller.current?.abort()}
                  shortcut={{ modifiers: ["cmd"], key: "." }}
                />
              )}
            </ActionPanel>
          )
        }
      />
    );
  };
}
