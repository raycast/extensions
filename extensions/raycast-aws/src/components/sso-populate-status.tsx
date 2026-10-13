import {
  Action,
  ActionPanel,
  Detail,
  popToRoot,
  useNavigation,
} from "@raycast/api";
import { homedir } from "os";
import { join } from "path";
import { useEffect, useRef, useState } from "react";
import {
  startSsoPopulate,
  GrantedCommandSession,
  SsoPopulateOptions,
} from "../lib/assume";

const AWS_CONFIG_PATH = join(homedir(), ".aws", "config");

type Status = "connecting" | "awaiting-approval" | "success" | "error";

export function SsoPopulateStatus(options: SsoPopulateOptions) {
  const { pop } = useNavigation();
  const [status, setStatus] = useState<Status>("connecting");
  const [code, setCode] = useState<string>();
  const [verificationUrl, setVerificationUrl] = useState<string>();
  const [output, setOutput] = useState<string>();
  const [errorMessage, setErrorMessage] = useState<string>();
  const sessionRef = useRef<GrantedCommandSession>();

  useEffect(() => {
    // If the effect re-runs (e.g. a dev-mode hot-reload remount) before this session finishes,
    // the cleanup below cancels it - ignore that session's outcome instead of flashing "failed".
    let stale = false;
    const session = startSsoPopulate(options);
    sessionRef.current = session;

    session.deviceCode.then((deviceCode) => {
      if (stale || !deviceCode) return;
      setCode(deviceCode.code);
      setVerificationUrl(deviceCode.verificationUrl);
      setStatus("awaiting-approval");
    });

    session.completion
      .then((finalOutput) => {
        if (stale) return;
        setOutput(finalOutput);
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
  }, [options]);

  const markdown = renderMarkdown(status, code, output, errorMessage);

  return (
    <Detail
      markdown={markdown}
      isLoading={status === "connecting" || status === "awaiting-approval"}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label
            title="SSO Start URL"
            text={options.ssoStartUrl}
          />
          <Detail.Metadata.Label title="SSO Region" text={options.ssoRegion} />
          <Detail.Metadata.Label
            title="Profile Template"
            text={options.profileTemplate || "Granted default"}
          />
          {options.prefix && (
            <Detail.Metadata.Label title="Prefix" text={options.prefix} />
          )}
          {options.ssoBrowserProfile && (
            <Detail.Metadata.Label
              title="Browser Profile"
              text={options.ssoBrowserProfile}
            />
          )}
          <Detail.Metadata.Label
            title="Credential Process"
            text={options.noCredentialProcess ? "Disabled" : "Enabled"}
          />
          {options.useDeviceCode && (
            <Detail.Metadata.Label title="Device Code Flow" text="Forced" />
          )}
          {code && <Detail.Metadata.Label title="Device Code" text={code} />}
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          {status === "success" && (
            <>
              <Action title="Done" onAction={() => popToRoot()} />
              <Action.Open
                title="Open ~/.aws/config"
                target={AWS_CONFIG_PATH}
              />
            </>
          )}
          {status === "error" && (
            <Action title="Back to Form" onAction={() => pop()} />
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
  output: string | undefined,
  errorMessage: string | undefined,
): string {
  if (status === "connecting") {
    return "# Populating AWS profiles...\n\nWaiting for Granted to request a device code (skipped if you're already signed in).";
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
    return [
      "# Profiles updated",
      "",
      "Your `~/.aws/config` has been refreshed from AWS SSO.",
      "",
      "```",
      output || "(no output)",
      "```",
    ].join("\n");
  }

  return [
    "# Populate failed",
    "",
    "```",
    errorMessage ?? "Unknown error",
    "```",
  ].join("\n");
}
