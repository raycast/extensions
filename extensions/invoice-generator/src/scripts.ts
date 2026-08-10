import { showInFinder, open, showToast, Toast } from "@raycast/api";
import moment from "moment";
import axios, { AxiosError } from "axios";
import { writeFile } from "fs/promises";
import { homedir } from "os";
import { join } from "path";

import { apiKey, invoiceDateFormat, logoUrl } from "./utils";
import {
  InvoiceFormValues,
  InvoiceFormStaticValues,
  InvoiceRequestContent,
  InvoiceRequestItemValues,
  InvoiceRequestWithLocale,
} from "./types";

function extractDynamicItems(values: InvoiceFormValues, includeAddress: boolean): InvoiceRequestWithLocale {
  const items: Partial<InvoiceRequestItemValues>[] = [];
  const customFields: Record<number, { name?: string; value?: string }> = {};
  const staticValues: Partial<InvoiceFormStaticValues> = {};

  for (const key in values) {
    const itemMatch = key.match(/^(name|quantity|unit_cost)-(\d+)$/);
    const customFieldMatch = key.match(/^cf-(name|value)-(\d+)$/);

    if (itemMatch) {
      const [, itemType, indexStr] = itemMatch;
      const index = parseInt(indexStr, 10);

      items[index] = items[index] || {};
      if (itemType === "name") {
        items[index][itemType] = values[key] as string;
      } else if (itemType === "quantity" || itemType === "unit_cost") {
        // Convert to number while extracting
        items[index][itemType] = parseFloat(values[key] as string);
      }

      delete values[key]; // Remove the dynamic item from the original values object
    } else if (customFieldMatch) {
      const [, fieldType, indexStr] = customFieldMatch;
      const index = parseInt(indexStr, 10);

      if ((fieldType === "name" || fieldType === "value") && values[key]) {
        customFields[index] = customFields[index] || {};
        customFields[index][fieldType] = values[key] as string;
      }

      delete values[key]; // Clean up processed custom field
    } else {
      if (values[key] instanceof Date) {
        staticValues[key as keyof InvoiceFormStaticValues] = moment(values[key] as Date).format(invoiceDateFormat);
      } else if (values[key] !== null && values[key] !== undefined) {
        if (key === "from" && includeAddress && values["address"]) {
          staticValues["from"] = `${values["from"]}\n${values["address"].split(",").join("\n")}`;
          continue;
        }

        staticValues[key as keyof InvoiceFormStaticValues] = values[key] as string | undefined;
      }
    }
  }

  const { number, from, to, date, tax, shipping, amount_paid } = staticValues;

  // Check required fields and ensure they are present and of the correct type
  if (!number || !from || !to || !date) {
    throw new Error("Missing required fields in InvoiceStaticValues");
  }

  // Ensure date is a string and convert amount_paid properly
  const dateStr = date as unknown as string;
  const amountPaid = amount_paid ? parseFloat(amount_paid) : undefined;
  const taxNum = tax ? parseFloat(tax) : undefined;
  const shippingNum = shipping ? parseFloat(shipping) : undefined;

  // Construct the invoice request content dynamically
  const content: InvoiceRequestContent = {
    ...(logoUrl && { logo: logoUrl }),
    number: number as string,
    from: from as string,
    to: to as string,
    date: dateStr,
    currency: staticValues.currency as string,
    items: items.filter((item) => item.name && item.quantity && item.unit_cost) as InvoiceRequestItemValues[],
    custom_fields: Object.values(customFields),
    ...(taxNum !== undefined && { tax: taxNum }),
    ...(staticValues.taxType && { fields: { tax: staticValues.taxType === "%" ? "%" : true } }),
    ...(shippingNum !== undefined && { shipping: shippingNum }),
    ...(staticValues.ship_to && { ship_to: staticValues.ship_to }),
    ...(amountPaid !== undefined && { amount_paid: amountPaid }),
    ...(staticValues.notes && { notes: staticValues.notes }),
    ...(staticValues.terms && { terms: staticValues.terms }),
  };

  return { content, locale: staticValues.locale as string } as InvoiceRequestWithLocale;
}

async function requestInvoice(content: InvoiceRequestContent, locale: string, toast: Toast) {
  try {
    const response = await (
      await axios.post("https://invoice-generator.com/", content, {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "Accept-Language": locale,
        },
        responseType: "arraybuffer",
      })
    ).data;

    const path = join(homedir(), "Downloads", content.number + ".pdf");
    await writeFile(path, Buffer.from(response));

    toast.style = Toast.Style.Success;
    toast.title = "Invoice generated successfully";
    toast.message = "Invoice has been saved to Downloads folder";

    await showInFinder(path);
    open(path);
  } catch (error: unknown) {
    toast.style = Toast.Style.Failure;
    toast.title = "Failed to generate invoice";

    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError;
      const errorData = axiosError.response?.data;
      if (Buffer.isBuffer(errorData)) {
        const errorMessage = errorData.toString("utf8");
        console.error("axios error:", errorMessage);
        toast.message = JSON.parse(errorMessage).message;
      } else {
        toast.message = axiosError.message;
      }
    } else {
      console.error("error:", error);
      toast.message = (error as Error).message;
    }
  }
}

export async function generateInvoice(values: InvoiceFormValues, includeAddress: boolean) {
  const toast = await showToast(Toast.Style.Animated, "Generating invoice...");

  let requestContent: InvoiceRequestContent;
  let requestLocale: string;
  try {
    const { content, locale } = extractDynamicItems(values, includeAddress);
    requestContent = content;
    requestLocale = locale;
  } catch (error: unknown) {
    toast.style = Toast.Style.Failure;
    toast.title = "Failed to generate invoice";
    toast.message = (error as Error).message;
    return;
  }

  await requestInvoice(requestContent, requestLocale, toast);
}
