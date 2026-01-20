import React, { useState, useEffect } from "react";
import { useSiteConfigs, chargebeeRequest } from "./useChargebee";
import {
  ChargebeeCreditNote,
  ChargebeeCustomer,
  CreditNoteWithMeta,
  SiteConfig,
} from "../types/chargebee";

interface CreditNoteListResponse {
  list: Array<{
    credit_note: ChargebeeCreditNote;
  }>;
}

interface CustomerResponse {
  customer: ChargebeeCustomer;
}

async function searchCreditNotesForSite(
  siteConfig: SiteConfig,
  creditNoteId: string
): Promise<CreditNoteWithMeta[]> {
  if (!creditNoteId) return [];

  try {
    // Search by credit note ID (starts with the search term)
    const response = await chargebeeRequest<CreditNoteListResponse>(
      siteConfig,
      "/credit_notes",
      {
        "id[starts_with]": creditNoteId,
        limit: "10",
      }
    );

    const creditNotes = response.list.map((item) => item.credit_note);

    // Fetch customer name for each credit note
    const creditNotesWithMeta: CreditNoteWithMeta[] = await Promise.all(
      creditNotes.map(async (creditNote) => {
        let customerName: string | undefined;

        try {
          const customerResponse = await chargebeeRequest<CustomerResponse>(
            siteConfig,
            `/customers/${creditNote.customer_id}`
          );
          const customer = customerResponse.customer;
          customerName = customer.company ||
            [customer.first_name, customer.last_name].filter(Boolean).join(" ");
        } catch {
          customerName = creditNote.customer_id;
        }

        return {
          ...creditNote,
          site: siteConfig.name,
          siteId: siteConfig.site,
          customerName,
        };
      })
    );

    return creditNotesWithMeta;
  } catch (error) {
    console.error(`Error searching credit notes for ${siteConfig.name}:`, error);
    return [];
  }
}

export function useCreditNotes(creditNoteId: string) {
  const siteConfigs = useSiteConfigs();
  const [creditNotes, setCreditNotes] = useState<CreditNoteWithMeta[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [lastSearch, setLastSearch] = useState("");

  // Track if we should be loading (search changed and is valid)
  const shouldBeLoading = creditNoteId.length > 0 && creditNoteId !== lastSearch;

  useEffect(() => {
    if (!creditNoteId) {
      setCreditNotes([]);
      setLastSearch("");
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setLastSearch(creditNoteId);

    // Search both sites in parallel
    Promise.all(siteConfigs.map((config) => searchCreditNotesForSite(config, creditNoteId)))
      .then((results) => {
        const merged = results.flat();
        // Sort by date (newest first)
        merged.sort((a, b) => b.date - a.date);
        setCreditNotes(merged);
      })
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, [creditNoteId]);

  return { creditNotes, isLoading: isLoading || shouldBeLoading };
}
