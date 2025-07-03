import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { useGetBusinesses, useGetBusinessInvoices, useGetBusinessProductsAndServices } from "./lib/wave";
import { Business, InvoiceStatus } from "./lib/types";
import { getInvoiceStatusColor } from "./lib/utils";
import { useCachedState, withAccessToken } from "@raycast/utils";
import { HELP_LINKS, INVOICE_STATUSES } from "./lib/config";
import { provider } from "./lib/oauth";
import OpenInWave from "./lib/components/open-in-wave";
import { useState } from "react";
import BusinessCustomers from "./lib/components/business-customers";

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

  const { isLoading, data: invoices } = useGetBusinessInvoices(business.id);
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
      ) : (
        <List.Section title={`Businesses / ${business.name} / Invoices`}>
          {invoices
            .filter((invoice) => !status || invoice.status === status)
            .map((invoice) => {
              const title = `${invoice.title} - ${invoice.invoiceNumber}`;
              const markdown = `# ${title}
| ${invoice.itemTitle} | ${invoice.unitTitle} | ${invoice.priceTitle} | ${invoice.amountTitle} |
|----------------------|----------------------|-----------------------|------------------------|
${invoice.items.map((item) => `| ${item.product.name} | ${item.quantity} | ${item.price} | ${item.subtotal.currency.symbol}${item.subtotal.value}`).join(`\n`)}`;

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

function BusinessProductsAndServices({ business }: { business: Business }) {
  const [isShowingSubtitle, setIsShowingSubtitle] = useCachedState("show-products-subtitle", false);
  const { isLoading, data: products } = useGetBusinessProductsAndServices(business.id);
  const isEmpty = !isLoading && !products.length;

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search product">
      {isEmpty ? (
        <List.EmptyView
          title="You haven't added any products yet."
          actions={
            <ActionPanel>
              <OpenInWave title="Add a product or service" url={HELP_LINKS.AddProductOrService} />
            </ActionPanel>
          }
        />
      ) : (
        <List.Section title={`Businesses / ${business.name} / Products & Services`}>
          {products.map((product) => (
            <List.Item
              key={product.id}
              icon={Icon.Box}
              title={product.name}
              subtitle={!isShowingSubtitle ? undefined : product.description}
              accessories={[{ text: product.price }]}
              actions={
                <ActionPanel>
                  <Action
                    icon={Icon.Text}
                    title="Toggle Subtitle"
                    onAction={() => setIsShowingSubtitle((prev) => !prev)}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}
    </List>
  );
}
