import { Action, ActionPanel, Detail, Icon, open } from "@raycast/api";
import { SetupStage } from "../types";

interface Props {
  stage: Exclude<SetupStage, "ready">;
  appPath?: string;
}

const DOWNLOAD_URL = "https://www.privateinternetaccess.com/download/mac-vpn";

const COPY: Record<
  Exclude<SetupStage, "ready">,
  { title: string; body: string }
> = {
  checking: {
    title: "Checking Private Internet Access…",
    body: "Looking for the PIA app on this Mac.",
  },
  "not-installed": {
    title: "Private Internet Access is not installed",
    body: [
      "This extension controls the PIA desktop app through its command-line helper.",
      "",
      "Install PIA, sign in, then reopen this command.",
    ].join("\n"),
  },
  "no-cli": {
    title: "PIA command-line helper not found",
    body: [
      "PIA is installed, but its `piactl` helper isn't available.",
      "",
      "Open the PIA app, go to **Settings → General**, and enable **Install PIA command-line helper**. Then come back here.",
    ].join("\n"),
  },
  "not-logged-in": {
    title: "Sign in to Private Internet Access",
    body: [
      "PIA is installed but no account is signed in.",
      "",
      "Open the app and sign in — this extension never handles your credentials.",
    ].join("\n"),
  },
  "daemon-unavailable": {
    title: "PIA background service isn't responding",
    body: [
      "The PIA daemon didn't answer. Open the PIA app once so it can start.",
      "",
      "To let Raycast control the VPN without keeping the app open, enable **Allow PIA to run in the background** in the app's settings.",
    ].join("\n"),
  },
};

export function SetupView({ stage, appPath }: Props) {
  const { title, body } = COPY[stage];

  return (
    <Detail
      navigationTitle="Private Internet Access"
      markdown={`<img src="extension-icon.png" alt="PIA" height="96" />\n\n# ${title}\n\n${body}`}
      actions={
        <ActionPanel>
          {appPath && (
            <Action
              title="Open Pia App"
              icon={Icon.AppWindow}
              onAction={() => open(appPath)}
            />
          )}
          {stage === "not-installed" && (
            <Action
              title="Download Pia"
              icon={Icon.Download}
              onAction={() => open(DOWNLOAD_URL)}
            />
          )}
        </ActionPanel>
      }
    />
  );
}
