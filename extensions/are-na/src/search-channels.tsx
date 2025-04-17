import { useRef } from "react";
import { List, LaunchProps, ActionPanel, Action, Icon } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { useArena } from "./hooks/useArena";
import type { SearchChannelsResponse, Channel } from "./api/types";
import { usePromise } from "@raycast/utils";
import { ChannelView } from "./components/channel";

interface SearchArguments {
  query: string;
}

function Actions(props: { channel: Channel }) {
  return (
    <ActionPanel title={props.channel.title}>
      <ActionPanel.Section>
        <Action.Push
          icon={{ source: "extension-icon.svg" }}
          title="Enter Channel"
          target={<ChannelView channel={props.channel} />}
        />
      </ActionPanel.Section>
      <ActionPanel.Section>
        {props.channel.slug && (
          <Action.OpenInBrowser url={`https://www.are.na/${props.channel.owner_slug}/${props.channel.slug}`} />
        )}
      </ActionPanel.Section>
      <ActionPanel.Section>
        {props.channel.slug && (
          <Action.CopyToClipboard
            title="Copy Link"
            content={`https://www.are.na/${props.channel.owner_slug}/${props.channel.slug}`}
            shortcut={{ modifiers: ["cmd"], key: "." }}
          />
        )}
      </ActionPanel.Section>
    </ActionPanel>
  );
}

function ChannelListItem({ channel }: { channel: Channel }) {
  return (
    <List.Item
      icon={{ source: "extension-icon.svg" }}
      title={channel.title}
      accessories={[
        {
          text: channel.user.full_name,
          icon: { source: Icon.Person },
        },
        {
          text: channel.length.toString(),
          icon: { source: Icon.AppWindowGrid2x2 },
        },
      ]}
      actions={<Actions channel={channel} />}
    />
  );
}

export default function Command(props: LaunchProps<{ arguments: SearchArguments }>) {
  const abortable = useRef<AbortController | null>(null);
  const arena = useArena();
  const { query } = props.arguments;
  const { data, isLoading } = usePromise(
    async (q: string): Promise<SearchChannelsResponse> => {
      try {
        const response = await arena.search(q).channels({ per: 100 });
        return response;
      } catch (error) {
        showFailureToast(error, { title: "Failed to search channels" });
        return { channels: [], term: q, total_pages: 0, current_page: 1, per: 100 };
      }
    },
    [query],
    {
      abortable,
    },
  );

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search channels...">
      {data?.channels?.length === 0 ? (
        <List.EmptyView title="No channels found" description="Try a different search term" />
      ) : (
        data?.channels?.map((channel) => <ChannelListItem channel={channel} key={channel.id} />)
      )}
    </List>
  );
}
