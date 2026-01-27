import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { useGetBusinesses, useGetBusinessInvoices } from "./lib/wave";
import { Business, InvoiceStatus } from "./lib/types";
import { calculateInvoiceItemAmount, getInvoiceStatusColor } from "./lib/utils";
import { useCachedState, withAccessToken } from "@raycast/utils";
import { HELP_LINKS, INVOICE_STATUSES } from "./lib/config";
import { provider } from "./lib/oauth";
import OpenInWave from "./lib/components/open-in-wave";
import { useState } from "react";
import BusinessCustomers from "./lib/components/business-customers";
import BusinessProductsAndServices from "./lib/components/business-products-and-services";
import CreateInvoice from "./lib/components/create-invoice";

export default withAccessToken(provider)(ManageWave);

function ManageWave() {
  const { isLoading, data: businesses } = useGetBusinesses();

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
              <ActionPanel.Section title="Sales & Payments">
                <Action.Push
                  icon={Icon.Receipt}
                  title="View Invoices"
                  target={<BusinessInvoices business={business} />}
                />
                <Action.Push
                  icon={Icon.TwoPeople}
                  title="View Customers"
                  target={<BusinessCustomers business={business} />}
                />
                <Action.Push
                  icon={Icon.Box}
                  title="View Products & Services (Sales)"
                  target={<BusinessProductsAndServices business={business} />}
                />
              </ActionPanel.Section>
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

function BusinessInvoices({ business }: { business: Business }) {
  const [isShowingDetail, setIsShowingDetail] = useCachedState("details-invoices", false);
  const [status, setStatus] = useState("");

  const { isLoading, data: invoices, revalidate } = useGetBusinessInvoices(business.id);
  const filteredInvoices = invoices.filter((invoice) => !status || invoice.status === status);
  const isEmpty = !isLoading && !invoices.length;

  return (
    <List
      isLoading={isLoading}
      isShowingDetail={!isEmpty && isShowingDetail}
      searchBarPlaceholder="Search invoice"
      searchBarAccessory={
        !invoices.length ? undefined : (
          <List.Dropdown tooltip="Status" onChange={setStatus}>
            <List.Dropdown.Item icon={Icon.Receipt} title="All" value="" />
            {Object.keys(INVOICE_STATUSES).map((status) => (
              <List.Dropdown.Item
                key={status}
                icon={{ source: Icon.Receipt, tintColor: getInvoiceStatusColor(status as InvoiceStatus) }}
                title={status}
                value={status}
              />
            ))}
          </List.Dropdown>
        )
      }
    >
      {isEmpty ? (
        <List.EmptyView
          title="Get paid fast."
          description="Get paid up to 3 times faster and build your brand with custom invoices."
          actions={
            <ActionPanel>
              <OpenInWave title="Create your first invoice" url={HELP_LINKS.CreateInvoice} />
            </ActionPanel>
          }
        />
      ) : !filteredInvoices.length ? (
        <List.EmptyView
          title="Time to get paid for your work."
          actions={
            <ActionPanel>
              <Action.Push
                icon={Icon.NewDocument}
                title="Create a New Invoice"
                target={<CreateInvoice businessId={business.id} onCreate={revalidate} />}
              />
            </ActionPanel>
          }
        />
      ) : (
        <List.Section title={`Businesses / ${business.name} / Invoices`}>
          {filteredInvoices.map((invoice) => {
            const title = `${invoice.title} - ${invoice.invoiceNumber}`;
            const markdown = `# ${title}
| BILL TO | - | - | - |
| ------- | - | - | - |
| ${invoice.customer.name} | | **Invoice Date** | ${invoice.invoiceDate} |
| | | **Payment Due** | ${invoice.dueDate} |
| | | **Amount Due** (${invoice.amountDue.currency.code}) | ${invoice.amountDue.currency.symbol}${invoice.amountDue.value}


| **${invoice.itemTitle}** | **${invoice.unitTitle}** | **${invoice.priceTitle}** | **${invoice.amountTitle}** |
|----------------------|----------------------|-----------------------|------------------------|
${invoice.items.map((item) => `| ${item.product.name} | ${item.quantity} | ${item.unitPrice} | ${item.subtotal.currency.symbol}${calculateInvoiceItemAmount(item)}`).join(`\n`)}

|  |  | **Subtotal** | ${invoice.subtotal.currency.symbol}${invoice.subtotal.value} |
|--|--|-------|--------------------------------------------------------|
${invoice.discounts.length ? `| | | ${invoice.discounts[0].name} | (${invoice.discountTotal.currency.symbol}${invoice.discountTotal.value}) |` : ""}

|  |  | **Total** | ${invoice.total.currency.symbol}${invoice.total.value} |
|--|--|-------|--------------------------------------------------------|
| | | Paid | ${invoice.amountPaid.currency.symbol}${invoice.amountPaid.value} |

|  |  | **Amount Due (${invoice.amountDue.currency.code})** | ${invoice.amountDue.currency.symbol}${invoice.amountDue.value} |
|--|--|-------|--------------------------------------------------------|`;

            return (
              <List.Item
                key={invoice.id}
                icon={{
                  source: Icon.Receipt,
                  tintColor: getInvoiceStatusColor(invoice.status),
                  tooltip: invoice.status,
                }}
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
                        <List.Item.Detail.Metadata.Link
                          title="View PDF"
                          text={invoice.pdfUrl}
                          target={invoice.pdfUrl}
                        />
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
                    <Action.Push
                      icon={Icon.NewDocument}
                      title="Create a New Invoice"
                      target={<CreateInvoice businessId={business.id} onCreate={revalidate} />}
                    />
                  </ActionPanel>
                }
              />
            );
          })}
        </List.Section>
      )}
    </List>
  );
}
