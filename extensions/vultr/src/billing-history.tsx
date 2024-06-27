import { Action, ActionPanel, Color, List } from "@raycast/api";
import useVultrPaginated from "./lib/hooks/useVultrPaginated";
import { InvoiceItem, type BillingHistory } from "./lib/types/billing";

export default function BillingHistory() {
    const { isLoading, data, pagination } = useVultrPaginated<BillingHistory>("billing/history");
    
    return <List isLoading={isLoading} pagination={pagination} isShowingDetail>
        {data.map(history => <List.Item key={history.id} title={history.description} subtitle={history.type} accessories={[
            {date: new Date(history.date)}]} detail={<List.Item.Detail markdown={`amount: ${history.amount} \n\n balance: ${history.balance}`} />} actions={history.type==="invoice" && <ActionPanel>
                <Action.Push title="View Invoice Items" target={<InvoiceItems invoiceId={history.id} />} />
            </ActionPanel>} />)}
    </List>
}

function InvoiceItems({ invoiceId }: {invoiceId: number }) {
    const { isLoading, data, pagination } = useVultrPaginated<InvoiceItem>(`billing/invoices/${invoiceId}/items`);

    return <List isLoading={isLoading} pagination={pagination}>
        <List.Section title={`Invoice # ${invoiceId}`}>
            {data.map((item, itemIndex) => <List.Item key={itemIndex} title={item.description} subtitle={item.product} accessories={[
                { date: { value: new Date(item.start_date), color: Color.Green } },
                { date: { value: new Date(item.end_date), color: Color.Red } },
                { text: `${item.units} ${item.unit_type} x ${item.unit_price} = ${item.total}` }
            ]} />)}
        </List.Section>
    </List>
}