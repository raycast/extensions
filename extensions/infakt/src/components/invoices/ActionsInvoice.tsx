import { format } from "date-fns";

import {
  Action,
  ActionPanel,
  Alert,
  Color,
  Icon,
  LaunchType,
  Toast,
  confirmAlert,
  launchCommand,
  showToast,
} from "@raycast/api";
import { MutatePromise } from "@raycast/utils";

import { ApiInvoice } from "@/api/invoice";
import { DetailsInvoice } from "@/components/invoices/DetailsInvoice";
import { MailInvoice } from "@/components/invoices/MailInvoice";
import { UpdateInvoice } from "@/components/invoices/UpdateInvoice";
import { InvoiceObject } from "@/types/invoice";
import { ApiPaginatedResponse } from "@/types/utils";

type ActionsInvoiceProps = {
  invoice: InvoiceObject;
  mutateInvoices: MutatePromise<ApiPaginatedResponse<InvoiceObject[]> | undefined>;
};

export function ActionsInvoice({ invoice, mutateInvoices }: ActionsInvoiceProps) {
  return (
    <ActionPanel>
      <ActionPanel.Section>
        <Action.Push
          title="Show Details"
          icon={Icon.AppWindowSidebarRight}
          target={<DetailsInvoice invoice={invoice} mutateInvoices={mutateInvoices} />}
        />
      </ActionPanel.Section>
      <ActionPanel.Section>
        <Action.Push
          title="Send via Mail"
          icon={Icon.Envelope}
          shortcut={{ modifiers: ["cmd", "shift"], key: "s" }}
          target={<MailInvoice invoice={invoice} mutateInvoices={mutateInvoices} />}
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
                  }),
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
          <Action.Push
            title="Edit Invoice"
            icon={Icon.Pencil}
            shortcut={{ modifiers: ["cmd"], key: "e" }}
            target={<UpdateInvoice invoice={invoice} mutateInvoices={mutateInvoices} />}
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
  );
}
