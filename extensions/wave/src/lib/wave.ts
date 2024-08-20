import { useFetch } from "@raycast/utils";
import { Business, Currency, Customer, Edges, Invoice, Result } from "./types";
import { API_URL } from "./config";
import { QUERIES } from "./gql/queries";

export const useGetBusinesses = (token?: string) =>
  useFetch(API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      query: QUERIES.getBusinesses,
    }),
    execute: Boolean(token),
    mapResult(result: Result<{ businesses: Edges<Business> }>) {
      if ("errors" in result) throw new Error(result.errors[0].message);
      return {
        data: result.data.businesses.edges.map((edge) => edge.node),
      };
    },
    initialData: [],
  });
export const useGetBusinessInvoices = (businessId: string, token?: string) =>
  useFetch(API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      query: QUERIES.getBusinessInvoices,
      variables: {
        businessId,
      },
    }),
    execute: Boolean(token),
    mapResult(result: Result<{ business: { invoices: Edges<Invoice> } }>) {
      if ("errors" in result) throw new Error(result.errors[0].message);
      return {
        data: result.data.business.invoices.edges.map((edge) => edge.node),
      };
    },
    initialData: [],
  });

export const useGetBusinessCustomers = (businessId: string, token?: string) =>
  useFetch(API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      query: QUERIES.getBusinessCustomers,
      variables: {
        businessId,
      },
    }),
    execute: Boolean(token),
    mapResult(result: Result<{ business: { customers: Edges<Customer> } }>) {
      if ("errors" in result) throw new Error(result.errors[0].message);
      return {
        data: result.data.business.customers.edges.map((edge) => edge.node),
      };
    },
    initialData: [],
  });

export const useGetBusinessProductsAndServices = (businessId: string, token?: string) =>
  useFetch(API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      query: QUERIES.getProducts,
      variables: {
        businessId,
      },
    }),
    execute: Boolean(token),
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
