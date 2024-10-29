import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import useVultrPaginated from "./lib/hooks/use-vultr-paginated";
import { InvoiceItem, type BillingHistory } from "./lib/types/billing";

export default function BillingHistory() {
  const { isLoading, data, pagination } = useVultrPaginated<BillingHistory>("billing/history");

  return (
    <List isLoading={isLoading} pagination={pagination} isShowingDetail>
      {data.map((history) => {
        const isInvoice = history.type === "invoice";
        const markdown = `
| amount | balance | date |
|---------|---------|------|
| ${history.amount} | ${history.balance} | ${new Date(history.date).toLocaleDateString()} |`;
        return (
          <List.Item
            key={history.id}
            icon={isInvoice ? Icon.Receipt : Icon.CreditCard}
            title={history.description}
            subtitle={history.type}
            accessories={[{ date: new Date(history.date), tooltip: history.date }]}
            detail={<List.Item.Detail markdown={markdown} />}
            actions={
              isInvoice && (
                <ActionPanel>
                  <Action.Push
                    icon={Icon.List}
                    title="View Invoice Items"
                    target={<InvoiceItems invoiceId={history.id} />}
                  />
                </ActionPanel>
              )
            }
          />
        );
      })}
    </List>
  );
}

function InvoiceItems({ invoiceId }: { invoiceId: number }) {
  const { isLoading, data, pagination } = useVultrPaginated<InvoiceItem>(`billing/invoices/${invoiceId}/items`);

  return (
    <List isLoading={isLoading} pagination={pagination}>
      <List.Section title={`Invoice # ${invoiceId}`}>
        {data.map((item, itemIndex) => (
          <List.Item
            key={itemIndex}
            title={item.description}
            subtitle={item.product}
            accessories={[
              {
                date: { value: new Date(item.start_date), color: Color.Green },
                tooltip: `start date: ${item.start_date}`,
              },
              { date: { value: new Date(item.end_date), color: Color.Red }, tooltip: `end date: ${item.end_date}` },
              { text: `${item.units} ${item.unit_type} x ${item.unit_price} = ${item.total}` },
            ]}
          />
        ))}
      </List.Section>
    </List>
  );
}
