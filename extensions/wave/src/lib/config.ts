import { getPreferenceValues } from "@raycast/api";

export const API_URL = "https://gql.waveapps.com/graphql/public";
export const ACCESS_TOKEN = getPreferenceValues<Preferences>().access_token;

export const INVOICE_STATUSES = {
  DRAFT: "The invoice is still a draft.",
  OVERDUE: "The invoice is overdue.",
  OVERPAID: "The invoice was overpaid.",
  PAID: "The invoice was paid.",
  PARTIAL: "The invoice was partially paid.",
  SAVED: "The invoice was saved.",
  SENT: "The invoice was sent.",
  UNPAID: "The invoice is unpaid.",
  VIEWED: "The invoice was viewed.",
};

export const HELP_LINKS = {
  AddCustomer: "https://support.waveapps.com/hc/en-us/articles/208621786-Add-a-customer",
  CreateInvoice: "https://support.waveapps.com/hc/en-us/articles/208621656-Create-an-invoice",
  AddProductOrService: "https://support.waveapps.com/hc/en-us/articles/208621766-Add-a-product-or-service",
};
