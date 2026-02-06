import { Icon, List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { creem } from "./creem";

export default function ListCustomers() {
  const { isLoading, data } = useCachedPromise(
    async () => {
      const res = await creem.customers.list();
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
        <List.EmptyView
          icon={Icon.Box}
          title="No customers found"
          description="Customers will appear here once they make their first purchase."
        />
      ) : (
        data.map((customer) => <List.Item key={customer.id} title={customer.email} subtitle={customer.name || ""} />)
      )}
    </List>
  );
}
