import { Detail, Icon } from "@raycast/api";
import { MutatePromise } from "@raycast/utils";

import { ActionsInvoice } from "@/components/invoices/ActionsInvoice";
import { InvoiceObject } from "@/types/invoice";
import { ApiPaginatedResponse } from "@/types/utils";
import { formatPrice } from "@/utils/formatters";

type DetailsInvoiceProps = {
  invoice: InvoiceObject;
  mutateInvoices: MutatePromise<ApiPaginatedResponse<InvoiceObject[]> | undefined>;
};

export function DetailsInvoice({ invoice, mutateInvoices }: DetailsInvoiceProps) {
  let markdown = `# Invoice ${invoice?.number}

## Client
${invoice?.client_company_name || `${invoice?.client_first_name} ${invoice?.client_last_name}`}`;

  if (invoice?.client_street && invoice?.client_street_number && invoice?.client_post_code && invoice?.client_city) {
    markdown += `\n\n${invoice.client_street} ${invoice.client_street_number}${
      invoice?.client_flat_number ? `/${invoice?.client_flat_number}` : ""
    }\n\n${invoice.client_post_code} ${invoice.client_city}`;
  }

  if (invoice?.client_tax_code) {
    markdown += `\n\nNIP: **${invoice.client_tax_code}**`;
  }

  markdown += `\n\n## Items`;

  if (invoice?.services) {
    invoice.services.forEach((service) => {
      markdown += `\n\n- ${service.name}:\n`;

      if (service.net_price) {
        markdown += `  - Net Price: ${formatPrice(service.net_price)}\n`;
      }

      if (service.tax_price) {
        markdown += `  - Vat Price: ${formatPrice(service.tax_price)}\n`;
      }

      if (service.gross_price) {
        markdown += `  - Gross Price: ${formatPrice(service.gross_price)}\n`;
      }
    });

    markdown += `\n\n## Summary`;

    if (invoice?.net_price) {
      markdown += `\n\n- Net Price: ${formatPrice(invoice.net_price)}`;
    }

    if (invoice?.tax_price) {
      markdown += `\n\n- Vat Price: ${formatPrice(invoice.tax_price)}`;
    }

    if (invoice?.gross_price) {
      markdown += `\n\n- Gross Price: ${formatPrice(invoice.gross_price)}`;
    }
  }

  return (
    <Detail
      markdown={markdown}
      navigationTitle={invoice?.number ?? "No Invoice Number"}
      actions={<ActionsInvoice invoice={invoice} mutateInvoices={mutateInvoices} />}
      metadata={
        <Detail.Metadata>
          {invoice?.invoice_date ? (
            <Detail.Metadata.Label title="Invoice Date" icon={Icon.Calendar} text={invoice.invoice_date} />
          ) : null}

          {invoice?.sale_date ? (
            <Detail.Metadata.Label title="Sale Date" icon={Icon.Calendar} text={invoice.sale_date} />
          ) : null}

          {invoice?.payment_date ? (
            <Detail.Metadata.Label title="Payment Date" icon={Icon.Calendar} text={invoice.payment_date} />
          ) : null}

          <Detail.Metadata.Separator />

          {invoice?.bank_name ? (
            <Detail.Metadata.TagList title="Bank Name">
              <Detail.Metadata.TagList.Item text={invoice.bank_name} />
            </Detail.Metadata.TagList>
          ) : null}

          {invoice?.bank_account ? (
            <Detail.Metadata.TagList title="Bank Account">
              <Detail.Metadata.TagList.Item text={invoice.bank_account} />
            </Detail.Metadata.TagList>
          ) : null}

          {invoice?.currency ? (
            <Detail.Metadata.TagList title="Currency">
              <Detail.Metadata.TagList.Item text={invoice.currency} />
            </Detail.Metadata.TagList>
          ) : null}

          <Detail.Metadata.Separator />

          {invoice?.seller_signature ? (
            <Detail.Metadata.TagList title="Seller Signature">
              <Detail.Metadata.TagList.Item text={invoice.seller_signature} />
            </Detail.Metadata.TagList>
          ) : null}
        </Detail.Metadata>
      }
    />
  );
}
