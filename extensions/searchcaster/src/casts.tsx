import { Action, ActionPanel, Icon, Image, List } from "@raycast/api";
import { ActionsProps, Cast, CastDetailsProps } from "./types";
import { useCastSearch, useFarcasterInstalled } from "./utils";
import { useState } from "react";

export default function Command() {
  const [searchText, setSearchText] = useState<string>();
  const { data, isLoading } = useCastSearch(searchText || "");

  const hasFarcaster: boolean = useFarcasterInstalled();

  return (
    <List enableFiltering={false} onSearchTextChange={setSearchText} isLoading={isLoading} isShowingDetail throttle>
      {isLoading ? (
        <List.EmptyView description="Reticulating splines..." />
      ) : (
        data?.casts.map((cast: Cast) => {
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
        })
      )}
    </List>
  );
}

function Actions({ cast, farcasterInstalled }: ActionsProps) {
  return (
    <ActionPanel>
      {farcasterInstalled && (
        <Action.OpenInBrowser title="Open in Farcaster" url={`farcaster://casts/${cast.merkleRoot}`} />
      )}
      <Action.OpenInBrowser
        title="Open in Searchcaster"
        url={`https://searchcaster.xyz/search?merkleRoot=${cast.merkleRoot}`}
      />
    </ActionPanel>
  );
}

function CastDetails({ cast }: CastDetailsProps) {
  const text = cast.body.data.text;

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
