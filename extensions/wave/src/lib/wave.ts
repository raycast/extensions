import { getAccessToken, useFetch } from "@raycast/utils";
import { Business, Currency, Customer, Edges, Invoice, Result } from "./types";
import { API_URL } from "./config";
import { QUERIES } from "./gql/queries";
import { MUTATIONS } from "./gql/mutations";

export const common = () => {
  const { token } = getAccessToken();
  return {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  };
};
export const useGetBusinesses = () =>
  useFetch(API_URL, {
    ...common(),
    body: JSON.stringify({
      query: QUERIES.getBusinesses,
    }),
    mapResult(result: Result<{ businesses: Edges<Business> }>) {
      if ("errors" in result) throw new Error(result.errors[0].message);
      return {
        data: result.data.businesses.edges.map((edge) => edge.node),
      };
    },
    initialData: [],
  });
export const useGetBusinessInvoices = (businessId: string) =>
  useFetch(API_URL, {
    ...common(),
    body: JSON.stringify({
      query: QUERIES.getBusinessInvoices,
      variables: {
        businessId,
      },
    }),
    mapResult(result: Result<{ business: { invoices: Edges<Invoice> } }>) {
      if ("errors" in result) throw new Error(result.errors[0].message);
      return {
        data: result.data.business.invoices.edges.map((edge) => edge.node),
      };
    },
    initialData: [],
  });

export const useGetBusinessCustomers = (businessId: string) =>
  useFetch(API_URL, {
    ...common(),
    body: JSON.stringify({
      query: QUERIES.getBusinessCustomers,
      variables: {
        businessId,
      },
    }),
    mapResult(result: Result<{ business: { customers: Edges<Customer> } }>) {
      if ("errors" in result) throw new Error(result.errors[0].message);
      return {
        data: result.data.business.customers.edges.map((edge) => edge.node),
      };
    },
    initialData: [],
  });

export const useGetBusinessProductsAndServices = (businessId: string) =>
  useFetch(API_URL, {
    ...common(),
    body: JSON.stringify({
      query: QUERIES.getProducts,
      variables: {
        businessId,
      },
    }),
    mapResult(
      result: Result<{
        business: {
          currency: Currency;
          products: Edges<{ id: string; name: string; description: string; unitPrice: string }>;
        };
      }>,
    ) {
      if ("errors" in result) throw new Error(result.errors[0].message);
      return {
        data: result.data.business.products.edges.map((edge) => ({
          ...edge.node,
          price: result.data.business.currency.symbol + edge.node.unitPrice,
        })),
      };
    },
    initialData: [],
  });

export const useGetCurrencies = () =>
  useFetch(API_URL, {
    ...common(),
    body: JSON.stringify({
      query: QUERIES.getCurrencies,
    }),
    mapResult(result: Result<{ currencies: Currency[] }>) {
      if ("errors" in result) throw new Error(result.errors[0].message);
      return {
        data: result.data.currencies,
      };
    },
    initialData: [],
  });

export const useGetCountries = () =>
  useFetch(API_URL, {
    ...common(),
    body: JSON.stringify({
      query: QUERIES.getCountries,
    }),
    mapResult(result: Result<{ countries: Array<{ code: string; name: string }> }>) {
      if ("errors" in result) throw new Error(result.errors[0].message);
      return {
        data: result.data.countries,
      };
    },
    initialData: [],
  });

export const deleteCustomer = async (id: string) => {
  const response = await fetch(API_URL, {
    ...common(),
    body: JSON.stringify({
      query: MUTATIONS.deleteCustomer,
      variables: {
        input: {
          id,
        },
      },
    }),
  });
  const result = (await response.json()) as Result<{ customerDelete: { didSucceed: boolean } }>;
  if ("errors" in result) throw new Error(result.errors[0].message);
  if (!result.data.customerDelete.didSucceed) throw new Error("Unknown Error");
};

export const useGetValidIncomeAccounts = (
  businessId: string,
  subtypes: Array<"INCOME" | "DISCOUNTS" | "OTHER_INCOME">,
) =>
  useFetch(API_URL, {
    ...common(),
    body: JSON.stringify({
      query: QUERIES.getValidIncomeAccounts,
      variables: {
        businessId,
        subtypes,
      },
    }),
    mapResult(
      result: Result<{
        business: {
          id: string;
          accounts: Edges<{
            id: string;
            name: string;
            subtype: { name: string; value: "INCOME" | "DISCOUNTS" | "OTHER_INCOME" };
          }>;
        };
      }>,
    ) {
      if ("errors" in result) throw new Error(result.errors[0].message);
      return {
        data: result.data.business.accounts.edges.map((edge) => edge.node),
      };
    },
    initialData: [],
  });
