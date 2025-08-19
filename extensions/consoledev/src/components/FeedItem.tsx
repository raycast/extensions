import { ActionPanel, Icon, Action, List } from "@raycast/api";
import { FC } from "react";
import { FeedItemInterface } from "../responseTypes";
import { formatDate } from "date-fns";

const FeedItem: FC<{ item: FeedItemInterface; icon: Icon }> = ({ item, icon }) => (
  <List.Item
    title={item.title}
    icon={icon}
    detail={<List.Item.Detail markdown={`# ${item.title} \n---\n ${item.description}`} />}
    actions={
      <ActionPanel>
        <Action.OpenInBrowser url={item.link} />
        <Action.CopyToClipboard content={item.link} />
        {process.env.NODE_ENV === "development" && (
          <Action
            title="Log"
            icon={Icon.Terminal}
            shortcut={{ key: ".", modifiers: ["cmd"] }}
            onAction={() => console.log(item)}
          />
        )}
      </ActionPanel>
    }
    accessories={[
      {
        text: formatDate(new Date(item.pubDate), "dd/MM/yyyy"),
        icon: {
          source: Icon.Calendar,
        },
      },
    ]}
  />
);

export default FeedItem;
