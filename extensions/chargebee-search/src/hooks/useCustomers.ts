import { useState, useEffect } from "react";
import { useSiteConfigs, chargebeeRequest } from "./useChargebee";
import {
  ChargebeeCustomer,
  ChargebeeSubscription,
  ChargebeeInvoice,
  CustomerWithMeta,
  SiteConfig,
} from "../types/chargebee";

interface CustomerListResponse {
  list: Array<{
    customer: ChargebeeCustomer;
  }>;
}

interface SubscriptionListResponse {
  list: Array<{
    subscription: ChargebeeSubscription;
  }>;
}

interface InvoiceListResponse {
  list: Array<{
    invoice: ChargebeeInvoice;
  }>;
}

async function searchCustomersForSite(
  siteConfig: SiteConfig,
  search: string,
): Promise<CustomerWithMeta[]> {
  if (!search || search.length < 2) return [];

  try {
    // Hybrid approach:
    // 1. API search with starts_with (for prefix matches)
    // 2. Fetch recent customers and filter locally (for substring/contains matches)
    const [companyResults, firstNameResults, emailResults, recentCustomers] =
      await Promise.all([
        chargebeeRequest<CustomerListResponse>(siteConfig, "/customers", {
          "company[starts_with]": search,
          limit: "20",
        }).catch((e) => {
          console.error(`[${siteConfig.name}] company search error:`, e);
          return { list: [] };
        }),
        chargebeeRequest<CustomerListResponse>(siteConfig, "/customers", {
          "first_name[starts_with]": search,
          limit: "20",
        }).catch((e) => {
          console.error(`[${siteConfig.name}] first_name search error:`, e);
          return { list: [] };
        }),
        chargebeeRequest<CustomerListResponse>(siteConfig, "/customers", {
          "email[starts_with]": search,
          limit: "20",
        }).catch((e) => {
          console.error(`[${siteConfig.name}] email search error:`, e);
          return { list: [] };
        }),
        // Fetch recent customers for local "contains" filtering
        chargebeeRequest<CustomerListResponse>(siteConfig, "/customers", {
          limit: "100",
          "sort_by[desc]": "created_at",
        }).catch((e) => {
          console.error(`[${siteConfig.name}] recent customers error:`, e);
          return { list: [] };
        }),
      ]);

    // Filter recent customers locally by "contains" (case-insensitive)
    const searchLower = search.toLowerCase();
    const localMatches = recentCustomers.list
      .map((item) => item.customer)
      .filter((customer) => {
        const company = customer.company?.toLowerCase() || "";
        const fullName =
          `${customer.first_name || ""} ${customer.last_name || ""}`.toLowerCase();
        const email = customer.email?.toLowerCase() || "";
        return (
          company.includes(searchLower) ||
          fullName.includes(searchLower) ||
          email.includes(searchLower)
        );
      });

    // Merge API results + local matches, deduplicate by customer ID
    const allCustomers = [
      ...companyResults.list.map((item) => item.customer),
      ...firstNameResults.list.map((item) => item.customer),
      ...emailResults.list.map((item) => item.customer),
      ...localMatches,
    ];

    const customers = Array.from(
      new Map(allCustomers.map((c) => [c.id, c])).values(),
    );

    // Fetch subscriptions and last invoice for each customer
    const customersWithMeta: CustomerWithMeta[] = await Promise.all(
      customers.map(async (customer) => {
        try {
          const [subResponse, invoiceResponse] = await Promise.all([
            chargebeeRequest<SubscriptionListResponse>(
              siteConfig,
              "/subscriptions",
              {
                "customer_id[is]": customer.id,
                limit: "1",
                "sort_by[desc]": "created_at",
              },
            ),
            chargebeeRequest<InvoiceListResponse>(siteConfig, "/invoices", {
              "customer_id[is]": customer.id,
              limit: "1",
              "sort_by[desc]": "date",
            }),
          ]);

          const subscription = subResponse.list[0]?.subscription;
          const lastInvoiceId = invoiceResponse.list[0]?.invoice?.id;

          return {
            ...customer,
            site: siteConfig.name,
            siteId: siteConfig.site,
            subscription,
            lastInvoiceId,
          };
        } catch {
          return {
            ...customer,
            site: siteConfig.name,
            siteId: siteConfig.site,
          };
        }
      }),
    );

    return customersWithMeta;
  } catch (error) {
    console.error(`Error searching customers for ${siteConfig.name}:`, error);
    return [];
  }
}

export function useCustomers(search: string) {
  const siteConfigs = useSiteConfigs();
  const [customers, setCustomers] = useState<CustomerWithMeta[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [lastSearch, setLastSearch] = useState("");

  // Track if we should be loading (search changed and is valid)
  const shouldBeLoading = search.length >= 2 && search !== lastSearch;

  useEffect(() => {
    if (!search || search.length < 2) {
      setCustomers([]);
      setLastSearch("");
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setLastSearch(search);

    // Search both sites in parallel
    Promise.all(
      siteConfigs.map((config) => searchCustomersForSite(config, search)),
    )
      .then((results) => {
        const merged = results.flat();
        // Sort by renewal date: furthest in future first, no renewal at bottom
        merged.sort((a, b) => {
          const aRenewal = a.subscription?.current_term_end;
          const bRenewal = b.subscription?.current_term_end;

          // Both have no renewal - sort by company name
          if (!aRenewal && !bRenewal) {
            return (a.company || "").localeCompare(b.company || "");
          }
          // Only a has no renewal - a goes to bottom
          if (!aRenewal) return 1;
          // Only b has no renewal - b goes to bottom
          if (!bRenewal) return -1;
          // Both have renewal - furthest in future first (descending)
          return bRenewal - aRenewal;
        });
        setCustomers(merged);
      })
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, [search]);

  return { customers, isLoading: isLoading || shouldBeLoading };
}
