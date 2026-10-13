import { Action, ActionPanel, Detail } from "@raycast/api";

const INSTALL_COMMAND =
  "brew tap common-fate/granted && brew install common-fate/granted/granted";

/** Shown instead of a command's normal UI when the Granted CLI can't be found. */
export function MissingDependency() {
  const markdown = [
    "# Granted not found",
    "",
    "This extension shells out to [Granted](https://docs.commonfate.io/granted/introduction) (`granted`/`assumego`) to open the AWS console, start CLI sessions, and manage SSO logins - it couldn't be found on this Mac.",
    "",
    "Install it with Homebrew, then try this command again:",
    "",
    "```sh",
    INSTALL_COMMAND,
    "```",
  ].join("\n");

  return (
    <Detail
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser
            title="Open Installation Guide"
            url="https://docs.commonfate.io/granted/getting-started"
          />
          <Action.CopyToClipboard
            title="Copy Install Command"
            content={INSTALL_COMMAND}
          />
        </ActionPanel>
      }
    />
  );
}
