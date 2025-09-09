import { getPreferenceValues, Icon, List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { Autumn } from "autumn-js";

export default function Customers() {
  const {api_key, sandbox_api_key, use_sandbox} = getPreferenceValues<Preferences>();
  const {isLoading,data:customers} = useCachedPromise( async () => {
    const autumn = new Autumn({secretKey: use_sandbox ? sandbox_api_key : api_key});
    const { data, error } = await autumn.customers.list({ limit: 10, offset: 0 });
    if (error) throw new Error(error.message);
    return data.list;
  }, [], {
    initialData: []
  }

  )

  return <List isLoading={isLoading}>
    {customers.map(customer => <List.Item key={customer.id} icon={Icon.PersonCircle} title={customer.name ?? ""} subtitle={customer.email ?? ""} accessories={[
      {text: customer.id},
      {date: new Date(customer.created_at), tooltip: `Created At: ${new Date(customer.created_at).toDateString()}`}
    ]} />)}
  </List>
}
