import { useState, useEffect } from "react";
import { useFetch } from "@raycast/utils";
import { useAuthHeaders } from "./use-auth-headers";

interface Company {
  id: string;
  name: string;
  employees: number;
  address: {
    addressStreet1: string | null;
    addressStreet2: string | null;
    addressCity: string | null;
    addressPostcode: string | null;
    addressState: string | null;
    addressCountry: string | null;
    addressLat: string | null;
    addressLng: string | null;
  };
  annualRecurringRevenue: {
    amountMicros: number;
    currencyCode: string;
  };
  people: [
    {
      name: {
        firstName: string;
        lastName: string;
      };
      emails: {
        primaryEmail: string;
      };
      jobTitle: string;
    },
  ];
  domainName: {
    primaryLinkLabel: string;
    primaryLinkUrl: string;
  };
  linkedinLink?: {
    primaryLinkLabel: string;
    primaryLinkUrl: string;
  };
  xLink?: {
    primaryLinkLabel: string;
    primaryLinkUrl: string;
  };
  idealCustomerProfile: boolean;
  accountOwnerId?: string;
}

interface CompanyResponse {
  data: Company;
}

export function useGetCompanyDetails(companyId: string) {
  const [company, setCompany] = useState<Company | null>(null);

  const { data, isLoading, error, revalidate } = useFetch<CompanyResponse>(
    `https://api.twenty.com/rest/companies/${companyId}`,
    {
      headers: useAuthHeaders(),
    },
  );

  useEffect(() => {
    if (data?.data) {
      setCompany(data.data);
    }
  }, [data]);

  return {
    company,
    isLoading,
    error,
    revalidate,
  };
}
