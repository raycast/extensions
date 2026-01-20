import React, { useState, useEffect } from "react";
import { useSiteConfigs, chargebeeRequest } from "./useChargebee";
import {
  ChargebeeInvoice,
  ChargebeeCustomer,
  InvoiceWithMeta,
  SiteConfig,
} from "../types/chargebee";

interface InvoiceListResponse {
  list: Array<{
    invoice: ChargebeeInvoice;
  }>;
}

interface CustomerResponse {
  customer: ChargebeeCustomer;
}

async function searchInvoicesForSite(
  siteConfig: SiteConfig,
  invoiceNumber: string
): Promise<InvoiceWithMeta[]> {
  if (!invoiceNumber) return [];

  try {
    // Search by invoice ID (which is the invoice number in Chargebee)
    const response = await chargebeeRequest<InvoiceListResponse>(
      siteConfig,
      "/invoices",
      {
        "id[is]": invoiceNumber,
        limit: "10",
      }
    );

    const invoices = response.list.map((item) => item.invoice);

    // Fetch customer name for each invoice
    const invoicesWithMeta: InvoiceWithMeta[] = await Promise.all(
      invoices.map(async (invoice) => {
        let customerName = invoice.billing_address?.company ||
          [invoice.billing_address?.first_name, invoice.billing_address?.last_name]
            .filter(Boolean)
            .join(" ") ||
          undefined;

        // If no billing address, fetch customer
        if (!customerName) {
          try {
            const customerResponse = await chargebeeRequest<CustomerResponse>(
              siteConfig,
              `/customers/${invoice.customer_id}`
            );
            const customer = customerResponse.customer;
            customerName = customer.company ||
              [customer.first_name, customer.last_name].filter(Boolean).join(" ");
          } catch {
            customerName = invoice.customer_id;
          }
        }

        return {
          ...invoice,
          site: siteConfig.name,
          siteId: siteConfig.site,
          customerName,
        };
      })
    );

    return invoicesWithMeta;
  } catch (error) {
    console.error(`Error searching invoices for ${siteConfig.name}:`, error);
    return [];
  }
}

export function useInvoices(invoiceNumber: string) {
  const siteConfigs = useSiteConfigs();
  const [invoices, setInvoices] = useState<InvoiceWithMeta[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [lastSearch, setLastSearch] = useState("");

  // Track if we should be loading (search changed and is valid)
  const shouldBeLoading = invoiceNumber.length > 0 && invoiceNumber !== lastSearch;

  useEffect(() => {
    if (!invoiceNumber) {
      setInvoices([]);
      setLastSearch("");
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setLastSearch(invoiceNumber);

    // Search both sites in parallel
    Promise.all(siteConfigs.map((config) => searchInvoicesForSite(config, invoiceNumber)))
      .then((results) => {
        const merged = results.flat();
        // Sort by date (newest first)
        merged.sort((a, b) => b.date - a.date);
        setInvoices(merged);
      })
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, [invoiceNumber]);

  return { invoices, isLoading: isLoading || shouldBeLoading };
}
