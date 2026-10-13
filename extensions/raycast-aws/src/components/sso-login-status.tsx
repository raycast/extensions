import {
  Action,
  ActionPanel,
  Detail,
  popToRoot,
  useNavigation,
} from "@raycast/api";
import { useEffect, useRef, useState } from "react";
import { startSsoLogin, GrantedCommandSession } from "../lib/assume";

interface SsoLoginStatusProps {
  region: string;
  startUrl: string;
}

type Status = "connecting" | "awaiting-approval" | "success" | "error";

export function SsoLoginStatus({ region, startUrl }: SsoLoginStatusProps) {
  const { pop } = useNavigation();
  const [status, setStatus] = useState<Status>("connecting");
  const [code, setCode] = useState<string>();
  const [verificationUrl, setVerificationUrl] = useState<string>();
  const [errorMessage, setErrorMessage] = useState<string>();
  const sessionRef = useRef<GrantedCommandSession>();

  useEffect(() => {
    // If the effect re-runs (e.g. a dev-mode hot-reload remount) before this session finishes,
    // the cleanup below cancels it - ignore that session's outcome instead of flashing "failed".
    let stale = false;
    const session = startSsoLogin(region, startUrl);
    sessionRef.current = session;

    session.deviceCode.then((deviceCode) => {
      if (stale || !deviceCode) return;
      setCode(deviceCode.code);
      setVerificationUrl(deviceCode.verificationUrl);
      setStatus("awaiting-approval");
    });

    session.completion
      .then(() => {
        if (stale) return;
        setStatus("success");
      })
      .catch((error) => {
        if (stale) return;
        setErrorMessage(error instanceof Error ? error.message : String(error));
        setStatus("error");
      });

    return () => {
      stale = true;
      session.cancel();
    };
  }, [region, startUrl]);

  const markdown = renderMarkdown(status, code, errorMessage);

  return (
    <Detail
      markdown={markdown}
      isLoading={status === "connecting" || status === "awaiting-approval"}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="SSO Start URL" text={startUrl} />
          <Detail.Metadata.Label title="SSO Region" text={region} />
          {code && <Detail.Metadata.Label title="Device Code" text={code} />}
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          {status === "success" && (
            <Action title="Done" onAction={() => popToRoot()} />
          )}
          {status === "error" && (
            <Action title="Back to Login Form" onAction={() => pop()} />
          )}
          {status === "awaiting-approval" && verificationUrl && (
            <Action.OpenInBrowser
              title="Open Verification Page"
              url={verificationUrl}
            />
          )}
          {(status === "connecting" || status === "awaiting-approval") && (
            <Action
              title="Cancel"
              onAction={() => {
                sessionRef.current?.cancel();
                pop();
              }}
            />
          )}
        </ActionPanel>
      }
    />
  );
}

function renderMarkdown(
  status: Status,
  code: string | undefined,
  errorMessage: string | undefined,
): string {
  if (status === "connecting") {
    return "# Starting SSO login...\n\nWaiting for Granted to request a device code.";
  }

  if (status === "awaiting-approval") {
    return [
      "# Confirm this code in your browser",
      "",
      `# \`${code}\``,
      "",
      "A browser tab should have opened asking you to approve AWS SSO sign-in.",
      "**Before clicking Allow, make sure the code shown there matches the one above** — this confirms the approval request is really yours.",
      "",
      "Waiting for you to approve in the browser...",
    ].join("\n");
  }

  if (status === "success") {
    return "# Signed in successfully\n\nYour AWS SSO session is now active.";
  }

  return [
    "# SSO login failed",
    "",
    "```",
    errorMessage ?? "Unknown error",
    "```",
  ].join("\n");
}
