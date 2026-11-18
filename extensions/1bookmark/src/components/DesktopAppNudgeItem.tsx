import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import { DESKTOP_DOWNLOAD_URL } from "../utils/constants.util";

// Ad-like first row of the Spaces and My Account views. Managing spaces, members and tags lives in
// the Desktop app, so point users there from the places they would look for it.
export function DesktopAppNudgeItem() {
  return (
    <List.Item
      title="Try the 1bookmark Desktop App"
      subtitle="Manage spaces, members and tags"
      icon={{ source: Icon.Download, tintColor: Color.Green }}
      keywords={["desktop", "download", "app"]}
      accessories={[{ tag: { value: "Recommended", color: Color.Purple } }]}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser title="Download Desktop App" icon={Icon.Download} url={DESKTOP_DOWNLOAD_URL} />
          <Action.CopyToClipboard title="Copy Download Link" content={DESKTOP_DOWNLOAD_URL} />
        </ActionPanel>
      }
    />
  );
}
