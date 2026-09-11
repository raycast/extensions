import html2md from "html-to-md";

import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";

import { ResultItem } from "@/types";

import { ItemDetails } from "@/components/item-details";

export const ListItem = ({
  item,
  toggleDetails,
  showDetails,
  toggleShowContent,
  showContent,
}: {
  item: ResultItem;
  toggleDetails: () => void;
  showDetails: boolean;
  toggleShowContent: () => void;
  showContent: boolean;
}) => {
  return (
    <List.Item
      id={`${item.id}`}
      title={html2md(item.title)}
      icon={
        item.subtype === "page"
          ? { source: Icon.Document, tintColor: Color.Green }
          : { source: Icon.Bookmark, tintColor: Color.SecondaryText }
      }
      actions={
        <ActionPanel>
          {showDetails ? (
            <>
              <Action.OpenInBrowser url={item.url} title="Open in Browser" icon={Icon.Globe} />
              <Action
                icon={Icon.Document}
                title={showContent ? "Only Show Excerpt" : "Show Full Article"}
                onAction={() => toggleShowContent()}
              />
              <Action icon={Icon.Eye} title="View Details" onAction={() => toggleDetails()} />
            </>
          ) : (
            <>
              <Action icon={Icon.Eye} title="View Details" onAction={() => toggleDetails()} />
              <Action.OpenInBrowser url={item.url} title="Open in Browser" icon={Icon.Globe} />
            </>
          )}
        </ActionPanel>
      }
      detail={showDetails ? <ItemDetails item={item} showContent={showContent} /> : undefined}
    />
  );
};
