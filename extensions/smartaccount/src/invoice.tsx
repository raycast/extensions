import { Action, ActionPanel, getPreferenceValues, Icon, List } from "@raycast/api";
import { useEffect, useState } from "react";

async function getInvoices(): Promise<InvoiceResponse> {
  const { api_key, api_key_id, url } = getPreferenceValues<Preferences>();
  const e = await fetch(`${url}/api/invoices`, {
    headers: {
      "key-id": api_key_id,
      authorization: api_key,
    },
  });
  return await (e.json() as Promise<InvoiceResponse>);
}

function calculateTotal({ line_items, currency }: Invoice): string {
  const total = line_items.map(({ unit_price, qty }) => unit_price * qty).reduce((curr, acc) => curr + acc);
  const num = (total / 100).toFixed(2);

  return `${num} ${currency}`;
}

type InvoiceResponse = {
  entries: Invoice[];
};

type Invoice = {
  id: string;
  date: string;
  document_id: string;
  invoice_number: string;
  client: {
    name: string;
  };
  line_items: {
    unit_price: number;
    qty: number;
  }[];
  currency: string;
  total: string;
};

export default function Command() {
  const { url } = getPreferenceValues<Preferences>();

  const [invoices, setInvoices] = useState<Invoice[]>([]);

  useEffect(() => {
    getInvoices()
      .then(({ entries }) => {
        return entries.map((invoice) => ({ ...invoice, total: calculateTotal(invoice) }));
      })
      .then((invoices) => setInvoices(invoices));
  }, []);

  return (
    <List>
      {invoices.map((i) => (
        <List.Item
          key={i.id}
          icon={Icon.CreditCard}
          title={i.invoice_number}
          subtitle={i.total}
          accessories={[{ text: `${i.client.name}` }]}
          actions={
            <ActionPanel title="#1 in raycast/extensions">
              <Action.OpenInBrowser title="View PDF" url={`${url}/documents/${i.document_id}/download`} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
