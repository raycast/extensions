import { ActionPanel, List } from "@raycast/api";
import { type SearchResult } from "../useSearch";
import { DownloadAction } from "../actions/DownloadAction";
import { OpenInBrowser } from "../actions/OpenInBrowser";
import { CopyToClipboard } from "../actions/CopyToClipboard";

interface SearchListItemProps extends SearchResult {}

function SearchListItem({ image_url, name }: SearchListItemProps) {
  return (
    <List.Item
      icon={image_url}
      title={name}
      detail={<List.Item.Detail markdown={`![preview](${image_url})`} />}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <DownloadAction name={name} imageUrl={image_url} />
            <OpenInBrowser imageUrl={image_url} />
            <CopyToClipboard imageUrl={image_url} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

export { SearchListItem, type SearchListItemProps };
