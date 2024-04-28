import { Action, ActionPanel, Color, getPreferenceValues, Icon, List } from "@raycast/api";
import { showFailureToast, useFetch } from "@raycast/utils";
import fetch from "node-fetch";

import { baseUrl } from "./utils";
import { formatCurrency, formatDate } from "./scripts";
import { CommissionApiResponse, Commission, PaginationResult, Preferences, ErrorResponse } from "./types";

export default function Command() {
  const preferences = getPreferenceValues<Preferences>();
  const encodedApiKey = btoa(`${preferences.apiKey}:`);

  const { isLoading, data, pagination, revalidate } = useFetch(
    (options) => `${baseUrl}/commissions?expand[]=sale&` + new URLSearchParams({ page: String(options.page + 1) }),
    {
      headers: { Authorization: `Basic ${encodedApiKey}` },
      initialData: {
        data: [],
        hasMore: false,
        pageSize: 0,
      } as PaginationResult<Commission>,
      keepPreviousData: true,
      mapResult(result: CommissionApiResponse): PaginationResult<Commission> {
        // console.log("result:", JSON.stringify(result));
        return {
          data: result.data,
          hasMore: !!result.pagination.next_page,
          pageSize: result.pagination.limit,
        };
      },
    },
  );

  async function updatePaymentDate(id: string, paid_at: Date | null) {
    const response = await fetch(`${baseUrl}/commissions/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${encodedApiKey}`,
      },
      body: new URLSearchParams({ paid_at: paid_at ? paid_at.toISOString() : "" }),
    });

    if (!response.ok) {
      const errorResponse = (await response.json()) as ErrorResponse;
      showFailureToast(errorResponse.error, { title: "Failed to update commission" });
      return;
    }

    revalidate();
  }

  return (
    <List isLoading={isLoading} pagination={pagination}>
      {data && data.length > 0 ? (
        data.map((item) => (
          <List.Item
            key={item.id}
            icon={
              item.paid_at
                ? { source: Icon.Check, tintColor: Color.Green }
                : item.due_at && new Date(item.due_at) < new Date()
                  ? { source: Icon.Warning, tintColor: Color.Red }
                  : { source: Icon.Clock, tintColor: Color.Yellow }
            }
            title={`${item.sale.affiliate.first_name} ${item.sale.affiliate.last_name} ${formatCurrency(item.amount, item.currency)}`}
            subtitle={`Created: ${formatDate(item.created_at)}, Due: ${formatDate(item.due_at)}${item.paid_at ? `, Paid: ${formatDate(item.paid_at)}` : ""}`}
            actions={
              <ActionPanel>
                <Action.PickDate title="Set Payment Date" onChange={(date) => updatePaymentDate(item.id, date)} />
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
