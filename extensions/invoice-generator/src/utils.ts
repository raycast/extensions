import { getPreferenceValues } from "@raycast/api";
import { InvoiceFormValues } from "./types";

export const preferences = getPreferenceValues();
export const { name, address, logoUrl, includeShipping, termsAndConditions, includePaymentTerms } = preferences;

export const initialInvoiceFormValues: InvoiceFormValues = {
  from: name,
  address: address,
  date: new Date(new Date().setHours(0, 0, 0, 1)),
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
