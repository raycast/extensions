import { Action, ActionPanel, Detail, Icon, Toast, openExtensionPreferences, showToast } from "@raycast/api";
import { useEffect, useState } from "react";

import { pollDeviceAuthorization, requestDeviceAuthorization } from "../lib/api";
import { DeviceAuthorizationSession } from "../lib/types";
import { normalizeGetNoteError } from "../lib/errors";
import { clearPendingAuthorizationSession, getPendingAuthorizationSession } from "../lib/session";

type AuthenticateViewProps = {
  onConnected: () => void | Promise<void>;
};

export function AuthenticateView(props: AuthenticateViewProps) {
  const { onConnected } = props;
  const [session, setSession] = useState<DeviceAuthorizationSession | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [status, setStatus] = useState("No valid credentials were found. You can start device authorization now.");
  const [error, setError] = useState<string | null>(null);

  async function startAuthorization() {
    setError(null);
    setIsStarting(true);

    try {
      const nextSession = await requestDeviceAuthorization();
      setSession(nextSession);
      setStatus("Authorization request created. Finish the flow in your browser and this view will keep waiting.");
    } catch (nextError) {
      setError(normalizeGetNoteError(nextError));
    } finally {
      setIsStarting(false);
    }
  }

  useEffect(() => {
    let cancelled = false;

    async function restorePendingSession() {
      const pendingSession = await getPendingAuthorizationSession();

      if (!cancelled && pendingSession) {
        setSession(pendingSession);
        setStatus(
          "Restored the previous unfinished authorization request. This view will continue after browser approval.",
        );
      }
    }

    void restorePendingSession();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!session) {
      return;
    }

    const currentSession = session;
    let isCancelled = false;

    async function waitForAuthorization() {
      try {
        setStatus("Waiting for browser authorization...");

        await pollDeviceAuthorization(currentSession, {
          onPending() {
            if (!isCancelled) {
              setStatus("The browser authorization page is ready. This view will continue after approval.");
            }
          },
        });

        if (!isCancelled) {
          setStatus("Authorization succeeded. Refreshing extension state...");
          await onConnected();
          await showToast({
            style: Toast.Style.Success,
            title: "GetNote Connected",
          });
        }
      } catch (nextError) {
        if (!isCancelled) {
          setError(normalizeGetNoteError(nextError));
        }
      }
    }

    void waitForAuthorization();

    return () => {
      isCancelled = true;
    };
  }, [onConnected, session]);

  const markdown = session
    ? `# Connect GetNote

Complete the following steps:

1. Open the authorization page
2. Approve access in the browser
3. Return to Raycast and the extension will continue automatically

## Confirmation Code

\`${session.userCode}\`

## Status

${status}

${error ? `## Error\n\n${error}` : ""}
`
    : `# Connect GetNote

No valid credentials were found.

- Click **Start Authorization** to connect directly in Raycast
- Or open extension preferences if you already have a manual API key

## Status

${status}

${error ? `## Error\n\n${error}` : ""}
`;

  return (
    <Detail
      markdown={markdown}
      actions={
        <ActionPanel>
          {session ? (
            <Action.OpenInBrowser title="Open Authorization Page" icon={Icon.Globe} url={session.verificationUri} />
          ) : (
            <Action title="Start Authorization" icon={Icon.Key} onAction={startAuthorization} />
          )}
          <Action
            title="Restart Authorization"
            shortcut={{ modifiers: ["cmd"], key: "r" }}
            onAction={startAuthorization}
          />
          {session ? (
            <Action
              title="Cancel Current Authorization"
              icon={Icon.XMarkCircle}
              onAction={async () => {
                await clearPendingAuthorizationSession();
                setSession(null);
                setStatus("The current authorization request was cancelled. You can start again.");
                setError(null);
              }}
            />
          ) : null}
          <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
        </ActionPanel>
      }
      isLoading={isStarting}
    />
  );
}
