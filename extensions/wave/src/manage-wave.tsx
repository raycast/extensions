import { Action, ActionPanel, Icon, List } from "@raycast/api";
import {
  useGetBusinessCustomers,
  useGetBusinesses,
  useGetBusinessInvoices,
  useGetBusinessProductsAndServices,
} from "./lib/wave";
import { Business } from "./lib/types";
import { getInvoiceStatusColor } from "./lib/utils";
import { getAccessToken, useCachedState, withAccessToken } from "@raycast/utils";
import { INVOICE_STATUSES } from "./lib/config";
import CustomerStatement from "./lib/components/customer-statement";
import { provider } from "./lib/oauth";

export default withAccessToken(provider)(ManageWave);

function ManageWave() {
  const { token } = getAccessToken();
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

  const { token } = getAccessToken();
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

function BusinessCustomers({ business }: { business: Business }) {
  const [isShowingDetail, setIsShowingDetail] = useCachedState("show-customer-details", false);

  const { token } = getAccessToken();
  const { isLoading, data: customers } = useGetBusinessCustomers(business.id, token);

  return (
    <List isLoading={isLoading} isShowingDetail={isShowingDetail} searchBarPlaceholder="Search customer">
      <List.Section title={`Businesses / ${business.name} / Customers`}>
        {customers.map((customer) => {
          return (
            <List.Item
              key={customer.id}
              icon={Icon.Person}
              title={customer.name}
              subtitle={isShowingDetail ? undefined : `${customer.firstName} ${customer.lastName}`}
              accessories={
                isShowingDetail ? undefined : [{ text: customer.email }, { date: new Date(customer.modifiedAt) }]
              }
              detail={
                <List.Item.Detail
                  metadata={
                    <List.Item.Detail.Metadata>
                      <List.Item.Detail.Metadata.Label
                        title="Created At"
                        text={new Date(customer.createdAt).toISOString()}
                      />
                      <List.Item.Detail.Metadata.Label
                        title="Modified At"
                        text={new Date(customer.modifiedAt).toISOString()}
                      />
                      <List.Item.Detail.Metadata.Link
                        title="Website"
                        text={customer.website}
                        target={customer.website}
                      />
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
                    icon={Icon.Paragraph}
                    title="View Customer Statement"
                    target={
                      <CustomerStatement
                        businessId={business.id}
                        customers={customers}
                        initialCustomerId={customer.id}
                      />
                    }
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

function BusinessProductsAndServices({ business }: { business: Business }) {
  const [isShowingSubtitle, setIsShowingSubtitle] = useCachedState("show-products-subtitle", false);
  const { token } = getAccessToken();
  const { isLoading, data: products } = useGetBusinessProductsAndServices(business.id, token);

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search product">
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
    </List>
  );
}
