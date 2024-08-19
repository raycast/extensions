import { useFetch } from "@raycast/utils";
import { Business, Invoice } from "./types";
import { API_URL } from "./config";

type Result<T> =
  | {
      errors: Array<{
        extensions: {
          id: string;
          code: string;
        };
        message: string;
        locations: Array<{
          line: number;
          column: number;
        }>;
        path: string[];
      }>;
      data?: null | T;
    }
  | {
      data: T;
    };

type Edges<T> = {
  edges: Array<{
    node: T;
  }>;
};

export const useGetBusinesses = (token?: string) =>
  useFetch(API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      query: `query {
  businesses {
    edges {
      node {
        id
        name
        isPersonal
        modifiedAt
        currency {
            code
        }
      }
    }
  }
}
`,
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
      query: `query($businessId: ID!) {
  business(id: $businessId) {
    id
    invoices {
      edges {
        node {
          id
          createdAt
          modifiedAt
          pdfUrl
          viewUrl
          status
          title
          subhead
          invoiceNumber
          invoiceDate
          customer {
            name
          }
          dueDate
          amountDue {
            value
            currency {
              symbol
            }
          }
          amountPaid {
            value
            currency {
              symbol
            }
          }
          taxTotal {
            value
            currency {
              symbol
            }
          }
          total {
            value
            currency {
              symbol
            }
          }
          itemTitle
          unitTitle
          priceTitle
          amountTitle
          hideName
          hideDescription
          hideUnit
          hidePrice
          hideAmount
          items {
            product {
              id
              name
            }
            description
            quantity
            price
            subtotal {
              value
              currency {
                symbol
              }
            }
            total {
              value
              currency {
                symbol
              }
            }
          }
        }
      }
    }
  }
}
`,
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
