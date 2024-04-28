import { Action, ActionPanel, Color, getPreferenceValues, Icon, List } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { useMemo } from "react";

import { baseUrl, siteUrl } from "./utils";
import { CampaignApiResponse, Campaign, PaginationResult, Preferences } from "./types";

const preferences = getPreferenceValues();
const localePref = preferences.locale || "en-us";

export default function Command() {
  const preferences = getPreferenceValues<Preferences>();
  const encodedApiKey = btoa(`${preferences.apiKey}:`);

  const { isLoading, data, pagination, revalidate } = useFetch(
    (options) => `${baseUrl}/campaigns?` + new URLSearchParams({ page: String(options.page + 1) }),
    {
      headers: { Authorization: `Basic ${encodedApiKey}` },
      initialData: {
        data: [],
        hasMore: false,
        pageSize: 0,
      } as PaginationResult<Campaign>,
      keepPreviousData: true,
      mapResult(result: CampaignApiResponse): PaginationResult<Campaign> {
        return {
          data: result.data,
          hasMore: !!result.pagination.next_page,
          pageSize: result.pagination.limit,
        };
      },
    },
  );

  const sortedData = useMemo(() => {
    if (!isLoading && data && data.length > 0) {
      return [...data].sort((a, b) => a.name.localeCompare(b.name));
    }
    return [];
  }, [data, isLoading]);

  return (
    <List isLoading={isLoading} pagination={pagination}>
      {sortedData && sortedData.length > 0 ? (
        sortedData.map((item) => (
          <List.Item
            key={item.id}
            title={`${item.name}`}
            icon={
              item.private
                ? { source: Icon.Lock, tintColor: Color.Blue }
                : { source: Icon.BullsEye, tintColor: Color.Green }
            }
            subtitle={`Affiliates: ${item.affiliates.toLocaleString(localePref)}, Visitors: ${item.visitors.toLocaleString(localePref)}, Leads: ${item.leads.toLocaleString(localePref)}, Conversions: ${item.conversions.toLocaleString(localePref)}`}
            actions={
              <ActionPanel>
                <Action.OpenInBrowser
                  title="View In Rewardful"
                  shortcut={{ modifiers: ["cmd"], key: "o" }}
                  url={`${siteUrl}/campaigns/${item.id}`}
                />
                <Action title="Refresh" shortcut={{ modifiers: ["cmd"], key: "r" }} onAction={() => revalidate()} />
              </ActionPanel>
            }
          />
        ))
      ) : (
        <List.EmptyView title="No data available" description="Failed to fetch data from the API." />
      )}
    </List>
  );
}
