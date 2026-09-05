import { Action, ActionPanel, Color, Icon, List } from '@raycast/api';
import { useCachedPromise } from '@raycast/utils';
import { useState } from 'react';
import { formatBytes, formatPercentage } from './insights-utils';
import { getCloudflareService, withCloudflareAccessToken } from './oauth';
import { handleNetworkError } from './utils';
import {
  ZoneResourceContext,
  ZoneResourcePicker,
} from './zone-resource-picker';

const periods = {
  '24h': { title: 'Last 24 Hours', hours: 24 },
  '7d': { title: 'Last 7 Days', hours: 24 * 7 },
  '30d': { title: 'Last 30 Days', hours: 24 * 30 },
} as const;

type Period = keyof typeof periods;

function AnalyticsView({ context }: { context: ZoneResourceContext }) {
  const [period, setPeriod] = useState<Period>('24h');
  const { isLoading, data: analytics } = useCachedPromise(
    async (selectedPeriod: Period) => {
      const until = new Date();
      const since = new Date(
        until.getTime() - periods[selectedPeriod].hours * 60 * 60 * 1000,
      );
      return getCloudflareService().getZoneAnalytics(
        context.zone.id,
        since,
        until,
      );
    },
    [period],
    { onError: handleNetworkError },
  );

  const number = new Intl.NumberFormat();
  return (
    <List
      isLoading={isLoading}
      isShowingDetail
      navigationTitle={`${context.zone.name} Analytics`}
      searchBarAccessory={
        <List.Dropdown
          tooltip="Analytics Period"
          value={period}
          onChange={(value) => setPeriod(value as Period)}
        >
          {Object.entries(periods).map(([value, option]) => (
            <List.Dropdown.Item
              key={value}
              title={option.title}
              value={value}
            />
          ))}
        </List.Dropdown>
      }
    >
      {analytics && (
        <List.Item
          icon={Icon.BarChart}
          title={periods[period].title}
          subtitle={`${number.format(analytics.requests)} requests`}
          accessories={[
            {
              tag: {
                value: `${number.format(analytics.uniqueVisitors)} visitors`,
                color: Color.Blue,
              },
            },
          ]}
          detail={
            <List.Item.Detail
              metadata={
                <List.Item.Detail.Metadata>
                  <List.Item.Detail.Metadata.Label
                    title="Requests"
                    text={number.format(analytics.requests)}
                  />
                  <List.Item.Detail.Metadata.Label
                    title="Cached Requests"
                    text={`${number.format(analytics.cachedRequests)} (${formatPercentage(analytics.cachedRequests, analytics.requests)})`}
                  />
                  <List.Item.Detail.Metadata.Label
                    title="Bandwidth"
                    text={formatBytes(analytics.bandwidth)}
                  />
                  <List.Item.Detail.Metadata.Label
                    title="Cached Bandwidth"
                    text={`${formatBytes(analytics.cachedBandwidth)} (${formatPercentage(analytics.cachedBandwidth, analytics.bandwidth)})`}
                  />
                  <List.Item.Detail.Metadata.Separator />
                  <List.Item.Detail.Metadata.Label
                    title="Page Views"
                    text={number.format(analytics.pageViews)}
                  />
                  <List.Item.Detail.Metadata.Label
                    title="Unique Visitors"
                    text={number.format(analytics.uniqueVisitors)}
                  />
                  <List.Item.Detail.Metadata.Label
                    title="Threats"
                    text={number.format(analytics.threats)}
                  />
                  <List.Item.Detail.Metadata.Separator />
                  <List.Item.Detail.Metadata.Label
                    title="From"
                    text={new Date(analytics.since).toLocaleString()}
                  />
                  <List.Item.Detail.Metadata.Label
                    title="Until"
                    text={new Date(analytics.until).toLocaleString()}
                  />
                </List.Item.Detail.Metadata>
              }
            />
          }
          actions={
            <ActionPanel>
              <Action.CopyToClipboard
                title="Copy Analytics Summary"
                content={JSON.stringify(analytics, null, 2)}
              />
            </ActionPanel>
          }
        />
      )}
    </List>
  );
}

function Command() {
  return (
    <ZoneResourcePicker
      actionTitle="Show Analytics"
      icon={Icon.BarChart}
      renderTarget={(context) => <AnalyticsView context={context} />}
    />
  );
}

export default withCloudflareAccessToken(Command);
