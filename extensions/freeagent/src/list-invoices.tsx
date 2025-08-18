import { ActionPanel, Action, Icon, List } from "@raycast/api";
import { useEffect, useState } from "react";
import { authorizedWithFreeAgent } from "./oauth";
import { Invoice } from "./types";
import { fetchInvoices } from "./services/freeagent";
import { formatCurrencyAmount, parseDate, mapStatusColor, getInvoiceUrl, getContactUrl } from "./utils/formatting";
import { useFreeAgent } from "./hooks/useFreeAgent";

const ListInvoices = function Command() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const { isLoading, isAuthenticated, accessToken, companyInfo, handleError } = useFreeAgent();

  useEffect(() => {
    async function loadInvoices() {
      if (!isAuthenticated || !accessToken) return;

      try {
        const invoiceList = await fetchInvoices(accessToken);
        setInvoices(invoiceList);
      } catch (error) {
        handleError(error, "Failed to fetch invoices");
      }
    }

    loadInvoices();
  }, [isAuthenticated, accessToken]);

  return (
    <List isLoading={isLoading}>
      {invoices.length === 0 && !isLoading ? (
        <List.EmptyView title="No invoices found" description="You don't have any invoices yet." />
      ) : (
        invoices.map((invoice) => (
          <List.Item
            key={invoice.url}
            icon={Icon.Document}
            title={invoice.reference}
            subtitle={invoice.contact_name}
            accessories={[
              { text: formatCurrencyAmount(invoice.currency, invoice.net_value) },
              { text: { value: invoice.status, color: mapStatusColor(invoice.status) } },
              { date: parseDate(invoice.dated_on) },
            ]}
            actions={
              companyInfo ? (
                <ActionPanel>
                  <Action.OpenInBrowser url={getInvoiceUrl(invoice, companyInfo)} />
                  <Action.OpenInBrowser
                    title="View Contact"
                    url={getContactUrl(invoice.contact, companyInfo)}
                    icon={Icon.Person}
                  />
                  <Action.CopyToClipboard title="Copy Invoice Reference" content={invoice.reference} />
                </ActionPanel>
              ) : undefined
            }
          />
        ))
      )}
    </List>
  );
};

export default authorizedWithFreeAgent(ListInvoices);
