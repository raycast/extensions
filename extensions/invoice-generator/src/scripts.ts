import { showInFinder, open, showToast, Toast } from "@raycast/api";
import moment from "moment";
import axios, { AxiosError } from "axios";
import { writeFile } from "fs/promises";
import { homedir } from "os";
import { join } from "path";

import { logoUrl } from "./utils";
import { InvoiceFormValues, InvoiceFormStaticValues, InvoiceRequestContent, InvoiceRequestItemValues } from "./types";

function extractDynamicItems(values: InvoiceFormValues, includeAddress: boolean): InvoiceRequestContent {
  const items: Partial<InvoiceRequestItemValues>[] = [];
  const staticValues: Partial<InvoiceFormStaticValues> = {};

  for (const key in values) {
    const match = key.match(/^(name|quantity|unit_cost)-(\d+)$/);

    if (match) {
      const [, itemType, indexStr] = match;
      const index = parseInt(indexStr, 10);

      items[index] = items[index] || {};
      if (itemType === "name") {
        items[index][itemType] = values[key] as string; // Ensuring string type
      } else if (itemType === "quantity" || itemType === "unit_cost") {
        // Convert to number while extracting
        items[index][itemType] = parseFloat(values[key] as string);
      }

      delete values[key]; // Remove the dynamic item from the original values object
    } else {
      if (values[key] instanceof Date) {
        staticValues[key as keyof InvoiceFormStaticValues] = moment(values[key] as Date).format("MMMM D, YYYY");
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
  const invoiceRequestContent: InvoiceRequestContent = {
    ...(logoUrl && { logo: logoUrl }),
    number: number as string,
    from: from as string,
    to: to as string,
    date: dateStr,
    currency: staticValues.currency as string,
    items: items.filter((item) => item.name && item.quantity && item.unit_cost) as InvoiceRequestItemValues[],
    ...(taxNum !== undefined && { tax: taxNum }),
    ...(staticValues.taxType && { fields: { tax: staticValues.taxType === "%" ? "%" : true } }),
    ...(shippingNum !== undefined && { shipping: shippingNum }),
    ...(amountPaid !== undefined && { amount_paid: amountPaid }),
    ...(staticValues.notes && { notes: staticValues.notes }),
  };

  return invoiceRequestContent;
}

async function requestInvoice(content: InvoiceRequestContent, toast: Toast) {
  try {
    const response = await (
      await axios.post("https://invoice-generator.com/", content, {
        headers: {
          "Content-Type": "application/json",
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
      console.error("axios error:", axiosError.response?.data);
      toast.message = axiosError.message;
    } else {
      console.error("error:", error);
      toast.message = (error as Error).message;
    }
  }
}

export async function generateInvoice(values: InvoiceFormValues, includeAddress: boolean) {
  const toast = await showToast(Toast.Style.Animated, "Generating invoice...");

  let content: InvoiceRequestContent;
  try {
    content = extractDynamicItems(values, includeAddress);
  } catch (error: unknown) {
    toast.style = Toast.Style.Failure;
    toast.title = "Failed to generate invoice";
    toast.message = (error as Error).message;
    return;
  }

  await requestInvoice(content, toast);
}
