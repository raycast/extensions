import { NODES } from "./nodes";
import { OBJECTS } from "./objects";

export const queryGetCustomerOutstandingInvoicesCustomerStatement = `
    query($businessId: ID!, $customerId: ID!) {
        business(id: $businessId) {
            invoices(customerId: $customerId, status: OVERDUE, sort: [INVOICE_DATE_ASC]) {
                edges {
                    node {
                        ${NODES.Invoice}
                    }
                }
            }
        }
    }
`;

export const QUERIES = {
  getBusinesses: `
    query {
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
  getBusinessInvoices: `
    query($businessId: ID!) {
        business(id: $businessId) {
            invoices {
                edges {
                    node {
                        ${NODES.Invoice}
                    }
                }
            }
        }
    }
    `,
  getBusinessCustomers: `
    query($businessId: ID!) {
        business(id: $businessId) {
            id
            customers {
            edges {
                node {
                    ${NODES.Customer}
                }
            }
        }
    }
}
`,
  getProducts: `
    query($businessId: ID!) {
        business(id: $businessId) {
            currency {
                ${OBJECTS.Currency}
            }
            products {
                edges {
                    node {
                        ${NODES.Product}
                    }
                }
            }
        }
    }`,
};
