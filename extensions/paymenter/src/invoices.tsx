import { useCachedPromise } from "@raycast/utils";
import { paymenter } from "./config";
import { ActionPanel, Icon, List } from "@raycast/api";
import OpenInPaymenter from "./open-in-paymenter";

export default function Invoices() {
  const { isLoading, data: invoices } = useCachedPromise(
    async () => {
      const result = await paymenter.invoices.list();
      return result.data;
    },
    [],
    {
      initialData: [],
    },
  );

  return (
    <List isLoading={isLoading}>
      {invoices.map((invoice) => (
        <List.Item
          key={invoice.id}
          icon={Icon.Receipt}
          title={invoice.id}
          accessories={[{ tag: invoice.attributes.status }]}
          actions={
            <ActionPanel>
              <OpenInPaymenter route={`invoice/invoices/${invoice.id}/edit`} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
