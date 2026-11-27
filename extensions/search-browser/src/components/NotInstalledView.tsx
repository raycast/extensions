import { Action, ActionPanel, Detail, Icon } from "@raycast/api";
import { SEARCH_DOWNLOAD_URL } from "../lib/constants";

const NOT_INSTALLED_MARKDOWN = `# Search Browser Not Installed

**Search** by Office Commun wasn't found in your Applications folder.

Install Search Browser for macOS to browse open tabs, pinned tabs, bookmarks, and history from Raycast.

- Download from [searchbrowser.app](${SEARCH_DOWNLOAD_URL})
`;

export function NotInstalledView() {
  return (
    <Detail
      markdown={NOT_INSTALLED_MARKDOWN}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser title="Download Search Browser" url={SEARCH_DOWNLOAD_URL} icon={Icon.Download} />
        </ActionPanel>
      }
    />
  );
}
