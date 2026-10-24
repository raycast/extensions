import { Action, ActionPanel, Detail, Icon } from "@raycast/api";
import { DESKTOP_DOWNLOAD_URL } from "../utils/constants.util";

// The Raycast extension keeps searching and adding bookmarks. Everything else is handled by the
// Desktop app, the main 1bookmark client. Menu entries for those features are kept on purpose so
// they lead here instead of disappearing without a word.
export function MovedToDesktopView(props: { title: string; lead: string }) {
  const { title, lead } = props;

  const markdown = [
    `# ${title}`,
    "",
    lead,
    "",
    "The 1bookmark Desktop app is out and covers everything the extension does. Raycast now stays in " +
      "maintenance mode with just search and add, so we recommend the Desktop app.",
    "",
    "Press `Enter` to open the download page for macOS, Windows and Linux.",
  ].join("\n");

  return (
    <Detail
      navigationTitle={title}
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser title="Download Desktop App" icon={Icon.Download} url={DESKTOP_DOWNLOAD_URL} />
          <Action.CopyToClipboard title="Copy Download Link" content={DESKTOP_DOWNLOAD_URL} />
        </ActionPanel>
      }
    />
  );
}
