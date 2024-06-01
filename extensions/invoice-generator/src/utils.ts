import { getPreferenceValues } from "@raycast/api";
import { InvoiceFormValues } from "./types";

export const preferences = getPreferenceValues();
export const {
  address,
  defaultIncludeAddress,
  defaultIncludeTax,
  defaultCurrency,
  includeAmountPaid,
  includePaymentTerms,
  includeShipping,
  invoiceDateFormat,
  invoiceNumberPrefix,
  logoUrl,
  name,
  termsAndConditions,
} = preferences;

export const initialInvoiceFormValues: InvoiceFormValues = {
  number: invoiceNumberPrefix,
  from: name,
  address: address,
  date: new Date(new Date().setHours(0, 0, 0, 1)),
  currency: defaultCurrency,
  terms: termsAndConditions,
};

export const initialInvoiceItemValues = [
  {
    name: "",
    quantity: "1",
    unit_cost: "0",
  },
];

export const initialCustomFields = [
  {
    name: "",
    value: "",
  },
];
