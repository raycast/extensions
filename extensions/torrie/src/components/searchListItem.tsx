import { ActionPanel, Action, List, showToast, Toast, Icon, Clipboard } from "@raycast/api";
import { extractMagnetLink } from "../api/topTorrents";
import { Torrent } from "../interface/torrent";

export function SearchListItem({ searchResult }: { searchResult: Torrent }) {
  return (
    <List.Item
      title={searchResult.title}
      icon={{ source: Icon.Circle, tintColor: searchResult.color }}
      subtitle={searchResult.size}
      accessoryTitle={searchResult.seeds + " / " + searchResult.leeches}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action
              title="Copy Magnet Link"
              icon={Icon.Link}
              onAction={() => {
                showToast({ title: "Fetching Magnet Link", style: Toast.Style.Animated });
                console.log(searchResult.pageLink);
                extractMagnetLink(searchResult.pageLink)
                  .then((magnet) => {
                    if (magnet && magnet !== "") {
                      Clipboard.copy(magnet);
                      console.log("Copied magnet link to clipboard:", `|${magnet}|`);
                      showToast({ title: "Copied Magnet Link", style: Toast.Style.Success });
                    } else {
                      showToast({ title: "Failed to get magnet link", style: Toast.Style.Failure });
                    }
                  })
                  .catch((err: Error) => {
                    showToast({ title: "Failed to fetch magnet link", message: err.name, style: Toast.Style.Failure });
                  });
              }}
            />
            <Action.OpenInBrowser title="Open in Browser" url={searchResult.pageLink} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
