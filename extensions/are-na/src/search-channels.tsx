import { useRef } from "react";
import { List, LaunchProps, ActionPanel, Action, Icon } from "@raycast/api";
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
      const response = await arena.search(q).channels({ per: 100 });
      return response;
    },
    [query],
    {
      abortable,
    },
  );

  return (
    <List isLoading={isLoading}>
      {data?.channels?.map((channel, index) => <ChannelListItem channel={channel} key={index} />)}
    </List>
  );
}
