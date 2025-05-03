import { Action, ActionPanel, Icon, Image, List } from "@raycast/api";
import { useState } from "react";

import { ActionsProps, Cast, CastDetailsProps } from "./types";
import { useCastSearch, useFarcasterInstalled, linkify } from "./utils";
import { useDebounce } from "./hooks/useDebounce";

export default function Command() {
  const [_searchText, setSearchText] = useState<string>();
  const searchText = useDebounce(_searchText, 500);

  const { data, isLoading } = useCastSearch(searchText || "");
  const hasFarcaster: boolean = useFarcasterInstalled();

  return (
    <List
      enableFiltering={false}
      onSearchTextChange={setSearchText}
      isLoading={isLoading}
      isShowingDetail={(data?.casts || []).length > 0}
      throttle
    >
      <List.EmptyView
        title={isLoading ? "Searching" : "No Results"}
        icon="no-view.png"
        description={isLoading ? "Reticulating splines..." : "Try changing your search query"}
      />
      {data?.casts.map((cast: Cast) => {
        return (
          <List.Item
            key={cast.merkleRoot}
            title={cast.body.data.text}
            accessories={[
              { date: new Date(cast.body.publishedAt) },
              { icon: { source: cast.meta.avatar ?? Icon.PersonCircle, mask: Image.Mask.Circle } },
            ]}
            icon={cast.body.data.replyParentMerkleRoot ? Icon.Reply : Icon.Message}
            detail={<CastDetails cast={cast} />}
            actions={<Actions cast={cast} farcasterInstalled={hasFarcaster} />}
          />
        );
      })}
    </List>
  );
}

function Actions({ cast, farcasterInstalled }: ActionsProps) {
  return (
    <ActionPanel>
      {farcasterInstalled && <Action.Open title="Open in Warpcast (Desktop)" target={cast.uri} />}
      <Action.OpenInBrowser
        title="Open in Warpcast (Web)"
        url={`https://warpcast.com/${cast.body.username}/${cast.merkleRoot.substring(0, 8)}`}
      />
      <Action.OpenInBrowser
        title="Open in Searchcaster"
        url={`https://searchcaster.xyz/search?merkleRoot=${cast.merkleRoot}`}
      />
    </ActionPanel>
  );
}

function CastDetails({ cast }: CastDetailsProps) {
  const text = linkify(cast.body.data.text);

  const image = cast.body.data.image;
  const imageMarkdown = image ? `![](${image})` : "";
  const markdown =
    `
    by @${cast.body.username}
    👍 ${cast.meta.reactions.count}   🔁 ${cast.meta.recasts.count}   💬 ${cast.meta.numReplyChildren}   👀 ${cast.meta.watches.count}
  ` +
    text +
    imageMarkdown;

  return <List.Item.Detail markdown={markdown} />;
}
