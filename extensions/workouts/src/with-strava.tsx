import {
  Action,
  ActionPanel,
  Detail,
  environment,
  Icon,
  launchCommand,
  LaunchType,
  MenuBarExtra,
  openExtensionPreferences,
} from "@raycast/api";
import { withAccessToken } from "@raycast/utils";
import { ComponentType, Suspense } from "react";

import { hasStravaCredentials, provider } from "./api/auth";

const retry = () => launchCommand({ name: environment.commandName, type: LaunchType.UserInitiated });

function ConnectionHelp({ error, needsSetup = false }: { error?: Error; needsSetup?: boolean }) {
  const title = needsSetup ? "Set Up Your Strava App" : "Could Not Connect to Strava";
  const message = needsSetup
    ? "Add your Strava Client ID and Client Secret in Workouts settings to connect your account."
    : (error?.message ?? "Please try signing in again.");

  const markdown = needsSetup
    ? `# ${title}

Creating a personal API app requires a **paid Strava subscription**.

## Setup Instructions

1. Open [Strava API Settings](https://www.strava.com/settings/api) and create an app, or open your existing app.
2. Set **Authorization Callback Domain** to \`raycast.com\` — without \`https://\` or a path — and save.
3. Copy the **Client ID** and **Client Secret** from your app's settings.
4. Choose **Configure Strava** below (⌘,) and paste both values into Workouts settings.
5. Reopen this command and choose **Sign in with Strava**, then authorize access in your browser.

You only need to do this once. Workouts keeps your connection up to date automatically.

Need help creating your app? See [Strava's setup guide](https://developers.strava.com/docs/getting-started/).
`
    : `# ${title}\n\n${message}`;

  if (environment.commandMode === "menu-bar") {
    return (
      <MenuBarExtra icon={Icon.ExclamationMark} tooltip={message}>
        <MenuBarExtra.Item title={title} />
        <MenuBarExtra.Item title="Configure Strava" onAction={openExtensionPreferences} />
        {!needsSetup ? <MenuBarExtra.Item title="Retry" onAction={retry} /> : null}
      </MenuBarExtra>
    );
  }
  return (
    <Detail
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action
            title="Configure Strava"
            icon={Icon.Gear}
            onAction={openExtensionPreferences}
            shortcut={{ modifiers: ["cmd"], key: "," }}
          />
          {!needsSetup ? <Action title="Retry" icon={Icon.ArrowClockwise} onAction={retry} /> : null}
          {/* eslint-disable-next-line @raycast/prefer-title-case */}
          <Action.OpenInBrowser title="Open Strava API Settings" url="https://www.strava.com/settings/api" />
          {needsSetup ? <Action.CopyToClipboard title="Copy Callback Domain" content="raycast.com" /> : null}
        </ActionPanel>
      }
    />
  );
}

export function withStrava(Command: ComponentType) {
  let authorizationError: Error | undefined;
  // Keep Raycast's single OAuth/Suspense flow, but handle expected failures as
  // data. Throwing them into a React error boundary crashes some Raycast hosts.
  const Authorized = withAccessToken({
    async authorize() {
      try {
        const token = await provider.authorize();
        authorizationError = undefined;
        return token;
      } catch (error) {
        authorizationError =
          error instanceof Error ? error : new Error("Could not connect to Strava. Please try again.");
        // No access token is supplied on failure. The guarded component below
        // renders help and never mounts Command or calls an authenticated API.
        return "";
      }
    },
  })(function ConnectedCommand() {
    return authorizationError ? <ConnectionHelp error={authorizationError} /> : <Command />;
  });

  return function StravaCommand() {
    // Required preferences can still be cleared while a command is active.
    // Do not start OAuth at all until both credentials have been provided.
    if (!hasStravaCredentials) return <ConnectionHelp needsSetup />;
    return (
      <Suspense
        fallback={
          environment.commandMode === "menu-bar" ? (
            <MenuBarExtra icon="strava-logo.svg" isLoading tooltip="Connecting to Strava" />
          ) : (
            <Detail
              isLoading
              markdown="# Connecting to Strava\n\nComplete sign-in in your browser. Your workouts will load when the connection is ready."
            />
          )
        }
      >
        <Authorized />
      </Suspense>
    );
  };
}
