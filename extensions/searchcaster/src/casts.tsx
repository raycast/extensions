import { Action, ActionPanel, Clipboard, Icon, Image, List, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
import got from "got";

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
      {farcasterInstalled && <Action.OpenInBrowser title="Open in Farcaster" url={cast.uri} />}
      <Action.OpenInBrowser
        title="Open in Searchcaster"
        url={`https://searchcaster.xyz/search?merkleRoot=${cast.merkleRoot}`}
      />
      <Action
        title="Copy Shareable Link"
        icon={{ source: Icon.Link }}
        onAction={async () => {
          showToast({
            style: Toast.Style.Animated,
            title: "Creating Sharecaster URL",
            message: "Please wait...",
          });

          try {
            const { data }: { data: string } = await got
              .post("https://sharecaster.xyz/api/share", {
                json: { sharecast: cast.uri },
              })
              .json();

            const sharecasterUrl = `https://sharecaster.xyz/${data}`;
            await Clipboard.copy(sharecasterUrl);

            showToast({
              style: Toast.Style.Success,
              title: "Success",
              message: "Copied to clipboard",
            });
          } catch (err) {
            showToast({
              style: Toast.Style.Failure,
              title: "Error",
              message: "Failed to create Sharecaster URL",
            });
          }
        }}
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
