import { Action, ActionPanel, Detail, Icon } from "@raycast/api";

export const HORA_DIRECT_DOWNLOAD = "https://horacal.app/download/direct/";
export const HORA_SETAPP = "https://setapp.com/";
export const HOMEBREW_INSTALL_COMMAND = "brew install --cask szamowski-dev/tap/hora";

/**
 * What someone sees when the extension has nothing to talk to.
 *
 * Most people who land here found this extension in the Raycast Store without
 * knowing hora exists, so this screen is the only pitch the product gets. It
 * is written as one, not as an error.
 */
export function HoraRequired({ reason }: { reason: "missing" | "outdated" }) {
  const markdown =
    reason === "outdated"
      ? `# Update hora Calendar

Your copy of hora Calendar is older than 1.1.5 and cannot be controlled from Raycast yet.

Install the latest Direct release from [horacal.app](https://horacal.app/download/direct/) or update your Setapp copy. The Mac App Store update is still pending.`
      : `# hora Calendar for Mac required

**Native Google Calendar for Mac.**

Create and join meetings without opening your browser.

Your calendar, your tasks, your meeting rooms and your invitations in one native app — no Electron, no web views. This extension is how you reach it from Raycast.

**Recommended: Direct from hora.** Download it from [horacal.app](https://horacal.app/download/direct/) or install it with Homebrew. Setapp also has the Raycast-compatible version. The Mac App Store update is still pending.`;

  return (
    <Detail
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser title="Download Direct Version" icon={Icon.Download} url={HORA_DIRECT_DOWNLOAD} />
          {reason === "missing" && (
            <Action.CopyToClipboard
              title="Copy Homebrew Install Command"
              content={HOMEBREW_INSTALL_COMMAND}
              icon={Icon.Terminal}
            />
          )}
          <Action.OpenInBrowser title="Get Setapp Version" icon={Icon.Box} url={HORA_SETAPP} />
        </ActionPanel>
      }
    />
  );
}
