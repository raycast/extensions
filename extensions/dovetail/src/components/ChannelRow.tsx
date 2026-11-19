import { Action, ActionPanel, Color, Icon, List, useNavigation } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { BaseUrl, buildHeaders, ChannelDataResponse } from "../api/endpoints";
import { useAuth } from "../hooks/useAuth";
import { formatFullDate, formatRelativeDate } from "../utils/formatting";
import { ChannelDetail } from "./ChannelDetail";

export function ChannelRow({ channel }: { channel: { id: string; title: string; created_at: string; url?: string } }) {
  const { token } = useAuth();
  const { push } = useNavigation();

  const { data, isLoading } = useFetch(BaseUrl + `/v1/channels/${channel.id}/data?page[limit]=1`, {
    headers: buildHeaders(token),
    parseResponse: async (response) => {
      const json = await response.json();
      return ChannelDataResponse.parse(json);
    },
  });

  return (
    <List.Item
      title={channel.title || "Untitled channel"}
      icon={Icon.BarChart}
      accessories={[
        isLoading
          ? { text: "Loading..." }
          : { tag: { value: `${data?.page.total_count ?? 0} data points`, color: Color.SecondaryText } },
        { text: formatRelativeDate(channel.created_at), tooltip: formatFullDate(channel.created_at) },
      ]}
      actions={
        <ActionPanel>
          <Action
            title="Browse Channel"
            icon={Icon.ArrowRight}
            onAction={() => push(<ChannelDetail channelId={channel.id} title={channel.title} />)}
          />
          <Action.OpenInBrowser
            url={channel.url ?? `https://dovetail.com/channels/${channel.id}`}
            title="Open in Dovetail"
            shortcut={{ modifiers: ["cmd"], key: "o" }}
          />
          <Action.CopyToClipboard
            title="Copy Link"
            content={channel.url ?? `https://dovetail.com/channels/${channel.id}`}
            shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
          />
        </ActionPanel>
      }
    />
  );
}
