import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import { useFetch } from "@raycast/utils";

import { baseUrl, encodedApiKey } from "./utils";
import { formatRelativeDate } from "./scripts";
import { ReferralApiResponse, Referral, PaginationResult } from "./types";

export default function Command() {
  const { isLoading, data, pagination, revalidate } = useFetch(
    (options) => `${baseUrl}/referrals?expand[]=affiliate&` + new URLSearchParams({ page: String(options.page + 1) }),
    {
      headers: { Authorization: `Basic ${encodedApiKey}` },
      initialData: {
        data: [],
        hasMore: false,
        pageSize: 0,
      } as PaginationResult<Referral>,
      keepPreviousData: true,
      mapResult(result: ReferralApiResponse): PaginationResult<Referral> {
        return {
          data: result.data,
          hasMore: !!result.pagination.next_page,
          pageSize: result.pagination.limit,
        };
      },
    },
  );

  return (
    <List isLoading={isLoading} pagination={pagination}>
      {data && data.length > 0 ? (
        data.map((item) => (
          <List.Item
            key={item.id}
            icon={
              item.conversion_state === "visitor"
                ? { source: Icon.Person, tintColor: Color.Blue }
                : item.conversion_state === "lead"
                  ? { source: Icon.Clock, tintColor: Color.Yellow }
                  : { source: Icon.Checkmark, tintColor: Color.Green }
            }
            title={`${item.affiliate.campaign.name} - ${item.affiliate.first_name} ${item.affiliate.last_name}`}
            subtitle={`Visits: ${item.visits}, Created: ${formatRelativeDate(item.created_at)}, Updated: ${formatRelativeDate(item.updated_at)}${item.deactivated_at ? `, Converted at: ${formatRelativeDate(item.became_conversion_at)}` : ""}`}
            actions={
              <ActionPanel>
                <Action
                  title="Refresh"
                  icon={Icon.Repeat}
                  shortcut={{ modifiers: ["cmd"], key: "r" }}
                  onAction={() => revalidate()}
                />
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
