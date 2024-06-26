import { List } from "@raycast/api";
import useVultrPaginated from "./lib/hooks/useVultrPaginated";
import { type BillingHistory } from "./lib/types/billing";

export default function BillingHistory() {
    const { isLoading, data, pagination } = useVultrPaginated<BillingHistory>("billing/history");
    
    return <List isLoading={isLoading} pagination={pagination} isShowingDetail>
        {data.map(history => <List.Item key={history.id} title={history.description} subtitle={history.type} accessories={[
            {date: new Date(history.date)}]} detail={<List.Item.Detail markdown={`amount: ${history.amount} \n\n balance: ${history.balance}`} />} />)}
    </List>
}