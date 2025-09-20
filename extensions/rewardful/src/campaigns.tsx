import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { useMemo } from "react";

import { baseUrl, currentLocale, encodedApiKey, siteUrl } from "./utils";
import { CampaignApiResponse, Campaign, PaginationResult } from "./types";
import { formatCurrency, formatShortDate } from "./scripts";

export default function Command() {
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
    <List isLoading={isLoading} pagination={pagination} isShowingDetail>
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
            actions={
              <ActionPanel>
                <Action.OpenInBrowser
                  title="View In Rewardful"
                  shortcut={{ modifiers: ["cmd"], key: "o" }}
                  url={`${siteUrl}/campaigns/${item.id}`}
                />
                <Action
                  title="Refresh"
                  icon={Icon.Repeat}
                  shortcut={{ modifiers: ["cmd"], key: "r" }}
                  onAction={() => revalidate()}
                />
              </ActionPanel>
            }
            detail={
              <List.Item.Detail
                metadata={
                  <List.Item.Detail.Metadata>
                    <List.Item.Detail.Metadata.Link
                      title="Website"
                      target={item.url}
                      text={item.url.replace(/^(https?:\/\/)?(www\.)?/, "")}
                    />
                    <List.Item.Detail.Metadata.Separator />
                    <List.Item.Detail.Metadata.Label
                      title="Affiliates"
                      text={item.affiliates.toLocaleString(currentLocale).toString()}
                    />
                    <List.Item.Detail.Metadata.Label
                      title="Visitors"
                      text={item.visitors.toLocaleString(currentLocale).toString()}
                    />
                    <List.Item.Detail.Metadata.Label
                      title="Leads"
                      text={item.leads.toLocaleString(currentLocale).toString()}
                    />
                    <List.Item.Detail.Metadata.Label
                      title="Conversions"
                      text={item.conversions.toLocaleString(currentLocale).toString()}
                    />
                    <List.Item.Detail.Metadata.Separator />
                    {item.commission_percent && (
                      <List.Item.Detail.Metadata.Label
                        title="Commission %"
                        text={`${item.commission_percent.toString()}%`}
                      />
                    )}
                    {item.commission_amount_cents && (
                      <List.Item.Detail.Metadata.Label
                        title="Commission Amount"
                        text={formatCurrency(item.commission_amount_cents, item.commission_amount_currency as string)}
                      />
                    )}
                    <List.Item.Detail.Metadata.Label
                      title="Minimum Payout"
                      text={formatCurrency(item.minimum_payout_cents, item.minimum_payout_currency as string)}
                    />
                    <List.Item.Detail.Metadata.Separator />
                    <List.Item.Detail.Metadata.Label
                      title="Days Before Referrals Expire"
                      text={item.days_before_referrals_expire.toString()}
                    />
                    <List.Item.Detail.Metadata.Label
                      title="Days Until Commissions Are Due"
                      text={item.days_until_commissions_are_due.toString()}
                    />
                    <List.Item.Detail.Metadata.Separator />
                    <List.Item.Detail.Metadata.Label title="Created" text={formatShortDate(item.created_at)} />
                    <List.Item.Detail.Metadata.Label title="Updated" text={formatShortDate(item.updated_at)} />
                  </List.Item.Detail.Metadata>
                }
              />
            }
          />
        ))
      ) : (
        <List.EmptyView title="No data available" description="Failed to fetch data from the API." />
      )}
    </List>
  );
}
