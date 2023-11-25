import {
  Action,
  ActionPanel,
  Alert,
  Color,
  confirmAlert,
  Icon,
  launchCommand,
  LaunchType,
  List,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { MutatePromise } from "@raycast/utils";
import { format } from "date-fns";
import { useEffect, useState } from "react";
import { ApiInvoice } from "../../api/invoice";
import useClients from "../../hooks/useClients";
import useInvoices from "../../hooks/useInvoices";
import { InvoiceObject } from "../../types/invoice";
import { ApiPaginatedResponse } from "../../types/utils";
import { formatPrice } from "../../utils/formatters";
import MailInvoice from "./MailInvoice";
import UpdateInvoice from "./UpdateInvoice";

export default function SearchInvoices() {
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
      invoicesData.filter((invoice) => invoice?.number?.toLowerCase().includes(searchText?.toLowerCase())) ?? []
    );
  }, [clientId, invoicesData, searchText]);

  const draftInvoices = filteredInvoices?.filter((invoice) => invoice?.status === "draft");

  const unpaidInvoices = filteredInvoices?.filter(
    (invoice) => invoice?.status === "sent" || invoice?.status === "printed"
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
  const { push } = useNavigation();

  return (
    <List.Item
      title={invoice?.number ?? "No Invoice Number"}
      subtitle={
        invoice?.client_company_name
          ? `${invoice.client_company_name}`
          : `${invoice?.client_first_name} ${invoice?.client_last_name}`
      }
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
          tooltip: "Invoice Date",
        },
        {
          text: formatPrice(invoice?.gross_price ?? 0),
          tooltip: "Gross Price",
        },
      ]}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action
              title="Send Invoice via Mail"
              icon={Icon.Envelope}
              shortcut={{ modifiers: ["cmd", "shift"], key: "m" }}
              onAction={async () => {
                push(<MailInvoice invoice={invoice} mutateInvoices={mutateInvoices} />);
              }}
            />
            {!invoice?.paid_date ? (
              <Action.PickDate
                title="Set as Paid..."
                icon={Icon.BankNote}
                shortcut={{ modifiers: ["cmd", "shift"], key: "d" }}
                onChange={async (date) => {
                  const toast = await showToast({
                    style: Toast.Style.Animated,
                    title: "Setting as paid",
                  });

                  try {
                    await mutateInvoices(
                      ApiInvoice.setAsPaid(invoice.id, {
                        paid_date: format(new Date(date ?? new Date()), "yyyy-MM-dd"),
                      })
                    );

                    toast.style = Toast.Style.Success;
                    toast.title = "Successfully set as paid 🎉";
                  } catch (error) {
                    toast.style = Toast.Style.Failure;
                    toast.title = "Failed to set as paid 😥";
                    toast.message = error instanceof Error ? error.message : undefined;
                  }
                }}
              />
            ) : null}
            {/* <Action
              title="Print Invoice"
              icon={Icon.Print}
              shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
              onAction={async () => {
                await confirmAlert({
                  title: "Print Invoice",
                  message: "Are you sure you want to print this invoice?",
                  icon: {
                    source: Icon.Print,
                    tintColor: Color.PrimaryText,
                  },
                  primaryAction: {
                    title: "Print",
                    onAction: async () => {
                      const toast = await showToast({ style: Toast.Style.Animated, title: "Printing invoice" });
                      try {
                        const res = await mutateInvoices(ApiInvoice.print(invoice.id));

                        toast.style = Toast.Style.Success;
                        toast.title = "Successfully printed invoice 🎉";
                      } catch (error) {
                        toast.style = Toast.Style.Failure;
                        toast.title = "Failed to print invoice 😥";
                        toast.message = error instanceof Error ? error.message : undefined;
                      }
                    },
                  },
                });
              }}
            /> */}
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action.CopyToClipboard
              title="Copy Invoice Number"
              content={invoice?.number ?? "No Invoice Number"}
              shortcut={{ modifiers: ["cmd"], key: "." }}
            />
            <Action.CopyToClipboard
              title="Copy Invoice ID"
              content={invoice?.id ?? "No Invoice ID"}
              shortcut={{ modifiers: ["cmd", "shift"], key: "." }}
            />
            <Action.CopyToClipboard
              title="Copy Invoice Gross Price"
              content={invoice?.gross_price ?? "No Invoice Gross Price"}
              shortcut={{ modifiers: ["opt", "shift"], key: "." }}
            />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action
              title="Create Invoice"
              icon={Icon.NewDocument}
              shortcut={{ modifiers: ["cmd"], key: "n" }}
              onAction={async () => {
                await launchCommand({ name: "create_invoice", type: LaunchType.UserInitiated });
              }}
            />
            {!invoice?.paid_date ? (
              <Action
                title="Edit Invoice"
                icon={Icon.Pencil}
                shortcut={{ modifiers: ["cmd"], key: "e" }}
                onAction={() => {
                  push(<UpdateInvoice invoice={invoice} mutateInvoices={mutateInvoices} />);
                }}
              />
            ) : null}
            <Action
              title="Delete Invoice"
              icon={Icon.Trash}
              style={Action.Style.Destructive}
              shortcut={{ modifiers: ["ctrl"], key: "x" }}
              onAction={async () => {
                await confirmAlert({
                  title: "Delete Invoice",
                  message: "Are you sure you want to delete this invoice?",
                  icon: {
                    source: Icon.Trash,
                    tintColor: Color.Red,
                  },
                  primaryAction: {
                    title: "Delete",
                    style: Alert.ActionStyle.Destructive,
                    onAction: async () => {
                      const toast = await showToast({ style: Toast.Style.Animated, title: "Deleting invoice" });
                      try {
                        await mutateInvoices(ApiInvoice.delete(invoice.id));

                        toast.style = Toast.Style.Success;
                        toast.title = "Successfully deleted invoice 🎉";
                      } catch (error) {
                        toast.style = Toast.Style.Failure;
                        toast.title = "Failed to delete invoice 😥";
                        toast.message = error instanceof Error ? error.message : undefined;
                      }
                    },
                  },
                });
              }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
