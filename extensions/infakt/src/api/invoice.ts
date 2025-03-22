import fetch from "node-fetch";

import { ApiBaseUrl, ApiHeaders, ApiUrls } from "@/api/helpers";
import {
  CreateInvoicePayload,
  InvoiceObject,
  SendViaMailPayload,
  SetAsPaidInvoicePayload,
  UpdateInvoicePayload,
} from "@/types/invoice";
import { ApiErrorResponse } from "@/types/utils";

export const ApiInvoice = {
  async create(values: CreateInvoicePayload) {
    const response = await fetch(ApiUrls.invoices, {
      method: "POST",
      headers: ApiHeaders,
      body: JSON.stringify(values),
    });

    if (response.ok) {
      return [(await response.json()) as InvoiceObject, null] as const;
    } else {
      return [null, ((await response.json()) as ApiErrorResponse).error] as const;
    }
  },
  update(invoiceId: number, values: UpdateInvoicePayload) {
    return fetch(`${ApiBaseUrl}/invoices/${invoiceId}.json`, {
      method: "PUT",
      headers: ApiHeaders,
      body: JSON.stringify(values),
    });
  },
  setAsPaid(invoiceId: number, values: SetAsPaidInvoicePayload) {
    return fetch(`${ApiBaseUrl}/invoices/${invoiceId}/paid.json`, {
      method: "POST",
      headers: ApiHeaders,
      body: JSON.stringify(values),
    });
  },
  sendMail(
    invoiceId: number,
    options: SendViaMailPayload = {
      print_type: "original",
    },
  ) {
    return fetch(`${ApiBaseUrl}/invoices/${invoiceId}/deliver_via_email.json`, {
      method: "POST",
      headers: ApiHeaders,
      body: JSON.stringify(options),
    });
  },
  print(invoiceId: number) {
    return fetch(`${ApiBaseUrl}/invoices/${invoiceId}/pdf.json?document_type=original&locale=pl`, {
      method: "GET",
      headers: ApiHeaders,
    });
  },
  delete(invoiceId: number) {
    return fetch(`${ApiBaseUrl}/invoices/${invoiceId}.json`, {
      method: "DELETE",
      headers: ApiHeaders,
    });
  },
};
