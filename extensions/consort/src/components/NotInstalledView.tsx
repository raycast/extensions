import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { CONSORT_HOMEBREW_COMMAND, CONSORT_WEBSITE_URL } from "../lib/consort";

export function NotInstalledView() {
  return (
    <List>
      <List.EmptyView
        icon="extension-icon.png"
        title="Consort Is Not Installed"
        description="Download Consort to pair any two AirPlay, Bluetooth, wired, or Mac speakers in true stereo."
        actions={
          <ActionPanel>
            <Action.OpenInBrowser title="Download Consort" url={CONSORT_WEBSITE_URL} icon={Icon.Download} />
            <Action.CopyToClipboard
              title="Copy Homebrew Install Command"
              content={CONSORT_HOMEBREW_COMMAND}
              icon={Icon.Terminal}
            />
          </ActionPanel>
        }
      />
    </List>
  );
}
