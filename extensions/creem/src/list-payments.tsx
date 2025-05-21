import { List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { API_KEY, creem } from "./creem";

export default function ListPayments() {
  const { isLoading, data } = useCachedPromise(
    async () => {
      const res = await creem.searchTransactions({ xApiKey: API_KEY });
      return res.items;
    },
    [],
    {
      initialData: [],
    },
  );

  return (
    <List isLoading={isLoading}>
      {data.length === 0 ? (
        <List.EmptyView title="No Payments" description="No payments found." />
      ) : (
        data.map((payment) => (
          <List.Item
            key={payment.id}
            icon="payments.svg"
            title={payment.amount.toString()}
            accessories={[{ tag: payment.status }]}
          />
        ))
      )}
    </List>
  );
}
