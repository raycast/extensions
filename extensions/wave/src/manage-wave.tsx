import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { useGetBusinesses, useGetBusinessInvoices } from "./lib/wave";
import { Business } from "./lib/types";
import { getInvoiceStatusColor } from "./lib/utils";
import { useCachedState } from "@raycast/utils";
import { INVOICE_STATUSES } from "./lib/config";
import { useToken } from "./lib/oauth-client";

export default function ManageWave() {
  const { data: token } = useToken();
  const { isLoading, data: businesses } = useGetBusinesses(token);

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search business">
      {businesses.map((business) => (
        <List.Item
          key={business.id}
          icon={business.isPersonal ? Icon.Person : Icon.Building}
          title={business.name}
          subtitle={business.currency.code}
          accessories={[{ date: new Date(business.modifiedAt) }]}
          actions={
            <ActionPanel>
              <Action.Push
                icon={Icon.Receipt}
                title="View Invoices"
                target={<BusinessInvoices business={business} />}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

function BusinessInvoices({ business }: { business: Business }) {
  const [isShowingDetail, setIsShowingDetail] = useCachedState("details-invoices", false);

  const { data: token } = useToken();
  const { isLoading, data: invoices } = useGetBusinessInvoices(business.id, token);

  return (
    <List isLoading={isLoading} isShowingDetail={isShowingDetail} searchBarPlaceholder="Search invoice">
      <List.Section title={`Businesses / ${business.name} / Invoices`}>
        {invoices.map((invoice) => {
          const title = `${invoice.title} - ${invoice.invoiceNumber}`;
          const markdown = `# ${title}
| ${invoice.itemTitle} | ${invoice.unitTitle} | ${invoice.priceTitle} | ${invoice.amountTitle} |
|----------------------|----------------------|-----------------------|------------------------|
${invoice.items.map((item) => `| ${item.product.name} | ${item.quantity} | ${item.price} | ${item.subtotal.currency.symbol}${item.subtotal.value}`).join(`\n`)}`;

          return (
            <List.Item
              key={invoice.id}
              icon={{ source: Icon.Receipt, tintColor: getInvoiceStatusColor(invoice.status) }}
              title={title}
              subtitle={isShowingDetail ? undefined : invoice.subhead}
              accessories={
                isShowingDetail
                  ? undefined
                  : [
                      { tag: { value: invoice.status, color: getInvoiceStatusColor(invoice.status) } },
                      { date: new Date(invoice.modifiedAt) },
                    ]
              }
              detail={
                <List.Item.Detail
                  markdown={markdown}
                  metadata={
                    <List.Item.Detail.Metadata>
                      <List.Item.Detail.Metadata.Label
                        title="Created At"
                        text={new Date(invoice.createdAt).toISOString()}
                      />
                      <List.Item.Detail.Metadata.Label
                        title="Modified At"
                        text={new Date(invoice.modifiedAt).toISOString()}
                      />
                      <List.Item.Detail.Metadata.Link title="View PDF" text={invoice.pdfUrl} target={invoice.pdfUrl} />
                      <List.Item.Detail.Metadata.Link
                        title="View in Wave"
                        text={invoice.viewUrl}
                        target={invoice.viewUrl}
                      />
                      <List.Item.Detail.Metadata.Label title="Status" text={INVOICE_STATUSES[invoice.status]} />
                      <List.Item.Detail.Metadata.Label title="Customer" text={invoice.customer.name} />
                    </List.Item.Detail.Metadata>
                  }
                />
              }
              actions={
                <ActionPanel>
                  <Action
                    icon={Icon.AppWindowSidebarLeft}
                    title="Toggle Details"
                    onAction={() => setIsShowingDetail((prev) => !prev)}
                  />
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>
    </List>
  );
}
