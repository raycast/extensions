import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import { showFailureToast, useFetch } from "@raycast/utils";
import fetch from "node-fetch";

import { baseUrl, encodedApiKey } from "./utils";
import { formatCurrency, formatRelativeDate } from "./scripts";
import { CommissionApiResponse, Commission, PaginationResult, ErrorResponse } from "./types";

export default function Command() {
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
            subtitle={`Created: ${formatRelativeDate(item.created_at)}, Due: ${formatRelativeDate(item.due_at)}${item.paid_at ? `, Paid: ${formatRelativeDate(item.paid_at)}` : ""}`}
            actions={
              <ActionPanel>
                <ActionPanel.Section title="Payout">
                  {/* Docs show that you can update the paid_at date after setting it but this is no longer supported */}
                  {!item.paid_at && (
                    <Action.PickDate title="Set Payment Date" onChange={(date) => updatePaymentDate(item.id, date)} />
                  )}
                  {item.sale.affiliate.paypal_email && (
                    <>
                      <Action.OpenInBrowser
                        title="Open PayPal Payment Page"
                        shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
                        url="https://www.paypal.com/myaccount/transfer/homepage/pay"
                      />
                      <Action.Paste
                        title="Paste PayPal Email"
                        shortcut={{ modifiers: ["cmd", "shift"], key: "v" }}
                        content={item.sale.affiliate.paypal_email}
                      />
                    </>
                  )}
                  {item.sale.affiliate.wise_email && (
                    <>
                      <Action.OpenInBrowser
                        title="Open Wise Payment Page"
                        shortcut={{ modifiers: ["cmd", "shift"], key: "w" }}
                        url="https://wise.com/send"
                      />
                      <Action.Paste
                        title="Paste Wise Email"
                        shortcut={{ modifiers: ["cmd", "shift"], key: "v" }}
                        content={item.sale.affiliate.wise_email}
                      />
                    </>
                  )}
                  {item.sale.referral.stripe_customer_id && (
                    <Action.OpenInBrowser
                      title="View Customer In Stripe"
                      shortcut={{ modifiers: ["cmd", "shift"], key: "s" }}
                      url={`https://dashboard.stripe.com/customers/${item.sale.referral.stripe_customer_id}`}
                    />
                  )}
                </ActionPanel.Section>
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
