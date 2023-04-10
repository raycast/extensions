import {
  ActionPanel,
  ActionPanelItem,
  CopyToClipboardAction,
  Icon,
  ImageMask,
  ListItem,
  OpenInBrowserAction,
} from "@raycast/api";
import { FC } from "react";
import { FeedItemInterface, FeedType } from "../responseTypes";
import format from "date-fns/format";

const FeedItem: FC<{ item: FeedItemInterface; type?: FeedType }> = ({ item }) => (
  <ListItem
    id={item.link}
    title={item.title}
    subtitle={item.description}
    icon={{
      source: item.mediaContent ?? Icon.QuestionMark,
      mask: ImageMask.RoundedRectangle,
    }}
    accessoryTitle={format(new Date(item.pubDate), "dd/MM/yyyy")}
    accessoryIcon={{
      source: Icon.Calendar,
    }}
    actions={
      <ActionPanel>
        <OpenInBrowserAction url={item.link} />
        <CopyToClipboardAction content={item.link} />
        {process.env.NODE_ENV === "development" && (
          <ActionPanelItem
            title="Log"
            icon={Icon.Terminal}
            shortcut={{ key: ".", modifiers: ["cmd"] }}
            onAction={() => console.log(item)}
          />
        )}
      </ActionPanel>
    }
  />
);

export default FeedItem;
