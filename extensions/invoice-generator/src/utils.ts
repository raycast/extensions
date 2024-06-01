import { getPreferenceValues } from "@raycast/api";
import { InvoiceFormValues } from "./types";

export const preferences = getPreferenceValues();
export const { name, address, logoUrl, includeShipping } = preferences;

export const initialInvoiceFormValues: InvoiceFormValues = {
  from: name,
  address: address,
  date: new Date(new Date().setHours(0, 0, 0, 1)),
};

export const initialInvoiceItemValues = [
  {
    name: "",
    quantity: "1",
    unit_cost: "0",
  },
];
