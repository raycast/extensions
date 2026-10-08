import { useEffect, useState } from "react";

import { Color, Icon, List } from "@raycast/api";
import { MutatePromise } from "@raycast/utils";

import { ActionsInvoice } from "@/components/invoices/ActionsInvoice";
import { useClients } from "@/hooks/useClients";
import { useInvoices } from "@/hooks/useInvoices";
import { InvoiceObject } from "@/types/invoice";
import { ApiPaginatedResponse } from "@/types/utils";
import { formatPrice } from "@/utils/formatters";

export function SearchInvoices() {
  const [searchText, setSearchText] = useState("");
  const [clientId, setClientId] = useState("all");
  const [filteredInvoices, filterInvoices] = useState<InvoiceObject[]>([]);

  const { invoicesIsLoading, invoicesData, invoicesMutate } = useInvoices({
    filters: {
      "q[client_id_eq]": clientId === "all" ? "" : clientId,
      limit: 100,
      offset: 0,
    },
  });
  const { clientsIsLoading, clientsData } = useClients();

  useEffect(() => {
    if (!invoicesData) return;

    filterInvoices(
      invoicesData.filter((invoice) => invoice?.number?.toLowerCase().includes(searchText?.toLowerCase())) ?? [],
    );
  }, [clientId, invoicesData, searchText]);

  const draftInvoices = filteredInvoices?.filter((invoice) => invoice?.status === "draft");

  const unpaidInvoices = filteredInvoices?.filter(
    (invoice) => invoice?.status === "sent" || invoice?.status === "printed",
  );

  const paidInvoices = filteredInvoices?.filter((invoice) => invoice?.status === "paid");

  return (
    <List
      isLoading={invoicesIsLoading || clientsIsLoading}
      onSearchTextChange={setSearchText}
      throttle
      searchBarPlaceholder="Search invoices..."
      searchBarAccessory={
        <List.Dropdown
          tooltip="Select Client"
          storeValue={true}
          onChange={(newValue) => {
            setClientId(newValue);
          }}
        >
          <List.Dropdown.Item title="All" value="all" />
          {clientsData?.map((client) => (
            <List.Dropdown.Item
              key={client.id}
              title={
                client?.company_name
                  ? `${client.company_name} [${client.nip}]`
                  : `${client?.first_name} ${client?.last_name}`
              }
              value={String(client.id)}
            />
          ))}
        </List.Dropdown>
      }
    >
      <List.Section title="Draft Invoices" subtitle={String(draftInvoices?.length)}>
        {draftInvoices?.map((invoice) => (
          <InvoiceListItem key={invoice.number} invoice={invoice} mutateInvoices={invoicesMutate} />
        ))}
      </List.Section>

      <List.Section title="Unpaid Invoices" subtitle={String(unpaidInvoices?.length)}>
        {unpaidInvoices?.map((invoice) => (
          <InvoiceListItem key={invoice.number} invoice={invoice} mutateInvoices={invoicesMutate} />
        ))}
      </List.Section>
      <List.Section title="Paid Invoices" subtitle={String(paidInvoices?.length)}>
        {paidInvoices?.map((invoice) => (
          <InvoiceListItem key={invoice.number} invoice={invoice} mutateInvoices={invoicesMutate} />
        ))}
      </List.Section>
    </List>
  );
}

type InvoiceListItemProps = {
  invoice: InvoiceObject;
  mutateInvoices: MutatePromise<ApiPaginatedResponse<InvoiceObject[]> | undefined>;
};

function InvoiceListItem({ invoice, mutateInvoices }: InvoiceListItemProps) {
  return (
    <List.Item
      title={invoice?.number ?? "No Invoice Number"}
      subtitle={invoice?.client_company_name || `${invoice?.client_first_name} ${invoice?.client_last_name}`}
      icon={{
        source:
          invoice?.status === "paid"
            ? Icon.CheckCircle
            : invoice?.status === "printed" || invoice?.status === "sent"
              ? Icon.CircleProgress50
              : Icon.Circle,
        tintColor:
          invoice?.status === "paid"
            ? Color.Green
            : invoice?.status === "printed" || invoice?.status === "sent"
              ? Color.Orange
              : Color.Red,
      }}
      accessories={[
        {
          text: invoice?.invoice_date,
          icon: Icon.Calendar,
          tooltip: "Invoice Date",
        },
        {
          text: formatPrice(invoice?.gross_price ?? 0),
          tooltip: "Gross Price",
        },
      ]}
      actions={<ActionsInvoice invoice={invoice} mutateInvoices={mutateInvoices} />}
    />
  );
}
