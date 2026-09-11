import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import { showFailureToast, useFetch } from "@raycast/utils";
import { BaseUrl, buildHeaders, ChannelDataResponse, ChannelResponse, ChannelThemesResponse } from "../api/endpoints";
import { useAuth } from "../hooks/useAuth";
import { formatFullDate, formatRelativeDate } from "../utils/formatting";

const SENTIMENT_COLOR: Record<string, Color> = {
  POSITIVE: Color.Green,
  NEGATIVE: Color.Red,
  MIXED: Color.Orange,
  NEUTRAL: Color.SecondaryText,
};

export function ChannelDetail({ channelId, title }: { channelId: string; title: string }) {
  const { token } = useAuth();
  const channelUrl = `https://dovetail.com/channels/${channelId}`;

  const { data: channel, isLoading: channelLoading } = useFetch(BaseUrl + `/v1/channels/${channelId}`, {
    headers: buildHeaders(token),
    parseResponse: async (response) => {
      const json = await response.json();
      return ChannelResponse.parse(json);
    },
    onError: (error) => {
      showFailureToast(error, { title: "Failed to load channel" });
    },
  });

  const { data: themesResult, isLoading: themesLoading } = useFetch(
    BaseUrl + `/v1/channels/${channelId}/themes?page[limit]=25`,
    {
      headers: buildHeaders(token),
      parseResponse: async (response) => {
        const json = await response.json();
        return ChannelThemesResponse.parse(json);
      },
      onError: (error) => {
        showFailureToast(error, { title: "Failed to load themes" });
      },
    },
  );

  const { data: dataResult, isLoading: dataLoading } = useFetch(
    BaseUrl + `/v1/channels/${channelId}/data?page[limit]=25&sort=source_timestamp:desc`,
    {
      headers: buildHeaders(token),
      parseResponse: async (response) => {
        const json = await response.json();
        return ChannelDataResponse.parse(json);
      },
      onError: (error) => {
        showFailureToast(error, { title: "Failed to load data points" });
      },
    },
  );

  const themes = themesResult?.data ?? [];
  const dataPoints = dataResult?.data ?? [];

  return (
    <List
      isLoading={channelLoading || themesLoading || dataLoading}
      navigationTitle={title}
      searchBarPlaceholder="Filter this channel..."
    >
      <List.Section title="Themes" subtitle={themesResult ? `${themesResult.page.total_count}` : undefined}>
        {themes.map((theme) => (
          <List.Item
            key={theme.id}
            title={theme.title}
            icon={Icon.LightBulb}
            subtitle={theme.topic?.title}
            accessories={[{ tag: { value: `${theme.datum_count}`, color: Color.SecondaryText } }]}
            actions={
              <ActionPanel>
                <Action.OpenInBrowser
                  url={theme.url ?? `https://dovetail.com/channels/${channelId}`}
                  title="Open in Dovetail"
                />
              </ActionPanel>
            }
          />
        ))}
        {themesResult?.page.has_more && (
          <List.Item
            title={`View all ${themesResult.page.total_count} themes in Dovetail`}
            icon={Icon.ArrowRight}
            actions={
              <ActionPanel>
                <Action.OpenInBrowser url={channelUrl} title="Open in Dovetail" />
              </ActionPanel>
            }
          />
        )}
      </List.Section>
      <List.Section title="Recent Data Points" subtitle={dataResult ? `${dataResult.page.total_count}` : undefined}>
        {dataPoints.map((datum) => (
          <List.Item
            key={datum.id}
            title={datum.summary || datum.text || "Untitled"}
            icon={Icon.Dot}
            accessories={[
              ...(datum.sentiment
                ? [{ tag: { value: datum.sentiment, color: SENTIMENT_COLOR[datum.sentiment] } }]
                : []),
              {
                text: formatRelativeDate(datum.source_timestamp),
                tooltip: formatFullDate(datum.source_timestamp),
              },
            ]}
            actions={
              <ActionPanel>
                <Action.OpenInBrowser
                  url={datum.url ?? `https://dovetail.com/channels/${channelId}`}
                  title="Open in Dovetail"
                />
                {datum.source_url && (
                  <Action.OpenInBrowser url={datum.source_url} title="Open Source" icon={Icon.Link} />
                )}
              </ActionPanel>
            }
          />
        ))}
        {dataResult?.page.has_more && (
          <List.Item
            title={`View all ${dataResult.page.total_count} data points in Dovetail`}
            icon={Icon.ArrowRight}
            actions={
              <ActionPanel>
                <Action.OpenInBrowser url={channelUrl} title="Open in Dovetail" />
              </ActionPanel>
            }
          />
        )}
      </List.Section>
      {channel && channel.data.topics && channel.data.topics.length > 0 && (
        <List.Section title="Topics">
          {channel.data.topics.map((topic) => (
            <List.Item key={topic.id} title={topic.title} icon={Icon.Tag} subtitle={topic.description} />
          ))}
        </List.Section>
      )}
      <List.Item
        title="Open Channel in Dovetail"
        icon={Icon.Globe}
        actions={
          <ActionPanel>
            <Action.OpenInBrowser url={channelUrl} title="Open in Dovetail" />
          </ActionPanel>
        }
      />
    </List>
  );
}
